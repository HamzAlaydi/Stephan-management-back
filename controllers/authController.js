// controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Employee = require("../models/Employee");
const Department = require("../models/Department");
const multer = require("multer");
const path = require("path");
// registerEmployee
const registerEmployee = async (req, res) => {
  const {
    name,
    email,
    password,
    department, // Department ID
    overtimeHoursPrice,
    photo,
    isAdmin,
  } = req.body;

  try {
    // Check if the department exists
    const departmentExists = await Department.findById(department);
    if (!departmentExists) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the employee
    const employee = await Employee.create({
      name,
      email,
      password: hashedPassword,
      department,
      overtimeHoursPrice,
      photo,
      isAdmin: isAdmin || false,
    });

    // Add the employee to the department's employees array
    await Department.findByIdAndUpdate(department, {
      $push: { employees: employee._id },
    });

    // Respond with the employee details (excluding the password)
    res.status(201).json({
      _id: employee.id,
      name: employee.name,
      email: employee.email,
      department: employee.department,
      overtimeHoursPrice: employee.overtimeHoursPrice,
      photo: employee.photo,
      isAdmin: employee.isAdmin,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Login employee
const loginEmployee = async (req, res) => {
  const { email, password } = req.body;

  try {
    const employee = await Employee.findOne({ email }).populate({
      path: "department",
      select: "_id name",
    });

    if (employee && (await bcrypt.compare(password, employee.password))) {
      const token = jwt.sign(
        { id: employee._id, isAdmin: employee.isAdmin },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
      );

      res.json({
        _id: employee.id,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        overtimeHoursPrice: employee.overtimeHoursPrice,
        photo: employee.photo,
        isAdmin: employee.isAdmin,
        token,
      });
    } else {
      res.status(401);
      throw new Error("Invalid email or password");
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all employees (admin-only)
const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({})
      .select("-password")
      .populate("department", "name"); // Exclude passwords from the response
    res.status(200).json(employees);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete an employee (admin-only)
const deleteEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    const employee = await Employee.findById(id);

    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }

    await Employee.deleteOne({ _id: id });
    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update an employee (admin-only)

const updateEmployee = async (req, res) => {
  const { id } = req.params;

  const { name, email, password, department, overtimeHoursPrice, isAdmin } =
    req.body;

  try {
    const employee = await Employee.findById(id);

    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }

    // Update only the fields provided in the request body
    if (name !== undefined) employee.name = name;
    if (email !== undefined) employee.email = email;
    if (department !== undefined) employee.department = department;
    if (overtimeHoursPrice !== undefined)
      employee.overtimeHoursPrice = overtimeHoursPrice;
    if (isAdmin !== undefined) employee.isAdmin = isAdmin;

    // Handle password update if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      employee.password = await bcrypt.hash(password, salt);
    }

    // Handle photo upload
    if (req.file) {
      const photoPath = path.join(__dirname, "../uploads", req.file.filename);

      // Delete the old photo if it exists
      if (employee.photo) {
        const oldPhotoPath = path.join(__dirname, "../uploads", employee.photo);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }

      // Save new photo
      employee.photo = req.file.filename;
    }

    const updatedEmployee = await employee.save();

    res.status(200).json({
      _id: updatedEmployee.id,
      name: updatedEmployee.name,
      email: updatedEmployee.email,
      department: updatedEmployee.department,
      overtimeHoursPrice: updatedEmployee.overtimeHoursPrice,
      photo: updatedEmployee.photo,
      isAdmin: updatedEmployee.isAdmin,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Validate Token
const validateToken = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from headers

  if (!token) {
    console.log("NOTOKEN");
    return res.status(401).json({ valid: false, message: "No token provided" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if the user still exists in the database
    const user = await Employee.findById(decoded.id).populate({
      path: "department",
      select: "_id name", // Only include _id and name fields
    });

    if (!user) {
      return res.status(401).json({ valid: false, message: "User not found" });
    }

    // Token is valid and user exists
    res.status(200).json({ valid: true, user });
  } catch (error) {
    console.error("Error:", error); // Debugging log
    res.status(401).json({ valid: false, message: "Invalid token" });
  }
};

module.exports = {
  registerEmployee,
  loginEmployee,
  getAllEmployees, // Export the new function
  deleteEmployee,
  updateEmployee,
  validateToken,
};
