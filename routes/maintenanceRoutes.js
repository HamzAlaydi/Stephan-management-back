// routes/maintenanceRoutes.js
require("dotenv").config();
const express = require("express");
const maintenanceController = require("../controllers/maintenanceController");
const upload = require("../middleware/upload")("attachments"); // Maintenance attachments folder
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { GetObjectCommand } = require("@aws-sdk/client-s3");

const router = express.Router();

router.post(
  "/",
  upload.array("attachments", 5),
  maintenanceController.createMaintenanceRequest
);
router.get("/summary", maintenanceController.getMaintenanceSummary);
router.post("/assign", maintenanceController.assignRequest);
router.post("/status", maintenanceController.updateRequestStatus);
router.post("/spare-parts", maintenanceController.addSpareParts);
router.get("/staff", maintenanceController.getStaff);
router.get("/", maintenanceController.getRequestsForSupervisor); // Fetch all requests

router.get("/uploads/:key", async (req, res) => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: req.params.key,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 60 });
    res.redirect(url);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error generating URL" });
  }
});
router.get("/:id", maintenanceController.getRequestById); // Fetch a single request by ID
router.delete("/:id", maintenanceController.deleteRequest); // Fetch a single request by ID

module.exports = router;
