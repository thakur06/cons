const { v4: uuidv4 } = require('uuid');
const path = require('path');
const db = require('../config/db');
const memoryStore = require('../config/memoryStore');
const s3Service = require('../services/s3Service');

/**
 * Upload PDF or DOCX file to AWS S3 / Local Fallback
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided. Please upload a PDF or DOCX file.' });
    }

    const { originalname, buffer, mimetype, size } = req.file;
    const userId = req.user.id;

    // Sanitize filename and create unique S3 Key
    const ext = path.extname(originalname);
    const baseName = path.basename(originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const s3Key = `uploads/${Date.now()}-${uuidv4()}-${baseName}${ext}`;

    // Upload to S3 or local storage
    const s3Result = await s3Service.uploadToS3({
      buffer,
      originalName: originalname,
      mimeType: mimetype,
      key: s3Key
    });

    let savedFile;

    if (db.isPgConnected()) {
      const result = await db.query(
        `INSERT INTO files (file_name, original_name, mime_type, file_size, s3_key, s3_bucket, is_local, uploaded_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [baseName + ext, originalname, mimetype, size, s3Result.s3Key, s3Result.s3Bucket, s3Result.isLocal, userId]
      );
      savedFile = result.rows[0];
    } else {
      savedFile = memoryStore.addFile({
        file_name: baseName + ext,
        original_name: originalname,
        mime_type: mimetype,
        file_size: size,
        s3_key: s3Result.s3Key,
        s3_bucket: s3Result.s3Bucket,
        is_local: s3Result.isLocal,
        uploaded_by: userId
      });
    }

    // Attach uploader info & URLs
    const viewUrl = await s3Service.getPresignedViewUrl(savedFile.s3_key, savedFile.original_name, savedFile.is_local);
    const downloadUrl = await s3Service.getPresignedDownloadUrl(savedFile.s3_key, savedFile.original_name, savedFile.is_local);

    return res.status(201).json({
      message: 'File uploaded successfully!',
      file: {
        ...savedFile,
        uploader_name: req.user.name,
        view_url: viewUrl,
        download_url: downloadUrl
      }
    });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: 'Server error while uploading file.' });
  }
};

/**
 * List files accessible to user role
 */
const listFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_name;
    const { search, fileType } = req.query;

    let filesList = [];

    if (db.isPgConnected()) {
      let queryText = `
        SELECT f.*, u.name as uploader_name, u.email as uploader_email 
        FROM files f
        JOIN "user" u ON f.uploaded_by = u.id
      `;
      let whereClauses = [];
      let params = [];

      // RBAC: Users see their own files; Admins and Managers see all files
      if (userRole === 'User') {
        params.push(userId);
        whereClauses.push(`f.uploaded_by = $${params.length}`);
      }

      if (search) {
        params.push(`%${search}%`);
        whereClauses.push(`f.original_name ILIKE $${params.length}`);
      }

      if (fileType) {
        if (fileType.toLowerCase() === 'pdf') {
          whereClauses.push(`f.mime_type = 'application/pdf'`);
        } else if (fileType.toLowerCase() === 'docx') {
          whereClauses.push(`(f.mime_type LIKE '%wordprocessingml%' OR f.mime_type LIKE '%msword%')`);
        }
      }

      if (whereClauses.length > 0) {
        queryText += ' WHERE ' + whereClauses.join(' AND ');
      }

      queryText += ' ORDER BY f.created_at DESC';

      const result = await db.query(queryText, params);
      filesList = result.rows;
    } else {
      // Memory Store
      let rawFiles = memoryStore.files;

      if (userRole === 'User') {
        rawFiles = rawFiles.filter(f => f.uploaded_by === userId);
      }

      if (search) {
        rawFiles = rawFiles.filter(f => f.original_name.toLowerCase().includes(search.toLowerCase()));
      }

      if (fileType) {
        if (fileType.toLowerCase() === 'pdf') {
          rawFiles = rawFiles.filter(f => f.mime_type === 'application/pdf');
        } else if (fileType.toLowerCase() === 'docx') {
          rawFiles = rawFiles.filter(f => f.mime_type.includes('wordprocessingml') || f.mime_type.includes('msword'));
        }
      }

      filesList = rawFiles.map(f => {
        const uploader = memoryStore.findUserById(f.uploaded_by);
        return {
          ...f,
          uploader_name: f.uploader_display_name || (uploader ? uploader.name : 'Unknown User'),
          uploader_email: uploader ? uploader.email : '',
          is_share_upload: f.source === 'one_time_share'
        };
      });
    }

    // Attach presigned S3 URLs to each file object
    const filesWithUrls = await Promise.all(
      filesList.map(async (file) => {
        const view_url = await s3Service.getPresignedViewUrl(file.s3_key, file.original_name, file.is_local);
        const download_url = await s3Service.getPresignedDownloadUrl(file.s3_key, file.original_name, file.is_local);
        return {
          ...file,
          view_url,
          download_url
        };
      })
    );

    return res.json({
      files: filesWithUrls,
      count: filesWithUrls.length,
      storage_type: s3Service.isS3Configured ? 'AWS S3 Bucket' : 'Local Storage Fallback'
    });
  } catch (err) {
    console.error('List files error:', err);
    res.status(500).json({ error: 'Server error while fetching files.' });
  }
};

/**
 * Get presigned URL for specific file
 */
const getFilePresignedUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.query; // 'view' or 'download'
    const userId = req.user.id;
    const userRole = req.user.role_name;

    let file = null;

    if (db.isPgConnected()) {
      const result = await db.query('SELECT * FROM files WHERE id = $1', [id]);
      if (result.rows.length > 0) file = result.rows[0];
    } else {
      file = memoryStore.files.find(f => f.id === id);
    }

    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    // Permission check: User can only access own files unless Admin or Manager
    if (userRole === 'User' && file.uploaded_by !== userId) {
      return res.status(403).json({ error: 'Access denied: You do not have permission to view this file.' });
    }

    let url;
    if (action === 'download') {
      url = await s3Service.getPresignedDownloadUrl(file.s3_key, file.original_name, file.is_local);
    } else {
      url = await s3Service.getPresignedViewUrl(file.s3_key, file.original_name, file.is_local);
    }

    return res.json({ url, file });
  } catch (err) {
    console.error('Presigned URL error:', err);
    res.status(500).json({ error: 'Server error generating URL.' });
  }
};

/**
 * Stream local storage file fallback (View inline or Download)
 */
const streamLocalFile = async (req, res) => {
  try {
    const rawParam = req.params[0] || req.params.filename || '';
    const cleanFilename = path.basename(rawParam);
    const disposition = req.query.disposition === 'attachment' ? 'attachment' : 'inline';

    if (!cleanFilename) {
      return res.status(400).json({ error: 'Filename parameter is required.' });
    }

    // Attempt to locate file stream on disk
    let fileResult = s3Service.getLocalFileStream(cleanFilename);
    if (!fileResult && rawParam) {
      fileResult = s3Service.getLocalFileStream(rawParam);
    }

    if (!fileResult) {
      return res.status(404).json({ error: `File '${cleanFilename}' not found on storage.` });
    }

    // Lookup metadata in Database or Memory Store
    let fileRecord = null;
    if (db.isPgConnected()) {
      const resFile = await db.query(
        `SELECT * FROM files WHERE s3_key LIKE $1 OR file_name = $2 LIMIT 1`,
        [`%${cleanFilename}`, cleanFilename]
      );
      if (resFile.rows.length > 0) fileRecord = resFile.rows[0];
    } else {
      fileRecord = memoryStore.files.find(f =>
        f.s3_key?.includes(cleanFilename) ||
        f.file_name === cleanFilename ||
        f.original_name === cleanFilename
      );
    }

    const originalName = fileRecord ? fileRecord.original_name : cleanFilename;

    // Detect exact MIME type
    let mimeType = fileRecord ? fileRecord.mime_type : null;
    const lowerName = originalName.toLowerCase();
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (lowerName.endsWith('.pdf')) {
        mimeType = 'application/pdf';
      } else if (lowerName.endsWith('.docx')) {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (lowerName.endsWith('.doc')) {
        mimeType = 'application/msword';
      } else {
        mimeType = 'application/octet-stream';
      }
    }

    // Set headers for inline preview and download
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(originalName)}"`);
    if (fileResult.size) {
      res.setHeader('Content-Length', fileResult.size);
    }
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.removeHeader('X-Frame-Options'); // Allow browser iframe to render PDF

    fileResult.stream.pipe(res);
  } catch (err) {
    console.error('Stream error:', err);
    res.status(500).json({ error: 'Error streaming file.' });
  }
};

/**
 * Delete File (RBAC: Admin deletes any file, User/Manager deletes own file)
 */
const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_name;

    let file = null;

    if (db.isPgConnected()) {
      const result = await db.query('SELECT * FROM files WHERE id = $1', [id]);
      if (result.rows.length > 0) file = result.rows[0];
    } else {
      file = memoryStore.files.find(f => f.id === id);
    }

    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    // Role-Based Access Control check for Deletion
    if (userRole !== 'Admin' && file.uploaded_by !== userId) {
      return res.status(403).json({ error: 'Forbidden: Only an Admin or the file uploader can delete this file.' });
    }

    // Delete from AWS S3 or Local storage
    await s3Service.deleteFromS3(file.s3_key, file.is_local);

    // Delete from DB / Memory Store
    if (db.isPgConnected()) {
      await db.query('DELETE FROM files WHERE id = $1', [id]);
    } else {
      memoryStore.deleteFile(id);
    }

    return res.json({
      message: `File '${file.original_name}' deleted successfully.`
    });
  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({ error: 'Server error while deleting file.' });
  }
};

module.exports = {
  uploadFile,
  listFiles,
  getFilePresignedUrl,
  streamLocalFile,
  deleteFile
};
