const BaseController = require('./BaseController');

class SubjectController extends BaseController {
    constructor() {
        super('content'); // Uses CONTENT_API_TOKEN
    }

    async getExams(req, res) {
        try {
            const params = {
                'fields[0]': 'name',
            };
            const response = await this.api.get('/api/exams', { params });
            this.handleSuccess(res, response.data);
        } catch (error) {
            this.handleError(res, error);
        }
    }
    async getSubjects(req, res) {
        try {
            const { exam } = req.query;
            if (!exam) {
                return res.status(400).json({ error: 'Exam query parameter is required' });
            }

            // Constructing the Strapi query parameters exactly as the Dart code did
            const params = {
                'fields[0]': 'name',
                'filters[exams][name][$eq]': exam,
                'populate[topics][fields][0]': 'section',
                'populate[topics][fields][1]': 'name',
                'populate[exams][fields][0]': 'name',
                'populate[exams][filters][name][$eq]': exam,
            };

            const response = await this.api.get('/api/subjects', { params });
            this.handleSuccess(res, response.data);
        } catch (error) {
            this.handleError(res, error);
        }
    }
}

module.exports = SubjectController;
