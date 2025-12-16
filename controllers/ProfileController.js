const BaseController = require('./BaseController');

class ProfileController extends BaseController {
    constructor() {
        super('content'); // Uses CONTENT_API_TOKEN
    }

    async getProfiles(req, res) {
        try {
            const { email } = req.query;
            if (!email) {
                return res.status(400).json({ error: 'Email query parameter is required' });
            }

            // Dart: 'filters[user][email][$eq]': email
            const response = await this.api.get('/api/profiles', {
                params: {
                    'populate': '*',
                    'filters[user][email][$eq]': email
                }
            });
            return this.handleSuccess(res, response.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async createProfile(req, res) {
        try {
            console.log('createProfile raw body:', JSON.stringify(req.body));
            // Dart sends body: { data: { ... } }
            // We expect the client (middleware caller) to pass the raw data or the structured data.
            // Following previous pattern, we normally expect specific fields in req.body and construct the Strapi payload here.
            // However, the Dart code constructs the full payload.
            // Let's assume the middleware endpoint receives flat JSON keys and structures it for Strapi, 
            // OR receives the 'data' object.
            // Looking at the Dart code:
            // It sends JSON encoded body with `data` key.
            // But usually middleware abstracts Strapi structure.
            // Let's accept flat fields from the request body to be cleaner, 
            // mirroring how we handled UserController (where we destructured req.body).

            // Wait, looking at User Create: we destructured name, email, pass and built the payload.
            // Let's do the same here for consistency and "middleware" value add.

            // Handle both flat and nested (standard Strapi) request structures
            const requestData = req.body.data || req.body;

            const {
                examType, examDate, studyMode, isInstituteLinked,
                college, collegeEmail, year, rollNo,
                dailyTopicLimit, defaultSessionDuration, user, vivaCount
            } = requestData;

            const payload = {
                data: {
                    examType,
                    examDate,
                    studyMode,
                    isInstituteLinked,
                    dailyTopicLimit,
                    defaultSessionDuration,
                    user: user,
                    college,
                    collegeEmail,
                    year,
                    rollNo,
                    vivaCount
                }
            };

            // Clean undefined values if optional fields are missing
            Object.keys(payload.data).forEach(key => payload.data[key] === undefined && delete payload.data[key]);

            const response = await this.api.post('/api/profiles', payload);
            return this.handleSuccess(res, response.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async updateProfile(req, res) {
        try {
            const { profileId } = req.params;
            const {
                studyMode, isInstituteLinked, college, collegeEmail,
                year, rollNo, dailyTopicLimit, defaultSessionDuration, vivaCount
            } = req.body;

            const payload = {
                data: {
                    studyMode,
                    isInstituteLinked,
                    college,
                    collegeEmail,
                    year,
                    rollNo,
                    dailyTopicLimit,
                    defaultSessionDuration,
                    vivaCount
                }
            };

            const response = await this.api.put(`/api/profiles/${profileId}`, payload);
            return this.handleSuccess(res, response.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async deleteProfile(req, res) {
        try {
            const { profileId } = req.params;
            const response = await this.api.delete(`/api/profiles/${profileId}`);
            // Strapi delete returns the deleted object or simple confirmation.
            // Dart expects 200 or 204.
            return this.handleSuccess(res, response.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }
}

module.exports = ProfileController;
