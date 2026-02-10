const BaseController = require('./BaseController');

class TeacherController extends BaseController {
    constructor() {
        super('content'); // Uses CONTENT_API_TOKEN as it interacts with UserTopics (Content)
    }

    async assignTopicToClass(req, res) {
        try {
            const { classId, topicId } = req.body;

            if (!classId || !topicId) {
                return res.status(400).json({ error: 'classId and topicId are required' });
            }

            console.log(`[TeacherController] Assigning topic ${topicId} to class ${classId}`);

            // 1. Fetch Class with Students
            const classResponse = await this.api.get(`/api/classrooms/${classId}`, {
                params: {
                    'populate[students][fields][0]': 'id',
                    'populate[students][fields][1]': 'documentId',
                }
            });

            const classroom = classResponse.data.data;

            if (!classroom) {
                return res.status(404).json({ error: 'Classroom not found' });
            }

            // 1.5 Update Classroom with Topic (Link)
            try {
                await this.api.put(`/api/classrooms/${classId}`, {
                    data: {
                        topics: {
                            connect: [topicId]
                        }
                    }
                });
            } catch (err) {
                console.error('[TeacherController] Failed to link topic to classroom:', err.message);
                // Continue with student assignment even if classroom link fails? Or fail?
                // Let's log and continue to ensure students get it.
            }

            const students = classroom.students; // These are Profile objects

            if (!students || students.length === 0) {
                return this.handleSuccess(res, { message: 'No students in classroom', count: 0 });
            }

            let updatedCount = 0;
            let createdCount = 0;
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD (or full ISO if DateTime)

            // Strapi expects ISO string for DateTime fields usually
            const todayISO = new Date().toISOString();

            // 2. Iterate and Upsert
            for (const student of students) {
                const profileId = student.id;
                const profileDocId = student.documentId;

                if (!profileDocId) {
                    console.error('[TeacherController] Missing documentId for student:', student.id);
                    continue;
                }

                console.log(`[TeacherController] Processing Student: ${profileDocId} (ID: ${profileId})`);

                // Check for existing UserTopic
                const findParams = {
                    'filters[topic][documentId][$eq]': topicId,
                    'filters[profile][documentId][$eq]': profileDocId,
                    'pagination[limit]': '1',
                };

                let existing = null;
                try {
                    const findResponse = await this.api.get('/api/user-topics', { params: findParams });
                    existing = findResponse.data.data && findResponse.data.data.length > 0 ? findResponse.data.data[0] : null;
                } catch (findErr) {
                    console.error('[TeacherController] Find Error:', findErr.message);
                    // If find fails, maybe safe to abort this student?
                    continue;
                }

                let userTopicDocId = null;

                try {
                    if (existing) {
                        // Update
                        console.log('[TeacherController] Updating UserTopic:', existing.documentId);
                        await this.api.put(`/api/user-topics/${existing.documentId}`, {
                            data: {
                                nextSession: todayISO,
                                teacherInstructions: req.body.teacherInstructions || '' // Update instructions
                            }
                        });
                        userTopicDocId = existing.documentId;
                        updatedCount++;
                    } else {
                        // Create
                        console.log('[TeacherController] Creating UserTopic for profile:', profileDocId);
                        const createResponse = await this.api.post('/api/user-topics', {
                            data: {
                                profile: profileDocId,
                                topic: topicId,
                                nextSession: todayISO,
                                memoryLocation: 'New', // Default to New
                                revisionsDone: 0,
                                timeRemaining: 0,
                                timeTotal: 0,
                                teacherInstructions: req.body.teacherInstructions || '' // Add instructions
                            }
                        });
                        userTopicDocId = createResponse.data.data.documentId;
                        createdCount++;
                    }

                    // 3. Ensure Session Exists for Today
                    if (userTopicDocId) {
                        const sessionParams = {
                            'filters[user_topic][documentId][$eq]': userTopicDocId,
                            'filters[scheduledFor][$eq]': todayISO,
                            'pagination[limit]': '1',
                        };
                        const sessionRes = await this.api.get('/api/study-sessions', { params: sessionParams });
                        const existingSession = sessionRes.data.data && sessionRes.data.data.length > 0;

                        if (!existingSession) {
                            console.log(`[TeacherController] Creating Session for UserTopic ${userTopicDocId}`);
                            await this.api.post('/api/study-sessions', {
                                data: {
                                    user_topic: userTopicDocId,
                                    scheduledFor: todayISO,
                                    stayTopicId: topicId, // Storing the Topic Document ID
                                    isPaused: false,
                                    timeAllotted: 0,
                                    timeTakenForActivity: 0,
                                    timeTakenForRevision: 0,
                                    difficultyLevel: 'Medium' // Default
                                }
                            });
                        }
                    }

                } catch (upsertErr) {
                    console.error('[TeacherController] Upsert/Session Error for student ' + profileDocId, upsertErr.response?.data || upsertErr.message);
                }
            }

            return this.handleSuccess(res, {
                message: 'Assignment complete',
                stats: {
                    totalStudents: students.length,
                    created: createdCount,
                    updated: updatedCount
                }
            });

        } catch (error) {
            console.error('[TeacherController] Error:', error.response?.data || error.message);
            return this.handleError(res, error);
        }
    }

    async getTopicStats(req, res) {
        try {
            const { classId, topicId } = req.query;

            if (!classId || !topicId) {
                return res.status(400).json({ error: 'classId and topicId are required' });
            }

            // 1. Fetch Class Students
            const classResponse = await this.api.get(`/api/classrooms/${classId}`, {
                params: {
                    'populate[students][fields][0]': 'documentId',
                }
            });

            const classroom = classResponse.data.data;
            if (!classroom || !classroom.students) {
                return this.handleSuccess(res, { stats: {} });
            }

            const studentDocIds = classroom.students.map(s => s.documentId);

            if (studentDocIds.length === 0) {
                return this.handleSuccess(res, { stats: {} });
            }

            // 2. Fetch UserTopics for these students and topic
            // We might need to iterate or use 'in' filter if supported.
            // Strapi filter 'in' supports array.
            const userTopicsParams = {
                'filters[topic][documentId][$eq]': topicId,
                'filters[profile][documentId][$in]': studentDocIds,
                'fields[0]': 'memoryLocation',
                'fields[1]': 'teacherInstructions',
                'pagination[limit]': '5000',
            };

            const utResponse = await this.api.get('/api/user-topics', { params: userTopicsParams });
            const userTopics = utResponse.data.data;

            // 3. Aggregate Stats
            const stats = {
                'New': 0,
                'Review': 0,
                'Short-term': 0,
                'Long-term': 0,
                'Transition': 0
            };

            userTopics.forEach(ut => {
                const loc = ut.memoryLocation || 'New';
                if (stats[loc] !== undefined) {
                    stats[loc]++;
                } else {
                    stats[loc] = (stats[loc] || 0) + 1;
                }
            });

            // Extract instructions from the first user topic (assuming all are same for a class assignment)
            const instructions = userTopics.length > 0 ? userTopics[0].teacherInstructions : '';

            return this.handleSuccess(res, { stats, totalStudents: studentDocIds.length, assignedCount: userTopics.length, teacherInstructions: instructions });

        } catch (error) {
            console.error('[TeacherController] Stats Error:', error.response?.data || error.message);
            return this.handleError(res, error);
        }
    }

    async updateTopicInstructions(req, res) {
        try {
            const { classId, topicId, teacherInstructions } = req.body;

            if (!classId || !topicId) {
                return res.status(400).json({ error: 'classId and topicId are required' });
            }

            console.log(`[TeacherController] Updating instructions for topic ${topicId} in class ${classId}`);

            // 1. Fetch Class Students
            const classResponse = await this.api.get(`/api/classrooms/${classId}`, {
                params: {
                    'populate[students][fields][0]': 'documentId',
                }
            });

            const classroom = classResponse.data.data;
            if (!classroom || !classroom.students || classroom.students.length === 0) {
                return this.handleSuccess(res, { message: 'No students found to update.', count: 0 });
            }

            const studentDocIds = classroom.students.map(s => s.documentId);

            // 2. Find UserTopics for these students/topic
            const findParams = {
                'filters[topic][documentId][$eq]': topicId,
                'filters[profile][documentId][$in]': studentDocIds,
                'pagination[limit]': '5000', // Update all
                'fields[0]': 'documentId'
            };

            const utResponse = await this.api.get('/api/user-topics', { params: findParams });
            const userTopics = utResponse.data.data;

            if (!userTopics || userTopics.length === 0) {
                return this.handleSuccess(res, { message: 'No assigned topics found to update.', count: 0 });
            }

            // 3. Update each UserTopic
            // Parallel execution for speed, but consider batching if many students
            let updatedCount = 0;
            const updatePromises = userTopics.map(ut => {
                return this.api.put(`/api/user-topics/${ut.documentId}`, {
                    data: {
                        teacherInstructions: teacherInstructions || ''
                    }
                }).then(() => {
                    updatedCount++;
                }).catch(err => {
                    console.error(`[TeacherController] Failed to update instructions for UT ${ut.documentId}:`, err.message);
                });
            });

            await Promise.all(updatePromises);

            return this.handleSuccess(res, {
                message: 'Instructions updated successfully',
                updatedCount
            });

        } catch (error) {
            console.error('[TeacherController] Update Instructions Error:', error.response?.data || error.message);
            return this.handleError(res, error);
        }
    }
}
module.exports = TeacherController;
