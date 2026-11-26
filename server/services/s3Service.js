const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const region = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.AWS_S3_BUCKET || 'my-pdf-docx-bucket';

const isS3Configured = Boolean(accessKeyId && secretAccessKey && bucketName);

let s3Client = null;

if (isS3Configured) {
  s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
  console.log(`AWS S3 Service initialized for bucket: ${bucketName} (${region})`);
} else {
  console.log('ℹ️ AWS S3 credentials not fully configured in .env. Using local storage fallback directory server/uploads/');
}

// Local storage fallback setup
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Upload file to AWS S3 or fallback to local disk
 */
const uploadToS3 = async ({ buffer, originalName, mimeType, key }) => {
  if (isS3Configured && s3Client) {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ContentDisposition: `inline; filename="${encodeURIComponent(originalName)}"`
    });
    await s3Client.send(command);
    return {
      s3Key: key,
      s3Bucket: bucketName,
      isLocal: false
    };
  } else {
    // Local file fallback
    const localFilePath = path.join(uploadsDir, key);
    await fs.promises.mkdir(path.dirname(localFilePath), { recursive: true });
    await fs.promises.writeFile(localFilePath, buffer);
    return {
      s3Key: key,
      s3Bucket: 'local-storage',
      isLocal: true
    };
  }
};

/**
 * Generate Presigned URL for viewing in browser (inline)
 */
const getPresignedViewUrl = async (key, originalName, isLocal = false) => {
  if (isS3Configured && s3Client && !isLocal) {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      ResponseContentDisposition: `inline; filename="${encodeURIComponent(originalName)}"`
    });
    // URL valid for 1 hour
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  } else {
    // Local route URL: use clean filename
    const port = process.env.PORT || 5101;
    const filename = path.basename(key);
    return `http://localhost:${port}/api/files/stream/${filename}?disposition=inline`;
  }
};

/**
 * Generate Presigned URL for download attachment
 */
const getPresignedDownloadUrl = async (key, originalName, isLocal = false) => {
  if (isS3Configured && s3Client && !isLocal) {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(originalName)}"`
    });
    // URL valid for 1 hour
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  } else {
    const port = process.env.PORT || 5101;
    const filename = path.basename(key);
    return `http://localhost:${port}/api/files/stream/${filename}?disposition=attachment`;
  }
};

/**
 * Delete file object from AWS S3 or local disk
 */
const deleteFromS3 = async (key, isLocal = false) => {
  if (isS3Configured && s3Client && !isLocal) {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key
    });
    await s3Client.send(command);
  } else {
    const filename = path.basename(key);
    const candidates = [
      path.join(uploadsDir, 'uploads', filename),
      path.join(uploadsDir, filename),
      path.join(uploadsDir, key)
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try { await fs.promises.unlink(p); } catch {}
      }
    }
  }
};

/**
 * Get file stream or buffer for local files or S3
 */
const getLocalFileStream = (key) => {
  if (!key) return null;
  const cleanName = path.basename(key);

  // Check candidate locations safely within uploadsDir
  const candidate1 = path.join(uploadsDir, 'uploads', cleanName);
  if (fs.existsSync(candidate1)) {
    return { stream: fs.createReadStream(candidate1), path: candidate1, size: fs.statSync(candidate1).size };
  }

  const candidate2 = path.join(uploadsDir, cleanName);
  if (fs.existsSync(candidate2)) {
    return { stream: fs.createReadStream(candidate2), path: candidate2, size: fs.statSync(candidate2).size };
  }

  const safePath = path.normalize(key).replace(/^(\.\.[\/\\])+/, '');
  const candidate3 = path.resolve(uploadsDir, safePath);
  if (candidate3.startsWith(path.resolve(uploadsDir)) && fs.existsSync(candidate3)) {
    return { stream: fs.createReadStream(candidate3), path: candidate3, size: fs.statSync(candidate3).size };
  }

  return null;
};

module.exports = {
  isS3Configured,
  uploadToS3,
  getPresignedViewUrl,
  getPresignedDownloadUrl,
  deleteFromS3,
  getLocalFileStream
};
