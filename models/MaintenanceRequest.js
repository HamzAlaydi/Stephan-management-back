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
      enum: ["down", "running"],
      required: true,
    },
    machineStatus: {
      type: String,
      enum: ["down", "normal", "upNormal"],
      required: true,
    },
    failures: {
      type: String,
      required: true,
    },
    breakDownCauses: {
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
    productionLineDownStart: {
      type: Date,
      default: null,
    },
    productionLineDownEnd: {
      type: Date,
      default: null,
    },
    machineDownStart: {
      type: Date,
      default: null,
    },
    machineDownEnd: {
      type: Date,
      default: null,
    },
    scheduledDate: Date,
    solution: String,
    recommendations: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("MaintenanceRequest", maintenanceRequestSchema);
