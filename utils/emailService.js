// utils/emailService.js
const nodemailer = require("nodemailer");
require("dotenv").config(); // Ensure this line is at the very top
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL,
    pass: process.env.MAIL_PASSWORD,
  },
});

const sendEmail = (to, subject, text) => {
  console.log(process.env.MAIL);
  console.log(process.env.MAIL_PASSWORD);
  console.log(to);

  const mailOptions = {
    from: process.env.MAIL,
    to,
    subject,
    text,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });

  return console.log("send email");
};

module.exports = sendEmail;
