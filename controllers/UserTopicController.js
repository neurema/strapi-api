const BaseController = require('./BaseController');

class UserTopicController extends BaseController {
    constructor() {
        super('content'); // Uses CONTENT_API_TOKEN
    }

    async resolveStayTopicIdFromTopic(topicId) {
        const response = await this.api.get(`/api/topics/${topicId}`, {
            params: {
                'fields[0]': 'stayTopicId',
            },
        });

        const topic = response?.data?.data;
        const stayTopicId = topic?.stayTopicId;

        if (!stayTopicId) {
            throw new Error(`Topic ${topicId} is missing stayTopicId`);
        }

        return stayTopicId;
    }

    async ensureUserTopicStayTopicId(userTopic) {
        const currentStayTopicId = userTopic?.stayTopicId;
        if (currentStayTopicId) {
            return currentStayTopicId;
        }

        const topicRelation = userTopic?.topic;
        const topicId = topicRelation?.id;
        if (!topicId) {
            throw new Error(`User topic ${userTopic?.id || userTopic?.documentId || 'unknown'} is missing topic relation`);
        }

        const stayTopicId = await this.resolveStayTopicIdFromTopic(topicId);
        const documentId = userTopic?.documentId;
        if (!documentId) {
            throw new Error(`User topic ${userTopic?.id || 'unknown'} is missing documentId`);
        }

        await this.api.put(`/api/user-topics/${documentId}`, {
            data: {
                stayTopicId,
            },
        });

        userTopic.stayTopicId = stayTopicId;
        return stayTopicId;
    }

    async findOrCreateUserTopic(req, res) {
        try {
            const {
                memoryLocation, lastSession, nextSession,
                timeTotal, timeRemaining, revisionsDone,
                topicId, profileId,
                lastSync
            } = req.body;

            if (!topicId || !profileId) {
                return res.status(400).json({ error: 'topicId and profileId are required' });
            }

            // 1. Check if user-topic exists
            // Dart: filters[topic][id][$eq] and filters[profile][id][$eq]
            const findParams = {
                'filters[topic][id][$eq]': topicId,
                'filters[profile][id][$eq]': profileId,
                'pagination[limit]': '1',
            };

            // FIXED: Do NOT use lastSync for existence check.
            // We want to find if it exists at all, regardless of when it was updated.
            /*
            const actualLastSync = lastSync || req.query.lastSync;
            if (actualLastSync) {
                findParams['filters[updatedAt][$gt]'] = actualLastSync;
            }
            */

            const findResponse = await this.api.get('/api/user-topics', { params: findParams });
            const foundData = findResponse.data;

            if (foundData.data && foundData.data.length > 0) {
                const existingUserTopic = foundData.data[0];
                await this.ensureUserTopicStayTopicId(existingUserTopic);
                // Found existing, return it
                return this.handleSuccess(res, foundData);
            }

            const stayTopicId = await this.resolveStayTopicIdFromTopic(topicId);

            // 2. Create new user-topic
            const payload = {
                data: {
                    memoryLocation,
                    lastSession,
                    nextSession,
                    timeTotal,
                    timeRemaining,
                    revisionsDone,
                    topic: topicId,
                    profile: profileId,
                    stayTopicId,
                }
            };

            // Clean undefined
            Object.keys(payload.data).forEach(key => payload.data[key] === undefined && delete payload.data[key]);

            const createResponse = await this.api.post('/api/user-topics', payload);
            return this.handleSuccess(res, createResponse.data);

        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async backfillStayTopicIds(req, res) {
        try {
            const { profileId } = req.body || {};
            const params = {
                'fields[0]': 'documentId',
                'fields[1]': 'stayTopicId',
                'populate[topic][fields][0]': 'id',
                'populate[topic][fields][1]': 'stayTopicId',
                'pagination[limit]': '5000',
            };

            if (profileId) {
                params['filters[profile][id][$eq]'] = profileId;
            }

            const response = await this.api.get('/api/user-topics', { params });
            const userTopics = response?.data?.data || [];

            let scanned = 0;
            let updated = 0;
            let skipped = 0;
            const failures = [];

            for (const userTopic of userTopics) {
                scanned += 1;
                try {
                    const flatStayTopicId = userTopic?.stayTopicId;
                    const topicStayTopicId = userTopic?.topic?.stayTopicId;

                    if (flatStayTopicId) {
                        skipped += 1;
                        continue;
                    }

                    if (!topicStayTopicId) {
                        skipped += 1;
                        failures.push({
                            userTopicId: userTopic?.id,
                            documentId: userTopic?.documentId,
                            error: 'Missing topic.stayTopicId',
                        });
                        continue;
                    }

                    await this.api.put(`/api/user-topics/${userTopic.documentId}`, {
                        data: {
                            stayTopicId: topicStayTopicId,
                        },
                    });
                    updated += 1;
                } catch (error) {
                    failures.push({
                        userTopicId: userTopic?.id,
                        documentId: userTopic?.documentId,
                        error: error.response?.data?.error?.message || error.message,
                    });
                }
            }

            return this.handleSuccess(res, {
                scanned,
                updated,
                skipped,
                failures,
            });
        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async getUserTopics(req, res) {
        try {
            // Dart passes 'profileId' which maps to 'filters[profile][documentId][$eq]'
            // Note: The Dart function is named `getUserTopic` but returns a list (implied by the loop in typical usage, though the code provided returns findData directly which has 'data' key).
            // Actually the Dart code `getUserTopic` calls `json.decode` and returns it.
            // The params use `pagination[limit] : 5000`.

            const { profileId } = req.query;
            if (!profileId) {
                return res.status(400).json({ error: 'profileId query parameter is required' });
            }

            const params = {
                'fields[0]': 'memoryLocation',
                'fields[1]': 'lastSession',
                'fields[2]': 'nextSession',
                'fields[3]': 'timeTotal',
                'fields[4]': 'timeRemaining',
                'fields[5]': 'revisionsDone',
                'fields[6]': 'documentId',
                'fields[7]': 'stayTopicId',
                'populate[topic][fields][0]': 'id',
                'populate[topic][fields][1]': 'stayTopicId',
                'populate[topic][fields][2]': 'name',
                'populate[topic][fields][3]': 'section',
                'populate[sessions][fields][0]': 'id',
                'filters[profile][id][$eq]': profileId,
                'pagination[limit]': '5000',
            };

            const { lastSync } = req.query;
            if (lastSync) {
                params['filters[updatedAt][$gt]'] = lastSync;
            }

            const response = await this.api.get('/api/user-topics', { params });
            return this.handleSuccess(res, response.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async deleteUserTopic(req, res) {
        try {
            const { userTopicId } = req.params;
            const response = await this.api.delete(`/api/user-topics/${userTopicId}`);
            return this.handleSuccess(res, response.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }
}

module.exports = UserTopicController;
