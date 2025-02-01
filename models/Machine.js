// models/machineModel.js
const mongoose = require("mongoose");

const machineSchema = mongoose.Schema(
  {
    machineId: {
      type: String,
      required: true,
      unique: true, // Ensure machineId is unique
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    productionLine: {
      type: String,
      ref: "ProductionLine", // Reference to the ProductionLine model
      required: true,
    },
    status: {
      type: String,
      enum: ["normal", "upNormal", "down"], // New status values
      default: "normal",
    },
    maintenanceCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    maintenanceRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MaintenanceRequest", // Reference to the MaintenanceRequest model
      },
    ],
  },

  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Machine", machineSchema);
