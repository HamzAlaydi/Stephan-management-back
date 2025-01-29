// routes/productionLineRoutes.js
const express = require("express");
const {
  createProductionLine,
  getProductionLines,
  getProductionLineById,
  updateProductionLine,
  deleteProductionLine,
} = require("../controllers/productionLineController");
const { protect, admin } = require("../middleware/authMiddleware");

const router = express.Router();

// CRUD Routes for Production Lines
router.post("/", protect, createProductionLine); // Create a new production line
router.get("/", protect, getProductionLines); // Get all production lines
router.get("/:id", protect, getProductionLineById); // Get a single production line by ID
router.patch("/:id", protect, updateProductionLine); // Update a production line
router.delete("/:id", protect, deleteProductionLine); // Delete a production line

module.exports = router;
