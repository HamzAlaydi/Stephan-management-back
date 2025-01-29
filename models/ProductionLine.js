// models/productionLineModel.js
const mongoose = require("mongoose");

const productionLineSchema = mongoose.Schema(
  {
    productionId: {
      type: String,
      required: true,
      unique: true, // Ensure each production line has a unique ID
    },
    name: {
      type: String,
      required: true,
      unique: true, // Ensure each production line has a unique name
    },
    description: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    machines: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Machine", // Reference to the Machine model
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ProductionLine", productionLineSchema);
