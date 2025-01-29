// routes/maintenanceRoutes.js
const express = require("express");
const maintenanceController = require("../controllers/maintenanceController");
const upload = require("../middleware/upload");

const router = express.Router();

router.post(
  "/",
  upload.single("attachment"),
  maintenanceController.createMaintenanceRequest
);
router.post("/assign", maintenanceController.assignRequest);
router.post("/status", maintenanceController.updateRequestStatus);
router.post("/spare-parts", maintenanceController.addSpareParts);
router.get("/staff", maintenanceController.getStaff);
router.get("/", maintenanceController.getRequestsForSupervisor); // Fetch all requests
router.get("/:id", maintenanceController.getRequestById); // Fetch a single request by ID
router.delete("/:id", maintenanceController.deleteRequest); // Fetch a single request by ID

module.exports = router;
