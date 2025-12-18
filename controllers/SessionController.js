const BaseController = require('./BaseController');

class SessionController extends BaseController {
    constructor() {
        super('content'); // Uses CONTENT_API_TOKEN
    }

    async findOrCreateSession(req, res) {
        try {
            const {
                isPaused,
                scheduledFor,
                timeTakenForRevision,
                timeTakenForActivity,
                timeAllotted,
                scoreActivity,
                difficultyLevel,
                userTopicId,

                // NEW: canonical stay topic id
                id,

                // OPTIONAL: backward compatibility
                stayTopicId,
            } = req.body;

            // 🔒 Hard validation
            if (!userTopicId || !scheduledFor) {
                return res.status(400).json({
                    error: 'userTopicId and scheduledFor are required',
                });
            }

            if (!id && !stayTopicId) {
                return res.status(400).json({
                    error: 'Stay topic id (id) is required',
                });
            }

            // Normalize stay topic id
            const stayId = id || stayTopicId;

            // 1️⃣ Check if session exists
            const findParams = {
                'filters[user_topic][id][$eq]': userTopicId,
                'filters[scheduledFor][$eq]': scheduledFor,
                'pagination[limit]': '1',
            };

            const findResponse = await this.api.get(
                '/api/study-sessions',
                { params: findParams }
            );

            const foundData = findResponse.data;
            if (foundData?.data?.length > 0) {
                return this.handleSuccess(res, foundData);
            }

            // 2️⃣ Create new session
            const payload = {
                data: {
                    isPaused,
                    scheduledFor,
                    timeTakenForRevision,
                    timeTakenForActivity,
                    timeAllotted,
                    scoreActivity,
                    difficultyLevel,
                    user_topic: userTopicId,
                    stayTopicId: stayId,
                },
            };

            // Clean undefined
            Object.keys(payload.data).forEach(
                key => payload.data[key] === undefined && delete payload.data[key]
            );

            const createResponse = await this.api.post(
                '/api/study-sessions',
                payload
            );

            return this.handleSuccess(res, createResponse.data);

        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async getSessions(req, res) {
        try {
            const { userTopicId } = req.query;

            if (!userTopicId) {
                return res.status(400).json({
                    error: 'userTopicId query parameter is required',
                });
            }

            const params = {
                populate: '*',
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

            const response = await this.api.get(
                '/api/study-sessions',
                { params }
            );

            return this.handleSuccess(res, response.data);

        } catch (error) {
            return this.handleError(res, error);
        }
    }
}

module.exports = SessionController;
