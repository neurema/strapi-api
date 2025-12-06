const axios = require('axios');
const config = require('../config');

class BaseController {
    constructor(tokenType = 'content') {
        const token = tokenType === 'user' ? config.userApiToken : config.contentApiToken;
        this.api = axios.create({
            baseURL: config.strapiUrl,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
    }

    handleError(res, error) {
        console.error('API Error:', error.response?.data || error.message);
        const status = error.response?.status || 500;
        const message = error.response?.data?.error?.message || 'Internal Server Error';
        res.status(status).json({ error: message });
    }

    handleSuccess(res, data) {
        res.status(200).json(data);
    }
}

module.exports = BaseController;
