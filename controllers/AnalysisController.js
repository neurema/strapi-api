const BaseController = require('./BaseController');

class AnalysisController extends BaseController {
    constructor() {
        super('content');
    }

    async createAnalysis(req, res) {
        try {
            const {
                weakPoints,
                blindSpots,
                strongPoints,
                metrics,
                areaOfImprovement,
                transcription,
                study_session, // Link to a session if provided
            } = req.body;

            const payload = {
                data: {
                    weakPoints,
                    blindSpots,
                    strongPoints,
                    metrics,
                    areaOfImprovement,
                    transcription,
                    study_session,
                },
            };

            // Remove undefined keys to avoid sending nulls unless intended
            Object.keys(payload.data).forEach(
                key => payload.data[key] === undefined && delete payload.data[key]
            );

            const response = await this.api.post('/api/analyses', payload);

            return this.handleSuccess(res, response.data);

        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async getAnalyses(req, res) {
        try {
            // Pass through all query parameters (filters, populate, etc.)
            // Example usage: /analysis/get?filters[session][id]=123&populate=*
            const { sessionId, ...otherParams } = req.query;

            const params = {
                ...otherParams,
            };

            // Support direct filtering by sessionId
            if (sessionId) {
                params['filters[study_session][id][$eq]'] = sessionId;
            }

            const response = await this.api.get('/api/analyses', { params });

            return this.handleSuccess(res, response.data);

        } catch (error) {
            return this.handleError(res, error);
        }
    }
}

module.exports = AnalysisController;
