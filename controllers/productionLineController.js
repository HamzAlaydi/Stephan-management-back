// controllers/productionLineController.js
const ProductionLine = require("../models/ProductionLine");

// @desc    Create a new production line
const createProductionLine = async (req, res) => {
  const { productionId, name, description, status } = req.body;

  try {
    // Check if productionId is unique
    const existingProductionLine = await ProductionLine.findOne({
      productionId,
    });
    if (existingProductionLine) {
      return res.status(400).json({ message: "productionId must be unique" });
    }

    // Create the production line
    const productionLine = await ProductionLine.create({
      productionId,
      name,
      description,
      status: status || "active",
    });

    res.status(201).json(productionLine);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
// @desc    Get all production lines
const getProductionLines = async (req, res) => {
  try {
    const productionLines = await ProductionLine.find({}).populate("machines");

    res.status(200).json(productionLines);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get a single production line by ID
const getProductionLineById = async (req, res) => {
  try {
    const productionLine = await ProductionLine.findById(
      req.params.id
    ).populate("machines", "name machineId status");
    if (!productionLine) {
      return res.status(404).json({ message: "Production line not found" });
    }
    res.status(200).json(productionLine);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
// @desc    Update a production line
const updateProductionLine = async (req, res) => {
  try {
    const { name, description, status, machines, productionId } = req.body;
    const productionLine = await ProductionLine.findById(req.params.id);

    if (!productionLine) {
      return res.status(404).json({ message: "Production line not found" });
    }

    // Update only the fields that are provided in the request
    if (productionId !== undefined) productionLine.productionId = productionId;
    if (name !== undefined) productionLine.name = name;
    if (description !== undefined) productionLine.description = description;
    if (status !== undefined) productionLine.status = status;
    if (machines !== undefined) productionLine.machines = machines;

    const updatedProductionLine = await productionLine.save();
    res.status(200).json(updatedProductionLine);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a production line
const deleteProductionLine = async (req, res) => {
  try {
    const productionLine = await ProductionLine.findById(req.params.id);
    if (!productionLine) {
      return res.status(404).json({ message: "Production line not found" });
    }

    // Remove the production line reference from all associated machines
    await Machine.updateMany(
      { productionLine: productionLine._id },
      { $unset: { productionLine: "" } }
    );

    // Delete the production line
    await ProductionLine.deleteOne({ _id: req.params.id });

    res.status(200).json({ message: "Production line deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createProductionLine,
  getProductionLines,
  getProductionLineById,
  updateProductionLine,
  deleteProductionLine,
};
