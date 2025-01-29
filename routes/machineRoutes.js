// routes/machineRoutes.js
const express = require("express");
const {
  createMachine,
  getMachines,
  getMachineById,
  updateMachine,
  deleteMachine,
} = require("../controllers/machineController");
const { protect, admin } = require("../middleware/authMiddleware");

const router = express.Router();

// CRUD Routes for Machines
router.post("/", protect, createMachine); // Create a new machine (protected, admin-only)
router.get("/", protect, getMachines); // Get all machines
router.get("/:id", protect, getMachineById); // Get a single machine by ID
router.patch("/:id", protect, updateMachine); // Update a machine
router.delete("/:id", protect, deleteMachine); // Delete a machine

module.exports = router;
