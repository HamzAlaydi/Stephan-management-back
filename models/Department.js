// models/Department.js
const mongoose = require("mongoose");

const departmentSchema = mongoose.Schema(
  {
    name: {
      type: String,
      // make enum
      enum: [
        "maintenance supervisor",
        "maintenance technical",
        "production line supervisor",
      ],
      required: true,
      unique: true,
    },
    employees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee", // Reference to the Employee model
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Middleware to convert the name to lowercase before saving
departmentSchema.pre("save", function (next) {
  if (this.name) {
    this.name = this.name.toLowerCase(); // Convert name to lowercase
  }
  next();
});

module.exports = mongoose.model("Department", departmentSchema);
