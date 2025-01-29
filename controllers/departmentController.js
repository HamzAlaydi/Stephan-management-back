// controllers/departmentController.js
const Department = require("../models/Department");
const Employee = require("../models/Employee");

// Create a new department
const createDepartment = async (req, res) => {
  const { name } = req.body;

  try {
    const department = await Department.create({ name });
    res.status(201).json(department);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all departments
const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().populate(
      "employees",
      "name email"
    );
    res.status(200).json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a department (e.g., add employees)
const updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { name, employees } = req.body; // Accept `name` and `employees` in the request body

  try {
    // Check if the department exists
    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Update the department name if provided
    if (name) {
      department.name = name;
    }

    // Validate and add employees to the department
    if (employees && Array.isArray(employees)) {
      for (const employeeId of employees) {
        const employee = await Employee.findById(employeeId);
        if (!employee) {
          return res
            .status(404)
            .json({ message: `Employee ${employeeId} not found` });
        }
      }

      // Avoid duplicates and add employees
      department.employees = [
        ...new Set([...department.employees, ...employees]),
      ];
    }

    // Save the updated department
    const updatedDepartment = await department.save();

    // Populate employees in the response
    await updatedDepartment.populate("employees", "name email");

    res.status(200).json(updatedDepartment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a department
const deleteDepartment = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if the department exists
    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Remove the department
    await Department.deleteOne({ _id: id });

    // Optionally: Remove the department reference from employees
    await Employee.updateMany(
      { department: id },
      { $unset: { department: "" } }
    );

    res.status(200).json({ message: "Department deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Remove an employee from a department
const removeEmployeeFromDepartment = async (req, res) => {
  const { id, employeeId } = req.params;

  try {
    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    department.employees = department.employees.filter(
      (emp) => emp.toString() !== employeeId
    );

    await department.save();

    await Employee.findByIdAndUpdate(employeeId, {
      $unset: { department: "" },
    });

    res
      .status(200)
      .json({ message: "Employee removed from department successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment, // Export deleteDepartment
  removeEmployeeFromDepartment, // Export removeEmployeeFromDepartment
};
