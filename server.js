const express = require('express');
const cors = require('cors');
const config = require('./config');
console.log("LOADING ROUTES...");
const routes = require('./routes');
console.log("ROUTES LOADED");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes);

// Base route for health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Middleware Server is running' });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start Server
app.listen(config.port, () => {
    console.log(`Middleware Server running on port ${config.port}`);
});
