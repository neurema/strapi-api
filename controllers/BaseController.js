const axios = require('axios');
const http = require('http');
const https = require('https');
const config = require('../config');

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 100, maxFreeSockets: 10 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 100, maxFreeSockets: 10 });

const instances = {
    user: createAxiosInstance(config.userApiToken),
    content: createAxiosInstance(config.contentApiToken)
};

function createAxiosInstance(token) {
    const instance = axios.create({
        baseURL: config.strapiUrl,
        timeout: 15000,
        httpAgent,  // Use the shared agent
        httpsAgent, // Use the shared agent
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    // Attach Interceptors only ONCE
    instance.interceptors.request.use(
        (request) => {
            // Only log in dev/test to save CPU in prod
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[STRAPI → REQUEST] ${request.method?.toUpperCase()} ${request.url}`);
            }
            return request;
        },
        (error) => Promise.reject(error)
    );

    instance.interceptors.response.use(
        (response) => response,
        (error) => {
            console.error('[STRAPI → ERROR]', error.response?.status, error.message);
            return Promise.reject(error);
        }
    );

    return instance;
}

class BaseController {
    constructor(tokenType = 'content') {
        // 3. Assign the PRE-CREATED instance instead of making a new one
        this.api = tokenType === 'user' ? instances.user : instances.content;
    }

    handleSuccess(res, data, status = 200) {
        if (res.headersSent) return;
        return res.status(status).json(data);
    }

    handleError(res, error) {
        if (res.headersSent) return;
        const status = error.response?.status || error.status || 500;
        const message = error.response?.data?.error?.message || error.message || 'Internal Server Error';
        return res.status(status).json({ error: message });
    }
}

module.exports = BaseController;