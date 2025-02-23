const dotenv = require("dotenv");
const app = require("./app");
const connectDB = require("./config/db");
const serverless = require("serverless-http");

// Load environment variables
dotenv.config();

// Connect to the database
connectDB();

// Export the handler for Lambda
module.exports.handler = serverless(app);
