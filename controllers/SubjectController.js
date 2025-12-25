const BaseController = require('./BaseController');

class SubjectController extends BaseController {
    constructor() {
        super('content'); // Uses CONTENT_API_TOKEN
    }

    async getExams(req, res) {
        try {
            const { lastSync } = req.query;
            const params = {
                'fields[0]': 'name',
            };
            if (lastSync) {
                params['filters[updatedAt][$gt]'] = lastSync;
            }
            const response = await this.api.get('/api/exams', { params });
            return this.handleSuccess(res, response.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }
    async getSubjects(req, res) {
        try {
            const { exam, ownerProfile, lastSync } = req.query;
            if (!exam) {
                return res.status(400).json({ error: 'Exam query parameter is required' });
            }

            const params = {
                'fields[0]': 'name',
                'filters[exams][name][$eq]': exam,
                'populate[topics][fields][0]': 'section',
                'populate[topics][fields][1]': 'name',
                'populate[exams][fields][0]': 'name',
                'populate[exams][filters][name][$eq]': exam,
            };

            if (lastSync) {
                params['filters[updatedAt][$gt]'] = lastSync;
            }

            if (ownerProfile) {
                params['populate[topics][filters][$or][0][ownerProfile][documentId][$null]'] = true;
                params['populate[topics][filters][$or][1][ownerProfile][documentId][$eq]'] = ownerProfile;
            } else {
                params['populate[topics][filters][ownerProfile][documentId][$null]'] = true;
            }

            const response = await this.api.get('/api/subjects', { params });
            return this.handleSuccess(res, response.data);

        } catch (error) {
            return this.handleError(res, error);
        }
    }

}

module.exports = SubjectController;
