const mongoose = require("mongoose");

const maintenanceRequestSchema = mongoose.Schema(
  {
    requestID: {
      type: String,
      required: true,
      unique: true,
    },
    productionLine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionLine",
      required: true,
    },
    machine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Machine",
      required: true,
    },
    productionLineStatus: {
      type: String,
      enum: ["Down", "Normal"],
      required: true,
    },
    machineStatus: {
      type: String,
      enum: ["Down", "Normal"],
      required: true,
    },
    symptoms: {
      type: String,
      required: true,
    },
    issueDescription: {
      type: String,
      required: true,
    },
    attachments: [String], // Array of file paths
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
    },
    requestStatus: {
      type: String,
      enum: ["Pending", "Assigned", "In Progress", "Scheduled", "Closed"],
      default: "Pending",
    },
    sparePartsUsed: [
      {
        category: String,
        partName: String,
        quantity: Number,
        price: Number,
      },
    ],
    maintenanceType: {
      type: String,
      enum: ["Preventive", "Corrective"],
      default: "Corrective",
    },
    expectedCompletionDate: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("MaintenanceRequest", maintenanceRequestSchema);
