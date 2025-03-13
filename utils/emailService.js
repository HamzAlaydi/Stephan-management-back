// utils/emailService.js
const nodemailer = require("nodemailer");
require("dotenv").config(); // Ensure this line is at the very top

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "hamza.alaydi.99@gmail.com",
    pass: "utnj szyz fvop fnxt",
  },
});

/**
 * Sends an email with support for HTML and attachments.
 *
 * @param {string} to - Recipient email.
 * @param {string} subject - Email subject.
 * @param {string} content - Email content (HTML or text).
 * @param {boolean} isHTML - If true, send email as HTML.
 * @param {Array} attachments - List of attachments [{ filename, path }].
 */
const sendEmail = async (
  to,
  subject,
  htmlContent,
  content,
  isHTML = false,
  attachments = []
) => {
  try {
    console.log({ to });

    const mailOptions = {
      from: `"Stephan Maintenance Management System" <${process.env.MAIL}>`, // More professional sender name
      to,
      subject,
      [isHTML ? "html" : "text"]: content, // Dynamically switch between HTML & text
      attachments, // Attachments support
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.response);
    return info;
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw error;
  }
};

module.exports = sendEmail;
