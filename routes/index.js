// routes/index.js
const express = require("express");
const authRoutes = require("./authRoutes");
const departmentRoutes = require("./departmentRoutes");
const machineRoutes = require("./machineRoutes");
const productionLineRoutes = require("./productionLineRoutes");
const maintenanceRoutes = require("./maintenanceRoutes");
const sendEmail = require("../utils/emailService");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/departments", departmentRoutes);
router.use("/machines", machineRoutes);
router.use("/production-lines", productionLineRoutes);
router.use("/request", maintenanceRoutes);

// Root Endpoint
router.get("/", (req, res) => {
  res.json({ message: "Hamza Alaydi!" });
});

module.exports = router;
