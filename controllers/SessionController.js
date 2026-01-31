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

                // OPTIONAL: sync param
                lastSync
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

            // FIXED: Do NOT use lastSync for existence check.
            /*
            const actualLastSync = lastSync || req.query.lastSync;
            if (actualLastSync) {
                findParams['filters[updatedAt][$gt]'] = actualLastSync;
            }
            */

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
            const { userTopicId, profileId } = req.query;

            if (!userTopicId && !profileId) {
                return res.status(400).json({
                    error: 'Either userTopicId or profileId query parameter is required',
                });
            }

            const params = {
                populate: '*',
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

            if (userTopicId) {
                params['filters[user_topic][id][$eq]'] = userTopicId;
            } else if (profileId) {
                // Bulk fetch for all sessions belonging to this profile via user_topic
                params['filters[user_topic][profile][id][$eq]'] = profileId;
                // We also need to populate user_topic to map sessions back to topics on client if needed,
                // BUT the client might minimal info.
                // The client sync logic needs user_topic ID to map it.
                // Let's ensure user_topic is populated or at least its ID is available.
                // 'populate' is already '*', so user_topic should be there.
            }

            const { lastSync } = req.query;
            if (lastSync) {
                params['filters[updatedAt][$gt]'] = lastSync;
            }

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
