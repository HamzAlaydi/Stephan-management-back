// controllers/machineController.js
const Machine = require("../models/Machine");
const ProductionLine = require("../models/ProductionLine");

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
    const productionLine = await ProductionLine.findOne({ productionId });
    if (!productionLine) {
      return res.status(404).json({ message: "Production line not found" });
    }

    // Create the machine
    const machine = await Machine.create({
      machineId,
      name,
      description,
      productionLine: productionLine._id, // Link to production line
      status: status || "active",
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
    const machines = await Machine.find({}).populate("productionLine");
    res.status(200).json(machines);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get a single machine by ID
const getMachineById = async (req, res) => {
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
    const { name, description, productionLine, status } = req.body;
    const machine = await Machine.findById(req.params.id);

    if (!machine) {
      return res.status(404).json({ message: "Machine not found" });
    }

    // Update only the fields that are provided in the request
    if (name !== undefined) machine.name = name;
    if (description !== undefined) machine.description = description;
    if (status !== undefined) machine.status = status;

    // Update productionLine if provided
    if (productionLine !== undefined) {
      const newProductionLine = await ProductionLine.findById(productionLine);
      if (!newProductionLine) {
        return res.status(404).json({ message: "Production line not found" });
      }

      // Remove machine from the old production line's machines array
      await ProductionLine.findByIdAndUpdate(machine.productionLine, {
        $pull: { machines: machine._id },
      });

      // Add machine to the new production line's machines array
      await ProductionLine.findByIdAndUpdate(productionLine, {
        $push: { machines: machine._id },
      });

      machine.productionLine = productionLine;
    }

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

module.exports = {
  createMachine,
  getMachines,
  getMachineById,
  updateMachine,
  deleteMachine,
};
