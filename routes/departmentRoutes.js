// routes/departmentRoutes.js
const express = require("express");
const {
  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment, // Add this
  removeEmployeeFromDepartment, // Add this
} = require("../controllers/departmentController");
const { protect, admin } = require("../middleware/authMiddleware");
const router = express.Router();

router.route("/").post(protect, createDepartment).get(protect, getDepartments);

router
  .route("/:id")
  .patch(protect, updateDepartment)
  .delete(protect, deleteDepartment); // Add DELETE route

router
  .route("/:id/employees/:employeeId")
  .delete(protect, removeEmployeeFromDepartment);

module.exports = router;
