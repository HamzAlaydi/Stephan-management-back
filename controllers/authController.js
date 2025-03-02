// controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Employee = require("../models/Employee");
const Department = require("../models/Department");
const multer = require("multer");
const path = require("path");
const {
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = require("../config/s3Config");

// registerEmployee

const registerEmployee = async (req, res) => {
  try {
    console.log("Request Body:", req.body); // Log the request body
    console.log("Uploaded File:", req.file); // Log the uploaded file

    // Validate required fields
    const requiredFields = ["name", "email", "password", "department"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Destructure and validate input
    const {
      name,
      email,
      password,
      department,
      overtimeHoursPrice = 0,
      isAdmin = "false",
    } = req.body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Check if email already exists
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(409).json({ message: "Email already in use" });
    }

    // Validate department exists
    const departmentExists = await Department.findById(department);
    if (!departmentExists) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Validate overtimeHoursPrice if provided
    if (overtimeHoursPrice && isNaN(parseFloat(overtimeHoursPrice))) {
      return res
        .status(400)
        .json({ message: "Overtime rate must be a number" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Handle photo upload
    const photo = req.file ? req.file.key : null; // Get the S3 key from the uploaded file
    console.log("Photo Key:", photo); // Log the S3 key

    // Create new employee
    const newEmployee = await Employee.create({
      name,
      email,
      password: hashedPassword,
      department,
      overtimeHoursPrice: parseFloat(overtimeHoursPrice),
      isAdmin: isAdmin === "true",
      photo, // Store the S3 key in the database
    });

    // Generate signed URL for photo
    let photoUrl = null;
    if (photo) {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: photo,
      });
      photoUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1-hour expiration
    }

    // Prepare response (exclude sensitive data)
    const employeeResponse = {
      _id: newEmployee._id,
      name: newEmployee.name,
      email: newEmployee.email,
      department: newEmployee.department,
      overtimeHoursPrice: newEmployee.overtimeHoursPrice,
      isAdmin: newEmployee.isAdmin,
      photoUrl, // Include the signed URL in the response
      createdAt: newEmployee.createdAt,
    };

    // Send success response
    res.status(201).json({
      message: "Employee registered successfully",
      employee: employeeResponse,
    });
  } catch (error) {
    console.error("Error in registerEmployee:", error);
    res.status(500).json({
      message: "Server error during registration",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
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

    console.log("Employees from DB:", employees); // Log the employees fetched from the database

    // Generate signed URLs for employee photos
    const employeesWithPhotoUrls = await Promise.all(
      employees.map(async (employee) => {
        console.log("Employee Photo Key:", employee.photo); // Log the photo key for each employee

        let photoUrl = null;
        if (employee.photo) {
          const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: employee.photo, // S3 key stored in the database
          });
          photoUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1-hour expiration
          console.log("Generated Photo URL:", photoUrl); // Log the generated signed URL
        }
        return {
          ...employee.toObject(), // Convert Mongoose document to plain object
          photoUrl, // Add the signed URL to the employee object
        };
      })
    );

    res.status(200).json(employeesWithPhotoUrls);
  } catch (error) {
    console.error("Error in getAllEmployees:", error); // Log the error
    res.status(400).json({ message: error.message });
  }
};

// Delete an employee (admin-only)
const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    // Delete photo from S3 if exists
    if (employee.photo) {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: employee.photo,
        })
      );
    }

    await Employee.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
// controllers/authController.js
const updateEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Update fields from req.body
    if (req.body.name) employee.name = req.body.name;
    if (req.body.email) employee.email = req.body.email;
    if (req.body.department) employee.department = req.body.department;
    if (req.body.overtimeHoursPrice)
      employee.overtimeHoursPrice = req.body.overtimeHoursPrice;
    if (req.body.isAdmin !== undefined) employee.isAdmin = req.body.isAdmin;

    // Handle password update
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      employee.password = await bcrypt.hash(req.body.password, salt);
    }

    // Handle photo upload (processed by multer-s3)
    if (req.file) {
      // Delete old photo from S3
      if (employee.photo) {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: employee.photo,
          })
        );
      }

      // Save new photo key from multer-s3
      employee.photo = req.file.key;
    }

    // Save the updated employee
    const updatedEmployee = await employee.save();

    // Generate signed URL for the new photo
    let photoUrl = null;
    if (updatedEmployee.photo) {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: updatedEmployee.photo,
      });
      photoUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    }

    res.status(200).json({
      _id: updatedEmployee._id,
      name: updatedEmployee.name,
      email: updatedEmployee.email,
      department: updatedEmployee.department,
      overtimeHoursPrice: updatedEmployee.overtimeHoursPrice,
      isAdmin: updatedEmployee.isAdmin,
      photoUrl,
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ message: "Server error during update" });
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
