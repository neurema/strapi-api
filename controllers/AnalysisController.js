const BaseController = require('./BaseController');

class AnalysisController extends BaseController {
    constructor() {
        super('content');
    }

    async createAnalysis(req, res) {
        try {
            const toText = (value) => {
                if (value === undefined || value === null) return undefined;
                if (typeof value === 'string') return value;
                if (typeof value === 'number' || typeof value === 'boolean') return String(value);
                try {
                    return JSON.stringify(value);
                } catch (_) {
                    return String(value);
                }
            };

            const {
                weakPoints,
                blindSpots,
                strongPoints,
                metrics,
                areaOfImprovement,
                transcription,
                session, // Client alias
                study_session, // Actual schema relation
            } = req.body;

            const sessionRelation = study_session ?? session;
            if (sessionRelation === undefined || sessionRelation === null) {
                return res.status(400).json({ error: 'study_session is required' });
            }

            const payload = {
                data: {
                    weakPoints: toText(weakPoints) ?? '',
                    blindSpots: toText(blindSpots) ?? '',
                    strongPoints: toText(strongPoints) ?? '',
                    metrics: toText(metrics) ?? '',
                    areaOfImprovement: toText(areaOfImprovement) ?? '',
                    transcription: toText(transcription) ?? '',
                    study_session: sessionRelation,
                },
            };

            const response = await this.api.post('/api/analyses', payload);

            return this.handleSuccess(res, response.data);

        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async getAnalyses(req, res) {
        try {
            // Pass through all query parameters (filters, populate, etc.)
            // Example usage: /analysis/get?filters[study_session][id]=123&populate=*
            const { sessionId, ...otherParams } = req.query;

            const params = {
                ...otherParams,
            };

            // Support direct filtering by sessionId
            if (sessionId) {
                params['filters[study_session][id][$eq]'] = sessionId;
            }

            // Support lastSync
            const { lastSync } = req.query;
            if (lastSync) {
                params['filters[updatedAt][$gt]'] = lastSync;
            }

            const response = await this.api.get('/api/analyses', { params });

            return this.handleSuccess(res, response.data);

        } catch (error) {
            return this.handleError(res, error);
        }
    }
}

module.exports = AnalysisController;
