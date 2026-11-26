const multer = require('multer');
const path = require('path');

// Memory storage to process buffer before uploading to S3 or disk
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.pdf', '.docx', '.doc', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.webp'];

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type! Allowed files include PDF, DOCX, DOC, XLSX, XLS, and image photographs (JPG, PNG, WEBP).'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 35 * 1024 * 1024 // 35 MB max limit
  }
});

module.exports = upload;
