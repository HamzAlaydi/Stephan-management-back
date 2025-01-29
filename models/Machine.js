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
    productionId: {
      type: String,
      ref: "ProductionLine", // Reference to the ProductionLine model
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "under_maintenance"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Machine", machineSchema);
