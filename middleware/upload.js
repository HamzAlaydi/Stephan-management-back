// const multer = require("multer");
// const path = require("path");

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "api/uploads/");
//   },
//   filename: (req, file, cb) => {
//     cb(null, `${Date.now()}-${file.originalname}`);
//   },
// });

// const fileFilter = (req, file, cb) => {
//   const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "text/csv"];
//   allowedTypes.includes(file.mimetype)
//     ? cb(null, true)
//     : cb(new Error("Invalid file type"));
// };

// const upload = multer({
//   storage,
//   fileFilter,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
// });

// module.exports = upload;

// import .env

// require("dotenv").config();
// const { S3Client } = require("@aws-sdk/client-s3");
// const { fromIni } = require("@aws-sdk/credential-provider-ini");
// const multer = require("multer");
// const multerS3 = require("multer-s3-v3");

// // Configure S3 client
// const s3 = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

// const upload = multer({
//   storage: multerS3({
//     s3: s3,
//     bucket: process.env.S3_BUCKET_NAME,
//     metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
//     key: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
//   }),
//   fileFilter: (req, file, cb) => {
//     const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "text/csv"];
//     allowedTypes.includes(file.mimetype)
//       ? cb(null, true)
//       : cb(new Error("Invalid file type"));
//   },
//   limits: { fileSize: 5 * 1024 * 1024 },
// });

// module.exports = upload;

const multer = require("multer");
const multerS3 = require("multer-s3-v3");
const s3 = require("../config/s3Config");


const createUpload = (folderName) =>
  multer({
    storage: multerS3({
      s3: s3,
      bucket: process.env.S3_BUCKET_NAME,
      metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
      key: (req, file, cb) =>
        cb(null, `${folderName}/${Date.now()}-${file.originalname}`),
      contentType: multerS3.AUTO_CONTENT_TYPE,
    }),
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/pdf",
      ];
      allowedTypes.includes(file.mimetype)
        ? cb(null, true)
        : cb(new Error("Invalid file type"));
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  });

module.exports = createUpload;

// https://stephano-group-attachments-bucket-ca.s3.
// ca-central-1.amazonaws.com/
// employee-photos/1740932495715_download.jpeg


// https://stephano-group-attachments-bucket-ca.s3.
// ca-central-1.amazonaws.com/
// employee-photos/1740933276204_download.jpeg