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
                dailyTopicLimit, defaultSessionDuration, user, vivaCount,
                classCode // Extract classCode from request
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
            let linkedCollegeName = null;
            let linkedCollegeColor = null;
            let linkedCollegeLogo = null;

            if (payload.data.collegeEmail) {
                const institute = await this._findInstituteByDomain(payload.data.collegeEmail);
                if (institute) {
                    payload.data.institute = institute.id; // Uses documentId if available
                    // Do NOT send 'college' field to Strapi as it causes ValidationError
                    // payload.data.college = institute.name; 
                    linkedCollegeName = institute.name;
                    linkedCollegeColor = institute.color;
                    linkedCollegeLogo = institute.logo;

                    payload.data.isInstituteLinked = true;
                    console.log(`[ProfileController] Auto-linked to institute: ${institute.name} (ID: ${institute.id})`);
                }
            }

            // Auto-link Classroom based on classCode
            let linkedClassroomName = null;
            if (classCode) {
                const classroom = await this._findClassroomByCode(classCode);
                if (classroom) {
                    payload.data.classroom = classroom.id; // Link relation
                    linkedClassroomName = classroom.name;
                    console.log(`[ProfileController] Auto-linked to classroom: ${classroom.name} (ID: ${classroom.id})`);
                }
            }

            const response = await this.api.post('/api/profiles', payload);
            console.log(`[ProfileController] Create success. ID: ${response.data.data?.id}, DocumentID: ${response.data.data?.documentId}`);

            // Ensure college name is in the response if we auto-linked it
            if (linkedCollegeName && response.data && response.data.data) {
                response.data.data.college = linkedCollegeName;
                response.data.data.collegeColor = linkedCollegeColor;
                response.data.data.collegeLogo = linkedCollegeLogo;
            }
            // Ensure classroom name is in response
            if (linkedClassroomName && response.data && response.data.data) {
                response.data.data.classroomName = linkedClassroomName;
            }

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
                year, rollNo, dailyTopicLimit, defaultSessionDuration, vivaCount,
                classCode
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
            let linkedCollegeName = null;
            let linkedCollegeColor = null;
            let linkedCollegeLogo = null;

            if (payload.data.collegeEmail) {
                const institute = await this._findInstituteByDomain(payload.data.collegeEmail);
                if (institute) {
                    payload.data.institute = institute.id;
                    // Do NOT send 'college' field to Strapi
                    // payload.data.college = institute.name;
                    linkedCollegeName = institute.name;
                    linkedCollegeColor = institute.color;
                    linkedCollegeLogo = institute.logo;

                    // Only set isInstituteLinked if not explicitly passed
                    if (isInstituteLinked === undefined) {
                        payload.data.isInstituteLinked = true;
                    }
                    console.log(`[ProfileController] Auto-linked to institute: ${institute.name} (ID: ${institute.id})`);
                }
            }

            // Auto-link Classroom based on classCode if updating
            const { classOperation } = req.body; // 'add' or 'remove'
            let linkedClassroomName = null;

            if (classCode) {
                const classroomToLink = await this._findClassroomByCode(classCode);
                if (classroomToLink) {
                    const classroomId = classroomToLink.id;

                    // Fetch existing profile to get current classrooms array
                    // We need to know current state to "append" or "remove" from the array manually
                    // as implicit connect/disconnect might be behaving unexpectedly or user prefers manual array handling.
                    console.log(`[ProfileController] Fetching profile ${profileId} to manage classroom relations`);
                    try {
                        const currentProfileRes = await this.api.get(`/api/profiles/${profileId}`, {
                            params: { populate: 'classroom' } // Ensure 'classroom' relation is populated
                        });

                        const profileData = currentProfileRes.data.data;
                        // Handle Strapi response structure (attributes vs flat)
                        const currentClassroomData = profileData.attributes ? profileData.attributes.classroom : profileData.classroom;

                        // Extract existing IDs
                        let currentIds = [];
                        if (currentClassroomData && currentClassroomData.data) {
                            currentIds = currentClassroomData.data.map(c => c.documentId || c.id);
                        } else if (Array.isArray(currentClassroomData)) {
                            // If it's already a list of objects (some middleware flattening?)
                            currentIds = currentClassroomData.map(c => c.documentId || c.id);
                        }

                        console.log(`[ProfileController] Current Classroom IDs: ${currentIds}`);

                        if (classOperation === 'remove') {
                            // Remove the ID if present
                            currentIds = currentIds.filter(id => id !== classroomId && id !== classroomToLink.documentId && id !== classroomToLink.id); // Compare flexibly
                            console.log(`[ProfileController] Removed ${classroomId}/${classroomToLink.documentId} from list`);
                        } else {
                            // Default to Add: Append if not present
                            // Check existence to avoid dupes (though Set handles it, explicit check is clear)
                            // Use flexible check for ID vs DocumentID if mixed
                            const exists = currentIds.some(id => id === classroomId || id === classroomToLink.documentId);
                            if (!exists) {
                                currentIds.push(classroomId);
                                console.log(`[ProfileController] Appended ${classroomId} to list`);
                            }
                        }

                        // Update payload with new array of IDs
                        payload.data.classroom = currentIds;

                        // For logging/response decoration
                        if (classOperation !== 'remove') {
                            linkedClassroomName = classroomToLink.name;
                        }

                    } catch (fetchErr) {
                        console.error('[ProfileController] Failed to fetch current profile for relation update:', fetchErr.message);
                        // Fallback: If we can't fetch, maybe we try just setting the single one? 
                        // But that overwrites. Better to fail safe or log.
                    }
                }
            } else if (classCode === "") {
                // Keep the "clear all" logic if explicitly sent empty string
                payload.data.classroom = [];
                console.log(`[ProfileController] Unlinking all classrooms (classCode is empty)`);
            }

            console.log(`[ProfileController] Updating profile at: /api/profiles/${profileId}`);
            const response = await this.api.put(`/api/profiles/${profileId}`, payload);
            console.log(`[ProfileController] Update success: ${response.status}`);

            // Ensure college name is in the response if we auto-linked it
            if (linkedCollegeName && response.data && response.data.data) {
                response.data.data.college = linkedCollegeName;
                response.data.data.collegeColor = linkedCollegeColor;
                response.data.data.collegeLogo = linkedCollegeLogo;
            }
            // Ensure classroom name is in response
            if (linkedClassroomName && response.data && response.data.data) {
                response.data.data.classroomName = linkedClassroomName;
            }

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
                    'fields[0]': 'id',
                    'fields[1]': 'name',
                    'fields[2]': 'documentId', // Fetch documentId for Strapi v5 compatibility
                    'fields[3]': 'color',
                    'populate[logo][fields][0]': 'url',
                    'populate[logo][fields][1]': 'width',
                    'populate[logo][fields][2]': 'height'
                }
            });

            console.log(`[ProfileController] Search response status: ${response.status}`);
            const institutes = response.data.data;
            if (institutes && institutes.length > 0) {
                console.log(`[ProfileController] Found institute: ${JSON.stringify(institutes[0])}`);
                const inst = institutes[0];

                // Extract logo URL if available
                let logoUrl = null;
                if (inst.logo) {
                    // Handle both structure types (array or single object depending on relation type, usually single Media)
                    // But standard media population in v4/v5 often returns object or array of objects
                    const logoData = Array.isArray(inst.logo) ? inst.logo[0] : inst.logo;
                    if (logoData) {
                        logoUrl = logoData.url;
                    }
                }

                return {
                    id: inst.documentId || inst.id, // Prefer documentId for Strapi v5
                    name: inst.name,
                    color: inst.color,
                    logo: logoUrl
                };
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

    // Helper to find classroom by classCode
    async _findClassroomByCode(classCode) {
        try {
            if (!classCode) return null;

            console.log(`[ProfileController] Searching for classroom with code: '${classCode}'`);
            const response = await this.api.get('/api/classrooms', {
                params: {
                    'filters[classCode][$eq]': classCode,
                    'fields[0]': 'id',
                    'fields[1]': 'name', // Assuming classroom has a name
                    'fields[2]': 'documentId'
                }
            });

            const classrooms = response.data.data;
            if (classrooms && classrooms.length > 0) {
                const cls = classrooms[0];
                console.log(`[ProfileController] Found classroom: ${JSON.stringify(cls)}`);
                return {
                    id: cls.documentId || cls.id,
                    name: cls.name || cls.classCode // Fallback to code if name missing
                };
            }
            console.log(`[ProfileController] No classroom found for code: ${classCode}`);
            return null;
        } catch (error) {
            console.error('[ProfileController] Error finding classroom:', error.message);
            return null;
        }
    }
}

module.exports = ProfileController;
