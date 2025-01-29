const express = require("express");
const {
  registerEmployee,
  loginEmployee,
  deleteEmployee,
  updateEmployee,
  getAllEmployees,
  validateToken, // Add this
} = require("../controllers/authController");
const { protect, admin } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const Employee = require("../models/Employee");
const jwt = require("jsonwebtoken");

const router = express.Router();

router.post("/login", loginEmployee);
router.post("/register", protect, admin, registerEmployee); // Only admins can register new employees
router.get("/", protect, admin, getAllEmployees); // Fetch all employees (protected, admin-only)
router.get("/validate", protect, validateToken);
router.delete("/:id", protect, admin, deleteEmployee); // Delete an employee (protected, admin-only)
router.patch("/:id", protect, admin, upload.single("photo"), updateEmployee); // Update an employee (protected, admin-only)

module.exports = router;
