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
const { calculateDowntime } = require("../utils/downtimeCalculator");

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

    const attachments = req.files ? req.files.map((file) => file.location) : [];
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
    const requestCreator = await Employee.findById(createdBy);
    await Machine.findByIdAndUpdate(machineId, {
      status:
        machineStatus === "down"
          ? "down"
          : machineStatus === "upNormal"
          ? "upNormal"
          : "normal",
    });
    // Send email to maintenance supervisor

    const emailHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px; background-color: #f9f9f9;">
      <h2 style="color: #007bff; text-align: center;">🔧 New Maintenance Request (No Reply)</h2>
      
      <div style="background: #fff; padding: 15px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <p><strong>📌 Request ID:</strong> ${newRequest.requestID}</p>
        <p><strong>📍 Production Line Status:</strong> <span style="color: ${
          productionLineStatus === "down" ? "red" : "green"
        };">${productionLineStatus}</span></p>
        <p><strong>⚙️ Machine Status:</strong> <span style="color: ${
          machineStatus === "down" ? "red" : "green"
        };">${machineStatus}</span></p>
        <p><strong>🛠 Machine:</strong> ${machine.name}</p>
        <p><strong>👤 Request Created By:</strong> ${requestCreator.name}</p>
        <p><strong>❌ Failures:</strong> ${failures}</p>
        <p><strong>🔎 Issue Description:</strong> ${breakDownCauses}</p>
        
        <div style="margin-top: 20px; text-align: center;">
          <a href="https://mms.stephanosbakedgoods.com/maintenance-request" 
            style="display: inline-block; padding: 10px 20px; background: #007bff; color: #fff; text-decoration: none; font-weight: bold; border-radius: 4px;">
            🔗 View Request
          </a>
        </div>
      </div>
      
      <p style="margin-top: 20px; text-align: center; font-size: 12px; color: #777;">
        This is an automated message. Please do not reply.
      </p>
    </div>
  `;

    await sendEmail(
      process.env.MAINTENANCE_SUPERVISOR_EMAIL,
      "New Maintenance Request",
      emailHtml
    );

    res.status(201).json(newRequest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Assign a technician and set priority
exports.assignRequest = async (req, res) => {
  try {
    const { requestId, assignedTo, priority, assignedBy } = req.body;

    const request = await MaintenanceRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Update the request with assignedTo, priority, and assignedBy
    request.assignedTo = assignedTo;
    request.priority = priority;
    request.assignedBy = assignedBy; // Add assignedBy
    request.requestStatus = "Assigned";
    await request.save();
    console.log(req.body);

    // get the email of assignedTo from employee model
    const assignedToObj = await Employee.findOne({ _id: assignedTo });
    console.log({ assignedToObj });
    const assignedToEmail = assignedToObj.email;
    console.log({ assignedToEmail });

    // Send email to the assigned technician
    const emailHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px; background-color: #f9f9f9;">
      <h2 style="color: #007bff; text-align: center;">🔧 Maintenance Request Assigned</h2>
      
      <div style="background: #fff; padding: 15px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <p><strong>📌 Request ID:</strong> ${request.requestID}</p>
        <p><strong>📍 Production Line Status:</strong> <span style="color: ${
          request.productionLineStatus === "down" ? "red" : "green"
        };">${request.productionLineStatus}</span></p>
        <p><strong>⚙️ Machine Status:</strong> <span style="color: ${
          request.machineStatus === "down" ? "red" : "green"
        };">${request.machineStatus}</span></p>
        <p><strong>🔥 Priority:</strong> <span style="color: ${
          request.priority === "High"
            ? "red"
            : request.priority === "Medium"
            ? "orange"
            : "green"
        };">${request.priority}</span></p>
        <p><strong>❌ Failures:</strong> ${request.failures}</p>
        <p><strong>🔎 Break Down Causes:</strong> ${request.breakDownCauses}</p>
  
        <div style="margin-top: 20px; text-align: center;">
          <a href="https://mms.stephanosbakedgoods.com/maintenance-request" 
            style="display: inline-block; padding: 10px 20px; background: #007bff; color: #fff; text-decoration: none; font-weight: bold; border-radius: 4px;">
            🔗 View Request
          </a>
        </div>
      </div>
  
      <p style="margin-top: 20px; text-align: center; font-size: 12px; color: #777;">
        This is an automated message. Please do not reply.
      </p>
    </div>
  `;

    await sendEmail(
      "hamza.alaydi.99@outlook.sa",
      "Assigned Maintenance Request",
      emailHtml
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

    const request = await MaintenanceRequest.findById(requestId)
      .populate("productionLine", "name")
      .populate("machine", "name");

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

    // Calculate total cost of spare parts
    let totalCost = 0;
    if (Array.isArray(spareParts) && spareParts.length > 0) {
      totalCost = spareParts.reduce(
        (sum, part) => sum + (part.price || 0) * (part.quantity || 0),
        0
      );
    }

    // Update machine's maintenance cost
    const updatedMachine = await Machine.findByIdAndUpdate(
      request.machine._id, // Use _id instead of request.machine
      { $inc: { maintenanceCost: totalCost } },
      { new: true } // Return updated document
    );

    if (!updatedMachine) {
      return res.status(404).json({ message: "Machine not found" });
    }

    // Check other active requests for production line status
    const productionLineId = request.productionLine._id; // Use _id
    const activeProductionLineRequests = await MaintenanceRequest.find({
      productionLine: productionLineId,
      requestStatus: { $ne: "Closed" },
      _id: { $ne: request._id }, // Exclude current closed request
    });

    const shouldProdLineBeDown = activeProductionLineRequests.some(
      (req) => req.productionLineStatus === "down"
    );

    await ProductionLine.findByIdAndUpdate(productionLineId, {
      status: shouldProdLineBeDown ? "down" : "running",
    });

    // Enhanced machine status calculation
    const activeMachineRequests = await MaintenanceRequest.find({
      machine: request.machine._id, // Use _id
      requestStatus: { $ne: "Closed" },
    });

    const machineStatuses = activeMachineRequests.map(
      (req) => req.machineStatus
    );
    const newMachineStatus = machineStatuses.includes("down")
      ? "down"
      : machineStatuses.includes("upNormal")
      ? "upNormal"
      : "normal";

    await Machine.findByIdAndUpdate(request.machine._id, {
      status: newMachineStatus,
    });

    // Format attachments for email
    const attachmentsText =
      request.attachments && request.attachments.length > 0
        ? request.attachments.join("\n      - ")
        : "No attachments provided";

    // Send email to the maintenance supervisor
    const emailHtml = `
    <h2>✅ Maintenance Request Closed</h2>
    <p><strong>🆔 Request ID:</strong> ${request.requestID}</p>
    <p><strong>🏭 Production Line:</strong> ${
      request.productionLine.name || "N/A"
    }</p>
    <p><strong>🛠 Machine Name:</strong> ${request.machine.name || "N/A"}</p>
    
    <p><strong>🔩 Spare Parts Used:</strong><br>
       ${
         spareParts.length > 0
           ? spareParts
               .map(
                 (part) =>
                   `✔️ ${part.partName || "Unknown Part"} (${
                     part.quantity || 1
                   })`
               )
               .join("<br>")
           : "No spare parts used"
       }
    </p>
    
    <p><strong>⏳ Machine Downtime:</strong> ${machineDowntime} minutes</p>
    <p><strong>📉 Production Line Downtime:</strong> ${productionLineDowntime} minutes</p>
    <p><strong>🔧 Solution:</strong> ${solution || "No solution provided"}</p>
    <p><strong>📌 Recommendations:</strong> ${
      recommendations || "No recommendations provided"
    }</p>
    
    <p><strong>📎 Attachments:</strong><br> 
       ${
         attachmentsText && attachmentsText.trim().length > 0
           ? attachmentsText
               .split("\n")
               .map((att) => `📂 <a href="${att}">${att}</a>`)
               .join("<br>")
           : "No attachments provided"
       }
    </p>
    
    <p>🔗 <strong>View Request:</strong> <a href="https://mms.stephanosbakedgoods.com/summaries"> View Request</a></p>
    `;
    await sendEmail(
      process.env.MAINTENANCE_SUPERVISOR_EMAIL,
      "Maintenance Request Closed",
      emailHtml
    );

    res.status(200).json(request);
  } catch (error) {
    console.error("Error in addSpareParts:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// Fetch all requests for the maintenance supervisor
exports.getRequestsForSupervisor = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;
    if (!req.query.user || !req.query.user.department) {
      return res.status(404).json({ message: "User not found" });
    }
    const loggedInUserId = req.query.user;
    // Get the logged-in user's ID from the request (assuming it's added by your auth middleware)

    // Build query object
    const query = {};

    // Add status filter if provided
    if (status) {
      query.requestStatus = status;
    }

    // If the user is a technician, only fetch requests assigned to them
    if (req.query.user.department?.name === "maintenance technical") {
      query.assignedTo = loggedInUserId;
    }

    const [requests, total] = await Promise.all([
      MaintenanceRequest.find(query)
        .populate("createdBy")
        .populate("machine")
        .populate("assignedBy")
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

exports.getRequestById = async (req, res) => {
  try {
    const request = await MaintenanceRequest.findById(req.params.id)
      .populate("productionLine")
      .populate("machine")
      .populate("createdBy")
      .populate("assignedTo")
      .populate("assignedBy");

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
      - Link: https://mms.stephanosbakedgoods.com/maintenance-request`;

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
    // Find employees where department.name = "maintenance technical"
    const employees = await Employee.find({})
      .populate({
        path: "department",
        match: { name: "maintenance technical" }, // Filter by department name
      })
      .lean();

    // Filter out employees who don't belong to the specified department
    const maintenanceTechnicians = employees.filter(
      (employee) => employee.department !== null
    );

    // Check if there are employees in the department
    if (maintenanceTechnicians.length === 0) {
      return res.status(404).json({
        message: "No employees found in the Maintenance Technician department",
      });
    }

    // Return the list of employees in the department
    res.status(200).json(maintenanceTechnicians);
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
      .populate("createdBy")
      .populate("assignedTo", "name role");

    if (!maintenanceDetails) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }

    res.status(200).json(maintenanceDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
