// controllers/machineController.js
const Machine = require("../models/Machine");
const ProductionLine = require("../models/ProductionLine");
const MaintenanceRequest = require("../models/MaintenanceRequest");
// @desc    Create a new machine
const createMachine = async (req, res) => {
  try {
    const { machineId, name, description, productionId, status } = req.body;

    // Validate required fields
    if (!machineId || !productionId) {
      return res.status(400).json({
        message: "Both machineId and productionId are required",
      });
    }

    // Check for existing machineId
    const existingMachine = await Machine.findOne({ machineId });
    if (existingMachine) {
      return res.status(400).json({ message: "machineId must be unique" });
    }

    // Check if the production line exists
    const productionLine = await ProductionLine.findOne({ _id: productionId });
    if (!productionLine) {
      return res.status(404).json({ message: "Production line not found" });
    }

    // Create the machine
    const machine = await Machine.create({
      machineId,
      name,
      description,
      productionLine: productionLine._id, // Link to production line
      status: status || "normal",
    });

    // Add machine to production line's machines array
    await ProductionLine.findByIdAndUpdate(
      productionLine._id,
      { $push: { machines: machine._id } },
      { new: true }
    );

    // Return the created machine with populated production line info
    const populatedMachine = await Machine.findById(machine._id).populate(
      "productionLine",
      "name status"
    );

    res.status(201).json(populatedMachine);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all machines

const getMachines = async (req, res) => {
  try {
    const { productionLine } = req.query; // Get the productionLine from query parameters

    let machines;

    if (productionLine) {
      // If productionLine is provided, filter machines by productionLine
      machines = await Machine.find({ productionLine });
    } else {
      // If no productionLine is provided, return all machines
      machines = await Machine.find();
    }

    res.json(machines);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single machine by ID
const getMachineById = async (req, res) => {
  console.log("Called");
  console.log(req.params.id);
  try {
    const machine = await Machine.findById(req.params.id).populate(
      "productionLine"
    );
    if (!machine) {
      return res.status(404).json({ message: "Machine not found" });
    }
    res.status(200).json(machine);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateMachine = async (req, res) => {
  try {
    const { maintenanceCost, ...otherUpdates } = req.body;
    const machine = await Machine.findById(req.params.id);

    if (!machine) {
      return res.status(404).json({ message: "Machine not found" });
    }

    // Handle maintenance cost updates
    if (typeof maintenanceCost === "number") {
      machine.maintenanceCost = maintenanceCost;
    }

    // Update other fields
    Object.keys(otherUpdates).forEach((key) => {
      machine[key] = otherUpdates[key];
    });

    const updatedMachine = await machine.save();
    res.status(200).json(updatedMachine);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
// @desc    Delete a machine
const deleteMachine = async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id);
    if (!machine) {
      return res.status(404).json({ message: "Machine not found" });
    }

    // Remove machine from the production line's machines array
    await ProductionLine.findByIdAndUpdate(machine.productionLine, {
      $pull: { machines: machine._id },
    });

    // Delete the machine
    await Machine.deleteOne({ _id: req.params.id });

    res.status(200).json({ message: "Machine deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Fetch machine details with maintenance history
const getMachineDetailsWithMaintenance = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch machine details
    const machine = await Machine.findById(id)
      .populate("productionLine")
      .populate({
        path: "maintenanceRequests",
        populate: [
          { path: "createdBy", select: "name role" },
          { path: "assignedTo", select: "name role" },
          { path: "assignedBy", select: "name role" },
        ],
      });

    if (!machine) {
      return res.status(404).json({ message: "Machine not found" });
    }

    // Calculate maintenance statistics
    const stats = await MaintenanceRequest.aggregate([
      { $match: { machine: machine._id } },
      {
        $group: {
          _id: null,
          totalDowntime: { $sum: "$machineDowntime" },
          averageRepairTime: { $avg: "$machineDowntime" },
          totalRequests: { $sum: 1 },
          totalCost: { $sum: { $sum: "$sparePartsUsed.price" } },
        },
      },
    ]);

    res.status(200).json({
      machine,
      stats: stats[0] || {
        totalDowntime: 0,
        averageRepairTime: 0,
        totalRequests: 0,
        totalCost: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Fetch maintenance history for a specific machine
const getMaintenanceHistory = async (req, res) => {
  try {
    const { machineId } = req.params;

    const maintenanceHistory = await MaintenanceRequest.find({
      machine: machineId,
    })
      .populate("createdBy")
      .populate("assignedTo")
      .populate("assignedBy")

      .sort({ createdAt: -1 });

    res.status(200).json(maintenanceHistory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
module.exports = {
  createMachine,
  getMachines,
  getMachineById,
  updateMachine,
  deleteMachine,
  getMachineDetailsWithMaintenance,
  getMaintenanceHistory,
};
