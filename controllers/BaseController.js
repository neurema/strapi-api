const axios = require('axios');
const config = require('../config');

class BaseController {
  constructor(tokenType = 'content') {
    const token =
      tokenType === 'user'
        ? config.userApiToken
        : config.contentApiToken;

    this.api = axios.create({
      baseURL: config.strapiUrl,
      timeout: 15000, // HARD timeout to prevent hanging requests
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Request logging
    this.api.interceptors.request.use(
      (request) => {
        console.log(
          `[STRAPI → REQUEST] ${request.method?.toUpperCase()} ${request.baseURL}${request.url}`
        );
        return request;
      },
      (error) => Promise.reject(error)
    );

    // Response logging (optional but useful)
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error(
          '[STRAPI → ERROR]',
          error.response?.status,
          error.response?.data || error.message
        );
        return Promise.reject(error);
      }
    );
  }

  /**
   * Send a successful response and TERMINATE request lifecycle
   */
  handleSuccess(res, data, status = 200) {
    if (res.headersSent) return;
    return res.status(status).json(data);
  }

  /**
   * Send an error response and TERMINATE request lifecycle
   */
  handleError(res, error) {
    if (res.headersSent) return;

    const status =
      error.response?.status ||
      error.status ||
      500;

    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'Internal Server Error';

    return res.status(status).json({
      error: message,
    });
  }
}

module.exports = BaseController;
