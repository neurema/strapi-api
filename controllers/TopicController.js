const BaseController = require('./BaseController');

class TopicController extends BaseController {
    constructor() {
        super('content');
    }

    async createTopic(req, res) {
        try {
            const { name, subject, ownerProfile, section } = req.body;

            if (!name || !subject) {
                return res.status(400).json({ error: 'Name and Subject are required' });
            }

            const payload = {
                data: {
                    name,
                    subject,
                    ownerProfile,
                    section,
                }
            };

            // Remove undefined optional fields
            Object.keys(payload.data).forEach(key => payload.data[key] === undefined && delete payload.data[key]);

            const response = await this.api.post('/api/topics', payload);
            return this.handleSuccess(res, response.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async deleteTopic(req, res) {
        try {
            const response = await this.api.delete(`/api/topics/${documentId}`);
            return this.handleSuccess(res, response.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async getTopics(req, res) {
        try {
            const { subject, name } = req.query;
            const params = {
                'populate': '*'
            };

            if (subject) params['filters[subject][$eq]'] = subject;
            if (name) params['filters[name][$contains]'] = name;

            const response = await this.api.get('/api/topics', { params });
            return this.handleSuccess(res, response.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }
}

module.exports = TopicController;
