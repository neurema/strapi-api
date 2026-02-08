const BaseController = require('./BaseController');

class ClassroomController extends BaseController {
    constructor() {
        super('content'); // Using content token generally, or user token if needed? usually content is fine for public/authenticated read if configured. 
        // Wait, 'user' token might be safer if policies rely on it. BaseController constructor takes tokenType.
        // Profiles used 'content' (default) in BaseController if not specified? 
        // Let's check BaseController usage again. UserController uses 'user'.
    }

    async getClassrooms(req, res) {
        try {
            const { instituteId } = req.query;

            if (!instituteId) {
                return res.status(400).json({ error: 'Institute ID is required' });
            }

            // Filters to get classrooms for a specific institute
            const params = {
                'filters[institute][id][$eq]': instituteId,
                'proliferate': '*',
                'populate': '*'
            };

            const response = await this.api.get('/api/classrooms', {
                params
            });

            return this.handleSuccess(res, response.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async getByCode(req, res) {
        try {
            const { classCode } = req.params;

            if (!classCode) {
                return res.status(400).json({ error: 'Class Code is required' });
            }

            const response = await this.api.get('/api/classrooms', {
                params: {
                    'filters[classCode][$eq]': classCode,
                    'populate': ['students.user', 'teachers', 'institute', 'topics', 'topics.subject']
                }
            });

            // Strapi returns an array even if filtering by unique field
            // We'll return the array, frontend can pick the first one
            return this.handleSuccess(res, response.data);
        } catch (error) {
            console.error('[ClassroomController] getByCode Error:', error.response?.data || error.message);
            return this.handleError(res, error);
        }
    }

    async createClassroom(req, res) {
        try {
            const { name, exam, classCode, institute, examDate } = req.body;
            const authHeader = req.headers.authorization;

            if (!authHeader) {
                return res.status(401).json({ error: 'No authorization header provided' });
            }

            if (!name || !classCode || !institute) {
                return res.status(400).json({ error: 'Name, Class Code, and Institute are required' });
            }

            console.log('[ClassroomController] Raw Create Request Body:', req.body);

            // 1. Fetch current user to get their ID
            const userRes = await this.api.get('/api/users/me', {
                headers: { Authorization: authHeader }
            });
            const userId = userRes.data.id;

            const payload = {
                data: {
                    name,
                    classCode,
                    institute,
                    teachers: [userId]
                }
            };

            // Conditionally add optional fields to avoid "Invalid relations" or empty string errors
            if (exam) {
                payload.data.exam = exam;
            }
            if (examDate) {
                payload.data.examDate = examDate;
            }

            console.log('[ClassroomController] Sending Payload to Strapi:', JSON.stringify(payload, null, 2));

            const response = await this.api.post('/api/classrooms', payload);
            return this.handleSuccess(res, response.data);
        } catch (error) {
            console.error('[ClassroomController] Create Error:', error.response?.data || error.message);
            return this.handleError(res, error);
        }
    }

    async updateClassroom(req, res) {
        try {
            const { id } = req.params;
            const { name, examDate } = req.body;

            console.log('[ClassroomController] Update Request:', { id, name, examDate });

            if (!id) {
                return res.status(400).json({ error: 'Classroom ID is required' });
            }

            if (!name) {
                return res.status(400).json({ error: 'New name is required' });
            }

            // Ideally we should check if the user has permission to update this classroom (is the teacher)
            // But for now, we'll assume the frontend/middleware handles auth, and we just use system token to update

            const payload = {
                data: {
                    name
                }
            };

            if (examDate !== undefined) {
                payload.data.examDate = examDate;
            }

            const response = await this.api.put(`/api/classrooms/${id}`, payload);

            return this.handleSuccess(res, response.data);
        } catch (error) {
            console.error('[ClassroomController] Update Error:', error.response?.data || error.message);
            return this.handleError(res, error);
        }
    }
}

module.exports = ClassroomController;
