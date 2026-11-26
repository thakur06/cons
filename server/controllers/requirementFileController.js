const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const memoryStore = require('../config/memoryStore');
const s3Service = require('../services/s3Service');

/**
 * Upload one or more files attached to a specific requirement
 */
const uploadRequirementFile = async (req, res) => {
  try {
    const incomingFiles = [];
    if (Array.isArray(req.files) && req.files.length > 0) {
      incomingFiles.push(...req.files);
    } else if (req.file) {
      incomingFiles.push(req.file);
    }
    if (incomingFiles.length === 0) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const { requirementId } = req.params;
    const userId = req.user.id;

    // Verify requirement exists once before uploading files
    if (db.isPgConnected()) {
      const req_check = await db.query('SELECT id FROM requirements WHERE id = $1', [requirementId]);
      if (!req_check.rows.length) return res.status(404).json({ error: 'Requirement not found.' });
    } else {
      const req_check = memoryStore.findRequirementById(requirementId);
      if (!req_check) return res.status(404).json({ error: 'Requirement not found.' });
    }

    const savedFiles = [];
    for (const f of incomingFiles) {
      const { originalname, buffer, mimetype, size } = f;
      const ext = path.extname(originalname);
      const baseName = path.basename(originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      const s3Key = `req-files/${Date.now()}-${uuidv4()}-${baseName}${ext}`;

      const s3Result = await s3Service.uploadToS3({ buffer, originalName: originalname, mimeType: mimetype, key: s3Key });

      let savedFile;
      if (db.isPgConnected()) {
        const result = await db.query(
          `INSERT INTO requirement_files
            (requirement_id, file_name, original_name, mime_type, file_size, s3_key, s3_bucket, is_local, uploaded_by, uploader_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [requirementId, baseName + ext, originalname, mimetype, size,
           s3Result.s3Key, s3Result.s3Bucket, s3Result.isLocal, userId, req.user.name]
        );
        savedFile = result.rows[0];
      } else {
        savedFile = memoryStore.addRequirementFile({
          requirement_id: requirementId,
          file_name: baseName + ext,
          original_name: originalname,
          mime_type: mimetype,
          file_size: size,
          s3_key: s3Result.s3Key,
          s3_bucket: s3Result.s3Bucket,
          is_local: s3Result.isLocal,
          uploaded_by: userId,
          uploader_name: req.user.name
        });
      }

      const view_url = await s3Service.getPresignedViewUrl(savedFile.s3_key, savedFile.original_name, savedFile.is_local);
      const download_url = await s3Service.getPresignedDownloadUrl(savedFile.s3_key, savedFile.original_name, savedFile.is_local);
      savedFiles.push({ ...savedFile, uploader_name: req.user.name, view_url, download_url });
    }

    return res.status(201).json({
      message: `${savedFiles.length} file${savedFiles.length > 1 ? 's' : ''} uploaded successfully.`,
      file: savedFiles[0],
      files: savedFiles
    });
  } catch (err) {
    console.error('uploadRequirementFile error:', err);
    return res.status(500).json({ error: 'Failed to upload file.' });
  }
};

/**
 * List files for a requirement with presigned URLs
 */
const getRequirementFiles = async (req, res) => {
  try {
    const { requirementId } = req.params;
    let rows = [];

    if (db.isPgConnected()) {
      const result = await db.query(
        `SELECT rf.*, 
                COALESCE(rf.uploader_name, u.name) as uploader_name, 
                u.email as uploader_email,
                rv.name as reviewer_name
         FROM requirement_files rf
         LEFT JOIN "user" u ON rf.uploaded_by = u.id
         LEFT JOIN "user" rv ON rf.reviewed_by = rv.id
         WHERE rf.requirement_id = $1
         ORDER BY rf.created_at DESC`,
        [requirementId]
      );
      rows = result.rows;
    } else {
      rows = memoryStore.getFilesByRequirement(requirementId).map(rf => {
        const u = memoryStore.findUserById(rf.uploaded_by);
        const rv = rf.reviewed_by ? memoryStore.findUserById(rf.reviewed_by) : null;
        return {
          ...rf,
          uploader_name: rf.uploader_name || (u ? u.name : 'Vendor / Recipient'),
          uploader_email: u ? u.email : null,
          reviewer_name: rv ? rv.name : null
        };
      });
    }

    const filesWithUrls = await Promise.all(
      rows.map(async (file) => {
        const view_url = await s3Service.getPresignedViewUrl(file.s3_key, file.original_name, file.is_local);
        const download_url = await s3Service.getPresignedDownloadUrl(file.s3_key, file.original_name, file.is_local);
        return { ...file, view_url, download_url };
      })
    );

    return res.json({ files: filesWithUrls });
  } catch (err) {
    console.error('getRequirementFiles error:', err);
    return res.status(500).json({ error: 'Failed to fetch files.' });
  }
};

/**
 * Mark a requirement file as completed (Admin only)
 */
const markFileComplete = async (req, res) => {
  try {
    if (req.user.role_name !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can mark files as completed.' });
    }
    const { id } = req.params;

    if (db.isPgConnected()) {
      const check = await db.query('SELECT id FROM requirement_files WHERE id = $1', [id]);
      if (!check.rows.length) return res.status(404).json({ error: 'File not found.' });

      const result = await db.query(
        `UPDATE requirement_files
         SET status = 'completed', reviewed_by = $1, reviewed_at = NOW()
         WHERE id = $2 RETURNING *`,
        [req.user.id, id]
      );
      return res.json({ message: 'File marked as completed.', file: result.rows[0] });
    } else {
      const updated = memoryStore.updateRequirementFile(id, {
        status: 'completed',
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString()
      });
      if (!updated) return res.status(404).json({ error: 'File not found.' });
      return res.json({ message: 'File marked as completed.', file: updated });
    }
  } catch (err) {
    console.error('markFileComplete error:', err);
    return res.status(500).json({ error: 'Failed to update file status.' });
  }
};

/**
 * Delete a requirement file (Admin or uploader)
 */
const deleteRequirementFile = async (req, res) => {
  try {
    const { id } = req.params;

    if (db.isPgConnected()) {
      const result = await db.query('SELECT * FROM requirement_files WHERE id = $1', [id]);
      if (!result.rows.length) return res.status(404).json({ error: 'File not found.' });

      const file = result.rows[0];
      if (req.user.role_name !== 'Admin' && file.uploaded_by !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to delete this file.' });
      }

      await s3Service.deleteFromS3(file.s3_key, file.is_local);
      await db.query('DELETE FROM requirement_files WHERE id = $1', [id]);
      return res.json({ message: 'File deleted.' });
    } else {
      const file = memoryStore.requirementFiles.find(rf => rf.id === id);
      if (!file) return res.status(404).json({ error: 'File not found.' });

      if (req.user.role_name !== 'Admin' && file.uploaded_by !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to delete this file.' });
      }

      await s3Service.deleteFromS3(file.s3_key, file.is_local);
      memoryStore.deleteRequirementFileById(id);
      return res.json({ message: 'File deleted.' });
    }
  } catch (err) {
    console.error('deleteRequirementFile error:', err);
    return res.status(500).json({ error: 'Failed to delete file.' });
  }
};

module.exports = {
  uploadRequirementFile,
  getRequirementFiles,
  markFileComplete,
  deleteRequirementFile
};
