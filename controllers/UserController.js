const BaseController = require('./BaseController');

class UserController extends BaseController {
    constructor() {
        super('user');
    }

    async getUser(req, res) {
        try {
            const { email, lastSync } = req.query;
            if (!email) {
                return res.status(400).json({ error: 'Email query parameter is required' });
            }
            // Strapi filter syntax: filters[$and][0][email][$eq]=value
            const params = {
                'filters[$and][0][email][$eq]': email
            };
            if (lastSync) {
                params['filters[updatedAt][$gt]'] = lastSync;
            }

            // Allow population of fields
            if (req.query.populate) {
                params['populate'] = req.query.populate;
            }

            const response = await this.api.get('/api/users', {
                params
            });
            return this.handleSuccess(res, response.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async deleteUser(req, res) {
        try {
            const { email } = req.body; // Assuming email is passed in body for delete, or could be query
            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }

            // 1. Get User ID
            const userResponse = await this.api.get('/api/users', {
                params: {
                    'filters[$and][0][email][$eq]': email
                }
            });

            const users = userResponse.data;
            if (!users || users.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            const userId = users[0].id;

            // 2. Delete User
            const deleteResponse = await this.api.delete(`/api/users/${userId}`);
            return this.handleSuccess(res, deleteResponse.data);

        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async createUser(req, res) {
        try {
            const { name, email, password } = req.body;
            // Calls Strapi /api/auth/local/register
            // Note: The user's Dart code passes 'username' as 'email'.
            const payload = {
                email,
                username: email,
                password,
                name
            };
            const response = await this.api.post('/api/auth/local/register', payload);
            return this.handleSuccess(res, response.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }

    async login(req, res) {
        try {
            const { identifier, password } = req.body;
            // Login typically doesn't use the usage token, but we need to verify if Strapi rejects it.
            // If Strapi expects no header, we can override headers.
            // However, the Dart code had: headers: { 'Content-Type': 'application/json' } ONLY.
            // So we should remove the Authorization header for this request.

            const response = await this.api.post('/api/auth/local', {
                identifier,
                password
            }, {
                headers: {
                    Authorization: '' // unset the bearer token for this request
                }
            });
            return this.handleSuccess(res, response.data);
        } catch (error) {
            return this.handleError(res, error);
        }
    }


    async updateUser(req, res) {
        try {
            const { email, name } = req.body;
            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }

            // 1. Get User ID
            const userResponse = await this.api.get('/api/users', {
                params: {
                    'filters[$and][0][email][$eq]': email
                }
            });

            const users = userResponse.data;
            if (!users || users.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            const userId = users[0].id;

            // 2. Update User
            const updateResponse = await this.api.put(`/api/users/${userId}`, {
                name
            });
            return this.handleSuccess(res, updateResponse.data);

        } catch (error) {
            return this.handleError(res, error);
        }
    }

}

module.exports = UserController;
