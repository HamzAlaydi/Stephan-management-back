// controllers/maintenanceController.js
require("dotenv").config();
const Machine = require("../models/Machine");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const sendEmail = require("../utils/emailService");
const ProductionLine = require("../models/ProductionLine");
const { default: mongoose } = require("mongoose");
const { generateRequestID } = require("../utils/generateRequestID");
const Department = require("../models/Department"); // Import the Department model
const Employee = require("../models/Employee"); // Import the Employee model// Create a new maintenance request

exports.createMaintenanceRequest = async (req, res) => {
  try {
    const {
      productionLine,
      machineId,
      productionLineStatus,
      machineStatus,
      symptoms,
      issueDescription,
      createdBy,
    } = req.body;

    const attachments = req.files ? req.files.map((file) => file.path) : [];

    // Verify that the machine and production line exist
    const machine = await Machine.findById(machineId);
    if (!machine) {
      return res.status(404).json({ message: "Machine not found" });
    }

    const productionLineExists = await ProductionLine.findById(productionLine);
    if (!productionLineExists) {
      return res.status(404).json({ message: "Production line not found" });
    }

    // Initialize downtime tracking
    const now = new Date();
    const productionLineDownStart =
      productionLineStatus === "Down" ? now : null;
    const machineDownStart = machineStatus === "Down" ? now : null;

    const newRequest = new MaintenanceRequest({
      requestID: generateRequestID(),
      productionLine,
      machine: machineId,
      productionLineStatus,
      machineStatus,
      symptoms,
      issueDescription,
      attachments,
      createdBy,
      productionLineDownStart,
      machineDownStart,
    });

    await newRequest.save();

    // Send email to maintenance supervisor
    const emailText = `New Maintenance Request:
      - Machine: ${machine.name}
      - Production Line Status: ${productionLineStatus}
      - Machine Status: ${machineStatus}
      - Symptoms: ${symptoms}
      - Issue Description: ${issueDescription}
      - Link: http://mydomain/maintenance-request/${newRequest._id}`;

    await sendEmail(
      process.env.MAINTENANCE_SUPERVISOR_EMAIL,
      "New Maintenance Request",
      emailText
    );

    res.status(201).json(newRequest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Assign a technician and set priority
exports.assignRequest = async (req, res) => {
  try {
    const { requestId, assignedTo, priority } = req.body;
    const request = await MaintenanceRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.assignedTo = assignedTo;
    request.priority = priority;
    request.requestStatus = "Assigned"; // Update status to "Assigned"

    await request.save();

    // Send email to the assigned technician
    const emailText = `You have been assigned a maintenance request:
      - Symptoms: ${request.symptoms}
      - Issue Description: ${request.issueDescription}
      - Link: http://mydomain/maintenance-request/${request._id}`;

    sendEmail(
      "technician@domain.com",
      "Assigned Maintenance Request",
      emailText
    );

    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update request status (e.g., "In Progress" or "Scheduled")
exports.updateRequestStatus = async (req, res) => {
  try {
    const { requestId, status, productionLineStatus, machineStatus } = req.body;
    const request = await MaintenanceRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Update production line downtime
    if (
      productionLineStatus === "Normal" &&
      request.productionLineStatus === "Down"
    ) {
      request.productionLineDownEnd = new Date();
    } else if (
      productionLineStatus === "Down" &&
      request.productionLineStatus === "Normal"
    ) {
      request.productionLineDownStart = new Date();
    }

    // Update machine downtime
    if (machineStatus === "Normal" && request.machineStatus === "Down") {
      request.machineDownEnd = new Date();
    } else if (machineStatus === "Down" && request.machineStatus === "Normal") {
      request.machineDownStart = new Date();
    }

    // Update statuses
    request.requestStatus = status;
    if (productionLineStatus)
      request.productionLineStatus = productionLineStatus;
    if (machineStatus) request.machineStatus = machineStatus;

    await request.save();

    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// stephan_system
// Add spare parts and close the request
// Add spare parts and close the request
exports.addSpareParts = async (req, res) => {
  try {
    const { requestId, spareParts, attachments, solution, recommendations } =
      req.body;

    const request = await MaintenanceRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Calculate downtime
    const { calculateDowntime } = require("../utils/downtimeCalculator");
    const productionLineDowntime = calculateDowntime(
      request.productionLineDownStart,
      request.productionLineDownEnd
    );
    const machineDowntime = calculateDowntime(
      request.machineDownStart,
      request.machineDownEnd
    );

    // Update downtime in the request
    request.productionLineDowntime = productionLineDowntime;
    request.machineDowntime = machineDowntime;

    // Add new fields to the request
    request.sparePartsUsed = spareParts;
    request.attachments = attachments || []; // Ensure it's an array
    request.solution = solution;
    request.recommendations = recommendations;
    request.requestStatus = "Closed"; // Update status to "Closed"

    // Set end timestamps if they are null
    if (!request.productionLineDownEnd) {
      request.productionLineDownEnd = new Date();
    }
    if (!request.machineDownEnd) {
      request.machineDownEnd = new Date();
    }

    await request.save();
    const totalCost = spareParts.reduce(
      (sum, part) => sum + part.price * part.quantity,
      0
    );
    await Machine.findByIdAndUpdate(
      request.machine,
      { $inc: { maintenanceCost: totalCost } },
      { new: true }
    );
    // Format attachments for email
    const attachmentsText =
      attachments && attachments.length > 0
        ? attachments.join("\n      - ") // Convert array to bullet points
        : "No attachments provided";

    // Send email to the maintenance supervisor
    const emailText = `Maintenance Request Closed:
      - Spare Parts Used: ${JSON.stringify(spareParts)}
      - Production Line Downtime: ${productionLineDowntime} minutes
      - Machine Downtime: ${machineDowntime} minutes
      - Solution: ${solution}
      - Recommendations: ${recommendations}
      - Attachments:
      - ${attachmentsText}
      - Link: http://mydomain/maintenance-request/${request._id}`;

    sendEmail(
      process.env.MAINTENANCE_SUPERVISOR_EMAIL,
      "Maintenance Request Closed",
      emailText
    );

    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Fetch all requests for the maintenance supervisor
exports.getRequestsForSupervisor = async (req, res) => {
  try {
    const requests = await MaintenanceRequest.find({})
      .populate("createdBy")
      .populate("machine");
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Fetch a single request by ID
const { calculateDowntime } = require("../utils/downtimeCalculator");

exports.getRequestById = async (req, res) => {
  try {
    const request = await MaintenanceRequest.findById(req.params.id)
      .populate("productionLine")
      .populate("machine")
      .populate("createdBy")
      .populate("assignedTo");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Calculate downtime
    const productionLineDowntime = calculateDowntime(
      request.productionLineDownStart,
      request.productionLineDownEnd
    );
    const machineDowntime = calculateDowntime(
      request.machineDownStart,
      request.machineDownEnd
    );

    // Add downtime to the response
    const response = request.toObject();
    response.productionLineDowntime = productionLineDowntime;
    response.machineDowntime = machineDowntime;

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Delete a maintenance request
exports.deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify if the request exists
    const request = await MaintenanceRequest.findById(id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Delete the request
    const deletedRequest = await MaintenanceRequest.findByIdAndDelete(id);

    // Send email to the maintenance supervisor
    const emailText = `A Maintenance Request has been deleted:
      - Request ID: ${request.id}
      - Link: http://mydomain/maintenance-request/${request._id}`;

    await sendEmail(
      process.env.MAINTENANCE_SUPERVISOR_EMAIL,
      "Maintenance Request Deleted",
      emailText
    );

    res.status(200).json({
      message: "Maintenance request deleted successfully" + deletedRequest,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// controllers/maintenanceController.js

// Get all employees in the "Maintenance Technician" department
exports.getStaff = async (req, res) => {
  try {
    // Find the department by name (assuming the department name is lowercase)
    const department = await Department.findOne({
      _id: "6790aac8f0b2bdf1744d24dc",
    }).populate("employees");

    if (!department) {
      return res
        .status(404)
        .json({ message: "Maintenance Technician department not found" });
    }

    // Check if there are employees in the department
    if (department.employees.length === 0) {
      return res.status(404).json({
        message: "No employees found in the Maintenance Technician department",
      });
    }

    // Return the list of employees in the department
    res.status(200).json(department.employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMaintenanceSummary = async (req, res) => {
  try {
    const summary = await MaintenanceRequest.aggregate([
      {
        $group: {
          _id: "$machine",
          totalDowntime: { $sum: "$machineDowntime" },
          openRequests: {
            $sum: { $cond: [{ $eq: ["$requestStatus", "Open"] }, 1, 0] },
          },
          totalCost: { $sum: { $sum: "$sparePartsUsed.price" } },
          averageResolutionTime: { $avg: "$machineDowntime" },
        },
      },
      {
        $lookup: {
          from: "machines",
          localField: "_id",
          foreignField: "_id",
          as: "machineDetails",
        },
      },
      { $unwind: "$machineDetails" },
      {
        $project: {
          machineName: "$machineDetails.name",
          machineId: "$machineDetails.machineId",
          totalDowntime: 1,
          openRequests: 1,
          totalCost: 1,
          averageResolutionTime: 1,
        },
      },
    ]);

    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Fetch maintenance details by ID
exports.getMaintenanceDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const maintenanceDetails = await MaintenanceRequest.findById(id)
      .populate("productionLine")
      .populate("machine")
      .populate("createdBy", "name role")
      .populate("assignedTo", "name role");

    if (!maintenanceDetails) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }

    res.status(200).json(maintenanceDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
