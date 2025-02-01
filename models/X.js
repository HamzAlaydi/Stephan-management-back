// models/MaintenanceRequest.js
const mongoose = require("mongoose");

const maintenanceRequestSchema = mongoose.Schema(
  {
    requestID: {
      type: String,
      required: true,
      unique: true, // Ensure each request has a unique ID
    },
    machine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Machine", // Reference to the Machine model
      required: true,
    },
    operationStatus: {
      type: String,
      enum: ["Operational", "Non-Operational"],
      default: "Operational",
    },
    productionLine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionLine", // Reference to the ProductionLine model
      required: true,
    },
    requestStatus: {
      type: String,
      enum: ["Pending", "Assigned", "In Progress", "Completed"],
      default: "Pending",
    },
    failures: {
      type: String,
      required: true,
    },
    breakDownCauses: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee", // Reference to the employee who created the request
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee", // Reference to the maintenance supervisor assigned to the request
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("MaintenanceRequest", maintenanceRequestSchema);
