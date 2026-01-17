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
            const params = {
                'populate': '*',
                'filters[user][email][$eq]': email
            }

            const { lastSync } = req.query;
            if (lastSync) {
                params['filters[updatedAt][$gt]'] = lastSync;
            }

            const response = await this.api.get('/api/profiles', { params });
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

            // Auto-link Institute based on collegeEmail domain
            if (payload.data.collegeEmail) {
                const instituteId = await this._findInstituteByDomain(payload.data.collegeEmail);
                if (instituteId) {
                    payload.data.institute = instituteId;
                    payload.data.isInstituteLinked = true;
                    console.log(`[ProfileController] Auto-linked to institute ID: ${instituteId}`);
                }
            }

            const response = await this.api.post('/api/profiles', payload);
            console.log(`[ProfileController] Create success. ID: ${response.data.data?.id}, DocumentID: ${response.data.data?.documentId}`);
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

            // Auto-link Institute based on collegeEmail domain if it's being updated
            if (payload.data.collegeEmail) {
                const instituteId = await this._findInstituteByDomain(payload.data.collegeEmail);
                if (instituteId) {
                    payload.data.institute = instituteId;
                    // Only set isInstituteLinked if not explicitly passed (or override it? Prompt implies auto-link, keeping explict passed value if exists or default true)
                    if (isInstituteLinked === undefined) {
                        payload.data.isInstituteLinked = true;
                    }
                    console.log(`[ProfileController] Auto-linked to institute ID: ${instituteId}`);
                }
            }

            console.log(`[ProfileController] Updating profile at: /api/profiles/${profileId}`);
            const response = await this.api.put(`/api/profiles/${profileId}`, payload);
            console.log(`[ProfileController] Update success: ${response.status}`);
            return this.handleSuccess(res, response.data);
        } catch (error) {
            console.error(`[ProfileController] Update failed for ID ${req.params.profileId}`);
            if (error.response) {
                console.error(`[ProfileController] Status: ${error.response.status}`);
                console.error(`[ProfileController] URL: ${error.config.url}`);
                console.error(`[ProfileController] Data:`, JSON.stringify(error.response.data));
            }
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

    // Helper to find institute by domain
    async _findInstituteByDomain(email) {
        try {
            if (!email || !email.includes('@')) return null;
            const domain = email.split('@')[1].toLowerCase().trim();

            // Assume Strapi has an 'institutes' endpoint or allow filtering on 'institute' collection
            // Using standard Strapi v4 filter syntax: filters[field][$eq]=value
            console.log(`[ProfileController] Searching for institute with domain: '${domain}'`);

            // Log the configured base URL to verify environment
            console.log(`[ProfileController] Using Strapi URL: ${this.api.defaults.baseURL}`);

            const response = await this.api.get('/api/institutes', {
                params: {
                    'filters[emaildomain][$eq]': domain,
                    'fields[0]': 'id' // Optimize to fetch only ID
                }
            });

            console.log(`[ProfileController] Search response status: ${response.status}`);
            const institutes = response.data.data;
            if (institutes && institutes.length > 0) {
                console.log(`[ProfileController] Found institute: ${JSON.stringify(institutes[0])}`);
                return institutes[0].id;
            }
            console.log(`[ProfileController] No institute found for domain: ${domain}`);
            return null;
        } catch (error) {
            console.error('[ProfileController] Error finding institute by domain:', error.message);
            if (error.response) {
                console.error('[ProfileController] Error Details:', {
                    status: error.response.status,
                    url: error.config.url,
                    data: error.response.data
                });
            }
            return null; // Fail silently, don't block profile creation
        }
    }
}

module.exports = ProfileController;
