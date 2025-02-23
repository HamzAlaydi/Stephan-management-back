// server.js - Entry Point
const dotenv = require('dotenv');
const app = require('./app');
const connectDB = require('./config/db');
const serverless = require("serverless-http"); // Add this

// Load environment variables
dotenv.config();

// Connect to the database
connectDB();

// Start server
const PORT = process.env.PORT || 5000;
module.exports.handler = serverless(app);
