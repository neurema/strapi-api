require('dotenv').config();
const axios = require('axios');
const config = require('./config');

async function checkUsers() {
    console.log('Checking users with Content Token...');
    try {
        const response = await axios.get(`${config.strapiUrl}/api/users`, {
            headers: {
                Authorization: `Bearer ${config.contentApiToken}`
            }
        });
        console.log('Users found (Content Token):', response.data.map(u => ({ id: u.id, email: u.email, username: u.username })));
    } catch (error) {
        console.error('Error fetching users (Content Token):', error.response?.status, error.response?.data);
    }

    console.log('\nChecking users with User Token...');
    try {
        const response = await axios.get(`${config.strapiUrl}/api/users`, {
            headers: {
                Authorization: `Bearer ${config.userApiToken}`
            }
        });
        console.log('Users found (User Token):', response.data.map(u => ({ id: u.id, email: u.email, username: u.username })));
    } catch (error) {
        console.error('Error fetching users (User Token):', error.response?.status, error.response?.data);
    }
}

checkUsers();
