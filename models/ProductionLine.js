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
      enum: ["running", "down"],
      default: "running",
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

productionLineSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.name = this.name
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  next();
});

module.exports = mongoose.model("ProductionLine", productionLineSchema);
