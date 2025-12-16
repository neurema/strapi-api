const BaseController = require('./BaseController');

class SessionController extends BaseController {
    constructor() {
        super('content'); // Uses CONTENT_API_TOKEN
    }

    async findOrCreateSession(req, res) {
        try {
            const {
                isPaused, scheduledFor, timeTakenForRevision,
                timeTakenForActivity, timeAllotted, scoreActivity,
                difficultyLevel, userTopicId, stayTopicId
            } = req.body;

            if (!userTopicId || !scheduledFor) {
                return res.status(400).json({ error: 'userTopicId and scheduledFor are required' });
            }

            // 1. Check if session exists
            const findParams = {
                'filters[user_topic][id][$eq]': userTopicId,
                'filters[scheduledFor][$eq]': scheduledFor,
                'pagination[limit]': '1',
            };

            const findResponse = await this.api.get('/api/study-sessions', { params: findParams });
            const foundData = findResponse.data;

            if (foundData.data && foundData.data.length > 0) {
                // Found existing session, return it
                return this.handleSuccess(res, foundData);
            }

            // 2. Create new session if not found
            const payload = {
                data: {
                    isPaused,
                    scheduledFor,
                    timeTakenForRevision,
                    timeTakenForActivity,
                    timeAllotted,
                    scoreActivity,
                    user_topic: userTopicId,
                    difficultyLevel,
                    stayTopicId
                }
            };

            // Clean undefined
            Object.keys(payload.data).forEach(key => payload.data[key] === undefined && delete payload.data[key]);

            const createResponse = await this.api.post('/api/study-sessions', payload);
            return this.handleSuccess(res, createResponse.data);

        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async getSessions(req, res) {
        try {
            const { userTopicId } = req.query;
            if (!userTopicId) {
                return res.status(400).json({ error: 'userTopicId query parameter is required' });
            }

            const params = {
                'populate': '*',
                'filters[user_topic][id][$eq]': userTopicId,
                'fields[0]': 'id',
                'fields[1]': 'isPaused',
                'fields[2]': 'scheduledFor',
                'fields[3]': 'timeTakenForRevision',
                'fields[4]': 'timeTakenForActivity',
                'fields[5]': 'timeAllotted',
                'fields[6]': 'scoreActivity',
                'fields[7]': 'difficultyLevel',
                'fields[8]': 'stayTopicId',
                'pagination[limit]': '5000',
            };

            const response = await this.api.get('/api/study-sessions', { params });
            return this.handleSuccess(res, response.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }
}

module.exports = SessionController;
