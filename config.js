const config = {
    strapiUrl: process.env.STRAPI_URL || 'http://localhost:1337',
    userApiToken: process.env.STRAPI_USER_API_TOKEN || '',
    contentApiToken: process.env.STRAPI_CONTENT_API_TOKEN || '',
    port: Number(process.env.PORT) || 3000,
};

module.exports = config;
