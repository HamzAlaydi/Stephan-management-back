const dotenv = require("dotenv");
const app = require("./app");
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Connect to the database
connectDB();

// Export the handler for Lambda

// app.listen
app.listen(process.env.PORT, () => {
  console.log(`server runnint on port  ${process.env.PORT}`);
});
