const BaseController = require('./BaseController');

class ContentController extends BaseController {
    constructor() {
        super('content');
    }

    async getArticles(req, res) {
        try {
            const { lastSync } = req.query;
            const params = {
                populate: '*'
            };

            if (lastSync) {
                params['filters[updatedAt][$gt]'] = lastSync;
            }

            // Example: Fetch articles from Strapi
            const response = await this.api.get('/api/articles', { params });
            return this.handleSuccess(res, response.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async getCategory(req, res) {
        try {
            const { id } = req.params;
            const { lastSync } = req.query;
            const params = {
                populate: '*'
            };

            if (lastSync) {
                params['filters[updatedAt][$gt]'] = lastSync;
            }

            const response = await this.api.get(`/api/categories/${id}`, { params });
            return this.handleSuccess(res, response.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }
}

module.exports = ContentController;
