const axios = require('axios');
const http = require('http');
const https = require('https');
const config = require('../config');

// 1. SHARED AGENTS (Throttled for Stability)
// We limit maxSockets to 25. This means even if you send 2000 requests, 
// only 25 hit Strapi at once. The rest wait in line safely.
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 25, maxFreeSockets: 10 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 25, maxFreeSockets: 10 });

// 2. SHARED AXIOS INSTANCES
const instances = {};

function getAxiosInstance(token, tokenType) {
    // Return existing instance if created
    if (instances[tokenType]) return instances[tokenType];

    // Create new instance
    const instance = axios.create({
        // Use 127.0.0.1 to avoid Windows localhost DNS lookup lag
        baseURL: config.strapiUrl.replace('localhost', '127.0.0.1'),
        timeout: 60000, // 60s timeout (since requests might queue up)
        httpAgent, 
        httpsAgent,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    // ERROR INTERCEPTOR ONLY (Removed console.log request interceptor for speed)
    instance.interceptors.response.use(
        (response) => response,
        (error) => {
            // Only log status code to keep console clean
            const status = error.response?.status || 'UNKNOWN';
            const url = error.config?.url || 'UNKNOWN';
            // Only log if it's NOT a 404 (404s are expected in findOrCreate)
            if (status !== 404) {
                console.error(`[STRAPI ERROR] ${status} on ${url}`);
            }
            return Promise.reject(error);
        }
    );

    instances[tokenType] = instance;
    return instance;
}

class BaseController {
    constructor(tokenType = 'content') {
        const token = tokenType === 'user' ? config.userApiToken : config.contentApiToken;
        this.api = getAxiosInstance(token, tokenType);
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