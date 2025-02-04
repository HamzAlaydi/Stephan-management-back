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

// Middleware to capitalize the first letter of each word in the name
machineSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    // Only capitalize if the name field is being modified
    this.name = this.name
      .toLowerCase() // Convert to lowercase first to handle mixed-case input
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  next();
});
module.exports = mongoose.model("Machine", machineSchema);
