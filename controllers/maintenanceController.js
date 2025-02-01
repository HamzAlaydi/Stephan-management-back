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
      failures,
      breakDownCauses,
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
      productionLineStatus === "down" ? now : null;
    const machineDownStart = machineStatus === "down" ? now : null;

    const newRequest = new MaintenanceRequest({
      requestID: generateRequestID(),
      productionLine,
      machine: machineId,
      productionLineStatus,
      machineStatus,
      failures,
      breakDownCauses,
      attachments,
      createdBy,
      productionLineDownStart,
      machineDownStart,
    });

    await newRequest.save();
    await ProductionLine.findByIdAndUpdate(productionLine, {
      status: productionLineStatus === "down" ? "down" : "running", // Updated status
    });
    await Machine.findByIdAndUpdate(machineId, {
      status:
        machineStatus === "down"
          ? "down"
          : machineStatus === "upNormal"
          ? "upNormal"
          : "normal",
    });
    // Send email to maintenance supervisor
    const emailText = `New Maintenance Request:
      - Machine: ${machine.name}
      - Production Line Status: ${productionLineStatus}
      - Machine Status: ${machineStatus}
      - Failures: ${failures}
      - Issue Description: ${breakDownCauses}
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
      - Failures: ${request.failures}
      - Issue Description: ${request.breakDownCauses}
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
      productionLineStatus === "running" &&
      request.productionLineStatus === "down"
    ) {
      request.productionLineDownEnd = new Date();
    } else if (
      productionLineStatus === "down" &&
      request.productionLineStatus === "running"
    ) {
      request.productionLineDownStart = new Date();
    }

    if (machineStatus === "normal" && request.machineStatus === "down") {
      request.machineDownEnd = new Date();
    } else if (machineStatus === "down" && request.machineStatus === "normal") {
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
    const { requestId, spareParts, solution, recommendations } = req.body;

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

    // Check other active requests for production line status
    const productionLineId = request.productionLine;
    const activeProductionLineRequests = await MaintenanceRequest.find({
      productionLine: productionLineId,
      requestStatus: { $ne: "Closed" },
      _id: { $ne: request._id }, // Exclude current closed request
    });

    const shouldProdLineBeDown = activeProductionLineRequests.some(
      (req) => req.productionLineStatus === "down" // Lowercase comparison
    );

    await ProductionLine.findByIdAndUpdate(productionLineId, {
      status: shouldProdLineBeDown ? "down" : "running", // Correct status value
    });

    // Enhanced machine status calculation
    const machineStatuses = activeMachineRequests.map(
      (req) => req.machineStatus
    );
    const newMachineStatus = machineStatuses.includes("down")
      ? "down"
      : machineStatuses.includes("upNormal")
      ? "upNormal"
      : "normal";

    await Machine.findByIdAndUpdate(machineId, {
      status: newMachineStatus,
    });

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
      - Machine Downtime: ${machineDowntime} minutes
      - Production Line Downtime: ${productionLineDowntime} minutes
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
    const { page = 1, limit = 10, status, assignedTo } = req.query;
    const skip = (page - 1) * limit;

    // Build query object
    const query = {};
    if (status) query.requestStatus = status;
    if (assignedTo) query.assignedTo = assignedTo;

    const [requests, total] = await Promise.all([
      MaintenanceRequest.find(query)
        .populate("createdBy")
        .populate("machine")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      MaintenanceRequest.countDocuments(query),
    ]);

    res.status(200).json({
      requests,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
      },
    });
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
        $lookup: {
          from: "machines",
          localField: "machine",
          foreignField: "_id",
          as: "machine",
        },
      },
      { $unwind: "$machine" },
      {
        $group: {
          _id: "$machine._id",
          machineName: { $first: "$machine.name" },
          totalDowntime: { $sum: "$downtime.machine" },
          openRequests: {
            $sum: { $cond: [{ $ne: ["$requestStatus", "closed"] }, 1, 0] },
          },
          totalCost: {
            $sum: {
              $reduce: {
                input: "$sparePartsUsed",
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    { $multiply: ["$$this.price", "$$this.quantity"] },
                  ],
                },
              },
            },
          },
          avgResolutionTime: {
            $avg: {
              $subtract: ["$timeline.closed", "$timeline.created"],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          machineId: "$_id",
          machineName: 1,
          totalDowntime: 1,
          openRequests: 1,
          totalCost: 1,
          avgResolutionHours: {
            $divide: ["$avgResolutionTime", 1000 * 60 * 60],
          },
        },
      },
    ]);

    res.json(summary);
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
