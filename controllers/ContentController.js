const BaseController = require('./BaseController');

class ContentController extends BaseController {
    constructor() {
        super('content');
    }

    async getArticles(req, res) {
        try {
            // Example: Fetch articles from Strapi
            const response = await this.api.get('/api/articles?populate=*');
            return this.handleSuccess(res, response.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async getCategory(req, res) {
        try {
            const { id } = req.params;
            const response = await this.api.get(`/api/categories/${id}?populate=*`);
            return this.handleSuccess(res, response.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }
}

module.exports = ContentController;
