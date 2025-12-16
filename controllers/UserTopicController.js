const BaseController = require('./BaseController');

class UserTopicController extends BaseController {
    constructor() {
        super('content'); // Uses CONTENT_API_TOKEN
    }

    async findOrCreateUserTopic(req, res) {
        try {
            const {
                memoryLocation, lastSession, nextSession,
                timeTotal, timeRemaining, revisionsDone,
                topicId, profileId
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

            const findResponse = await this.api.get('/api/user-topics', { params: findParams });
            const foundData = findResponse.data;

            if (foundData.data && foundData.data.length > 0) {
                // Found existing, return it
                return this.handleSuccess(res, foundData);
            }

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
                'populate[topic][fields][0]': 'name',
                'populate[topic][fields][1]': 'section',
                'populate[sessions][fields][0]': 'id',
                'filters[profile][documentId][$eq]': profileId,
                'pagination[limit]': '5000',
            };

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
