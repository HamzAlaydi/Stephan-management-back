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
    console.log({ attachments });

    // Verify that the machine exists
    if (!mongoose.Types.ObjectId.isValid(machineId)) {
      return res.status(400).json({ message: "Invalid machine ID" });
    }

    const machine = await Machine.findById(machineId);
    if (!machine) {
      return res.status(404).json({ message: "Machine not found" });
    }

    // Verify that the production line exists
    if (!mongoose.Types.ObjectId.isValid(productionLine)) {
      return res.status(400).json({ message: "Invalid production line ID" });
    }

    const productionLineExists = await ProductionLine.findById(productionLine);
    if (!productionLineExists) {
      return res.status(404).json({ message: "Production line not found" });
    }

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
    const { requestId, status } = req.body;
    const request = await MaintenanceRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.requestStatus = status;
    await request.save();

    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// stephan_system
// Add spare parts and close the request
exports.addSpareParts = async (req, res) => {
  try {
    const { requestId, spareParts } = req.body;

    const request = await MaintenanceRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.sparePartsUsed = spareParts;
    request.requestStatus = "Closed"; // Update status to "Closed"
    await request.save();

    // Send email to the maintenance supervisor
    const emailText = `Maintenance Request Closed:
      - Spare Parts Used: ${JSON.stringify(spareParts)}
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
    const requests = await MaintenanceRequest.find({});
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Fetch a single request by ID
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

    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a maintenance request
exports.deleteRequest = async (req, res) => {
  console.log(req.params);

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
