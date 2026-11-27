const crypto = require('crypto');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const memoryStore = require('../config/memoryStore');
const s3Service = require('../services/s3Service');
const { sanitizeFilename, safeCompare, hashOtp } = require('../middleware/securityMiddleware');

/**
 * Generate a new One-Time Shareable Link with a random OTP
 */
const createShareLink = async (req, res) => {
  try {
    const {
      title,
      recipient_name,
      recipient_email,
      notes,
      expiresInHours = 24,
      project_id,
      package_id,
      requirement_id,
      project_name,
      skid_name,
      component_name,
      format_of_record,
      allow_multiple = true
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title / purpose for the upload is required.' });
    }

    const userId = req.user.id;
    const userName = req.user.name;

    // Generate cryptographically secure random token (URL slug)
    const token = crypto.randomBytes(16).toString('hex');

    // Generate cryptographically secure 6-digit random OTP passcode
    const otp = Math.floor(100000 + crypto.randomInt(900000)).toString();
    const otpHash = hashOtp(otp);

    // Calculate expiration timestamp
    const durationHours = Math.min(Math.max(1, parseInt(expiresInHours, 10) || 24), 168); // Between 1 hour and 7 days
    const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();

    let createdRecord;

    if (db.isPgConnected()) {
      const result = await db.query(
        `INSERT INTO share_upload_links 
         (token, otp_hash, otp_display, title, recipient_name, recipient_email, notes, created_by, expires_at, status,
          project_id, package_id, requirement_id, project_name, skid_name, component_name, format_of_record, allow_multiple, uploaded_files)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11, $12, $13, $14, $15, $16, $17, '[]')
         RETURNING *`,
        [
          token,
          otpHash,
          otp,
          title.trim(),
          recipient_name ? recipient_name.trim() : null,
          recipient_email ? recipient_email.trim() : null,
          notes ? notes.trim() : null,
          userId,
          expiresAt,
          project_id || null,
          package_id || null,
          requirement_id || null,
          project_name ? project_name.trim() : null,
          skid_name ? skid_name.trim() : null,
          component_name ? component_name.trim() : null,
          format_of_record ? format_of_record.trim() : null,
          allow_multiple !== false
        ]
      );
      createdRecord = result.rows[0];
    } else {
      createdRecord = memoryStore.createShareLink({
        token,
        otp_hash: otpHash,
        otp_display: otp,
        title: title.trim(),
        recipient_name: recipient_name ? recipient_name.trim() : null,
        recipient_email: recipient_email ? recipient_email.trim() : null,
        notes: notes ? notes.trim() : null,
        created_by: userId,
        creator_name: userName,
        expires_at: expiresAt,
        project_id: project_id || null,
        package_id: package_id || null,
        requirement_id: requirement_id || null,
        project_name: project_name || null,
        skid_name: skid_name || null,
        component_name: component_name || null,
        format_of_record: format_of_record || null,
        allow_multiple: allow_multiple !== false,
        uploaded_files: []
      });
    }

    return res.status(201).json({
      message: 'One-time upload link generated successfully!',
      link: {
        id: createdRecord.id,
        token: createdRecord.token,
        otp: otp, // Return plaintext OTP once upon creation for the creator to share
        title: createdRecord.title,
        recipient_name: createdRecord.recipient_name,
        expires_at: createdRecord.expires_at,
        project_name: createdRecord.project_name,
        skid_name: createdRecord.skid_name,
        component_name: createdRecord.component_name,
        format_of_record: createdRecord.format_of_record,
        status: 'active'
      }
    });
  } catch (err) {
    console.error('Error creating share link:', err);
    return res.status(500).json({ error: 'Failed to generate one-time share link.' });
  }
};

/**
 * List all share links created by the current user
 */
const listMyShareLinks = async (req, res) => {
  try {
    const userId = req.user.id;
    let links = [];

    if (db.isPgConnected()) {
      // Check and update expired links
      await db.query(
        `UPDATE share_upload_links 
         SET status = 'expired' 
         WHERE status = 'active' AND expires_at < CURRENT_TIMESTAMP`
      );

      const result = await db.query(
        `SELECT l.*, f.original_name as file_original_name, f.file_size as file_size, f.mime_type
         FROM share_upload_links l
         LEFT JOIN files f ON l.uploaded_file_id = f.id
         WHERE l.created_by = $1
         ORDER BY l.created_at DESC`,
        [userId]
      );
      links = result.rows;
    } else {
      const now = new Date();
      links = memoryStore.listShareLinksByUser(userId).map(l => {
        if (l.status === 'active' && new Date(l.expires_at) < now) {
          l.status = 'expired';
        }
        let fileDetails = null;
        if (l.uploaded_file_id) {
          fileDetails = memoryStore.files.find(f => f.id === l.uploaded_file_id);
        }
        return {
          ...l,
          file_original_name: fileDetails ? fileDetails.original_name : l.uploaded_file_name,
          file_size: fileDetails ? fileDetails.file_size : null,
          mime_type: fileDetails ? fileDetails.mime_type : null
        };
      });
      // Sort desc
      links.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return res.json({ links });
  } catch (err) {
    console.error('Error fetching share links:', err);
    return res.status(500).json({ error: 'Failed to load share links.' });
  }
};

/**
 * Revoke an active share link
 */
const revokeShareLink = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role_name === 'Admin';

    let link = null;

    if (db.isPgConnected()) {
      const checkRes = await db.query('SELECT * FROM share_upload_links WHERE id = $1', [id]);
      if (checkRes.rows.length === 0) return res.status(404).json({ error: 'Share link not found.' });
      link = checkRes.rows[0];

      if (!isAdmin && link.created_by !== userId) {
        return res.status(403).json({ error: 'You do not have permission to revoke this link.' });
      }

      await db.query(`UPDATE share_upload_links SET status = 'revoked' WHERE id = $1`, [id]);
    } else {
      link = memoryStore.findShareLinkById(id);
      if (!link) return res.status(404).json({ error: 'Share link not found.' });

      if (!isAdmin && link.created_by !== userId) {
        return res.status(403).json({ error: 'You do not have permission to revoke this link.' });
      }

      memoryStore.updateShareLink(id, { status: 'revoked' });
    }

    return res.json({ message: 'Share link revoked successfully.' });
  } catch (err) {
    console.error('Error revoking share link:', err);
    return res.status(500).json({ error: 'Failed to revoke link.' });
  }
};

/**
 * Delete a share link record
 */
const deleteShareLink = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role_name === 'Admin';

    if (db.isPgConnected()) {
      const checkRes = await db.query('SELECT * FROM share_upload_links WHERE id = $1', [id]);
      if (checkRes.rows.length === 0) return res.status(404).json({ error: 'Share link not found.' });
      const link = checkRes.rows[0];

      if (!isAdmin && link.created_by !== userId) {
        return res.status(403).json({ error: 'Forbidden.' });
      }

      await db.query('DELETE FROM share_upload_links WHERE id = $1', [id]);
    } else {
      const link = memoryStore.findShareLinkById(id);
      if (!link) return res.status(404).json({ error: 'Share link not found.' });

      if (!isAdmin && link.created_by !== userId) {
        return res.status(403).json({ error: 'Forbidden.' });
      }

      memoryStore.deleteShareLink(id);
    }

    return res.json({ message: 'Share link deleted successfully.' });
  } catch (err) {
    console.error('Error deleting share link:', err);
    return res.status(500).json({ error: 'Failed to delete share link.' });
  }
};

/**
 * Public Info Endpoint for Recipient
 * Checks if link is valid, active, expired, or already used
 */
const getShareLinkInfo = async (req, res) => {
  try {
    const { token } = req.params;

    let link = null;
    let creatorName = 'Vault User';

    if (db.isPgConnected()) {
      const result = await db.query(
        `SELECT l.*, u.name as creator_name 
         FROM share_upload_links l 
         JOIN "user" u ON l.created_by = u.id 
         WHERE l.token = $1`,
        [token]
      );
      if (result.rows.length > 0) {
        link = result.rows[0];
        creatorName = link.creator_name;
      }
    } else {
      link = memoryStore.findShareLinkByToken(token);
      if (link) {
        const creator = memoryStore.findUserById(link.created_by);
        creatorName = creator ? creator.name : (link.creator_name || 'Vault User');
      }
    }

    if (!link) {
      return res.status(404).json({
        valid: false,
        status: 'not_found',
        error: 'This upload link does not exist or has been removed.'
      });
    }

    // Check expiration
    const isExpired = new Date(link.expires_at) < new Date();
    if (isExpired && link.status === 'active') {
      link.status = 'expired';
      if (db.isPgConnected()) {
        await db.query(`UPDATE share_upload_links SET status = 'expired' WHERE id = $1`, [link.id]);
      } else {
        memoryStore.updateShareLink(link.id, { status: 'expired' });
      }
    }

    // Lookup component metadata if linked to a requirement
    let componentDetails = null;
    if (link.requirement_id) {
      if (db.isPgConnected()) {
        const reqRow = await db.query('SELECT * FROM requirements WHERE id = $1', [link.requirement_id]);
        if (reqRow.rows.length > 0) componentDetails = reqRow.rows[0];
      } else {
        componentDetails = memoryStore.findRequirementById(link.requirement_id);
      }
    }

    if (link.status === 'used') {
      return res.json({
        valid: false,
        status: 'used',
        used_at: link.used_at,
        uploaded_file_name: link.uploaded_file_name,
        uploaded_files: link.uploaded_files || [],
        project_name: link.project_name,
        skid_name: link.skid_name,
        component_name: link.component_name,
        format_of_record: link.format_of_record,
        message: 'This one-time upload link has already received records and is closed.'
      });
    }

    if (link.status === 'expired') {
      return res.json({
        valid: false,
        status: 'expired',
        expires_at: link.expires_at,
        message: 'This upload link has expired.'
      });
    }

    if (link.status === 'revoked') {
      return res.json({
        valid: false,
        status: 'revoked',
        message: 'This upload link has been cancelled by the sender.'
      });
    }

    if (link.status === 'locked') {
      return res.json({
        valid: false,
        status: 'locked',
        message: 'This upload link was locked due to too many failed passcode attempts.'
      });
    }

    // Link is active and valid
    return res.json({
      valid: true,
      status: 'active',
      title: link.title,
      recipient_name: link.recipient_name,
      notes: link.notes,
      creator_name: creatorName,
      expires_at: link.expires_at,
      project_name: link.project_name,
      skid_name: link.skid_name,
      component_name: link.component_name,
      format_of_record: link.format_of_record,
      allow_multiple: link.allow_multiple !== false,
      component_details: componentDetails,
      allowed_types: ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.jpg', '.jpeg', '.png'],
      max_size_mb: 35
    });
  } catch (err) {
    console.error('Error fetching share link info:', err);
    return res.status(500).json({ error: 'Server error checking upload link.' });
  }
};

/**
 * Public OTP Verification Endpoint
 */
const verifyOtp = async (req, res) => {
  try {
    const { token } = req.params;
    const { otp } = req.body;

    if (!otp || typeof otp !== 'string') {
      return res.status(400).json({ error: 'Please enter the 6-digit one-time passcode.' });
    }

    let link = null;

    if (db.isPgConnected()) {
      const result = await db.query('SELECT * FROM share_upload_links WHERE token = $1', [token]);
      if (result.rows.length > 0) link = result.rows[0];
    } else {
      link = memoryStore.findShareLinkByToken(token);
    }

    if (!link) {
      return res.status(404).json({ error: 'Upload link not found.' });
    }

    if (link.status !== 'active') {
      return res.status(400).json({ error: `This upload link is no longer active (status: ${link.status}).` });
    }

    if (new Date(link.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This upload link has expired.' });
    }

    if ((link.failed_attempts || 0) >= 5) {
      if (db.isPgConnected()) {
        await db.query(`UPDATE share_upload_links SET status = 'locked' WHERE id = $1`, [link.id]);
      } else {
        memoryStore.updateShareLink(link.id, { status: 'locked' });
      }
      return res.status(403).json({ error: 'Too many incorrect attempts. This link has been locked for security.' });
    }

    // Verify OTP securely
    const hashedInput = hashOtp(otp);
    const isMatch = safeCompare(hashedInput, link.otp_hash);

    if (!isMatch) {
      const newAttempts = (link.failed_attempts || 0) + 1;
      const remaining = Math.max(0, 5 - newAttempts);

      if (db.isPgConnected()) {
        await db.query(
          `UPDATE share_upload_links SET failed_attempts = $1, status = CASE WHEN $1 >= 5 THEN 'locked' ELSE status END WHERE id = $2`,
          [newAttempts, link.id]
        );
      } else {
        memoryStore.updateShareLink(link.id, {
          failed_attempts: newAttempts,
          status: newAttempts >= 5 ? 'locked' : link.status
        });
      }

      if (remaining === 0) {
        return res.status(403).json({ error: 'Maximum passcode attempts reached. Link is now locked.' });
      }

      return res.status(401).json({
        error: `Incorrect one-time passcode. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        remaining_attempts: remaining
      });
    }

    return res.json({
      success: true,
      verified: true,
      message: 'Passcode verified successfully! You can now select and upload your file(s).'
    });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    return res.status(500).json({ error: 'Server error during passcode verification.' });
  }
};

/**
 * Public File Upload Endpoint via One-Time Share Link
 * Can upload single or multiple files!
 */
const uploadViaShareLink = async (req, res) => {
  try {
    const { token } = req.params;
    const { otp, uploader_name } = req.body;

    // Collect all uploaded files (supports req.files or req.file)
    let filesList = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      filesList = req.files;
    } else if (req.file) {
      filesList = [req.file];
    } else if (req.files && typeof req.files === 'object') {
      // If multer gave keyed object
      Object.values(req.files).forEach(fList => {
        if (Array.isArray(fList)) filesList.push(...fList);
        else if (fList) filesList.push(fList);
      });
    }

    if (!filesList.length) {
      return res.status(400).json({ error: 'No file selected. Please choose files to upload.' });
    }

    if (!otp || typeof otp !== 'string') {
      return res.status(400).json({ error: 'One-time passcode is required to complete upload.' });
    }

    let link = null;

    if (db.isPgConnected()) {
      const result = await db.query('SELECT * FROM share_upload_links WHERE token = $1', [token]);
      if (result.rows.length > 0) link = result.rows[0];
    } else {
      link = memoryStore.findShareLinkByToken(token);
    }

    if (!link) {
      return res.status(404).json({ error: 'Upload link not found.' });
    }

    // STRICT CHECK: Link can be used ONLY ONCE!
    if (link.status === 'used') {
      return res.status(410).json({
        error: 'This upload link has already been used and cannot accept any more uploads.'
      });
    }

    if (link.status !== 'active') {
      return res.status(400).json({ error: `This upload link is inactive (status: ${link.status}).` });
    }

    if (new Date(link.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This upload link has expired.' });
    }

    // Verify OTP again at upload moment to ensure authenticity
    const hashedInput = hashOtp(otp);
    if (!safeCompare(hashedInput, link.otp_hash)) {
      return res.status(401).json({ error: 'Invalid one-time passcode.' });
    }

    const effectiveUploader = (uploader_name && uploader_name.trim()) || link.recipient_name || 'Vendor / Recipient via One-Time Link';
    const uploadedRecords = [];

    // Process each uploaded file
    for (const file of filesList) {
      const { originalname, buffer, mimetype, size } = file;
      const safeOriginalName = sanitizeFilename(originalname);
      const ext = path.extname(safeOriginalName);
      const baseName = path.basename(safeOriginalName, ext);
      const s3Key = `uploads/share_${Date.now()}_${uuidv4().slice(0, 8)}_${baseName}${ext}`;

      // Upload to S3 or local fallback
      const s3Result = await s3Service.uploadToS3({
        buffer,
        originalName: safeOriginalName,
        mimeType: mimetype,
        key: s3Key
      });

      if (db.isPgConnected()) {
        // Insert into files
        const fileRes = await db.query(
          `INSERT INTO files (file_name, original_name, mime_type, file_size, s3_key, s3_bucket, is_local, uploaded_by) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           RETURNING *`,
          [
            baseName + ext,
            safeOriginalName,
            mimetype,
            size,
            s3Result.s3Key,
            s3Result.s3Bucket,
            s3Result.isLocal,
            link.created_by
          ]
        );
        const savedFile = fileRes.rows[0];

        // If this link was generated for a project Skid Component (requirement_id), attach to requirement_files!
        if (link.requirement_id) {
          await db.query(
            `INSERT INTO requirement_files
             (requirement_id, file_name, original_name, mime_type, file_size, s3_key, s3_bucket, is_local, uploaded_by, uploader_name, share_link_id, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')`,
            [
              link.requirement_id,
              baseName + ext,
              safeOriginalName,
              mimetype,
              size,
              s3Result.s3Key,
              s3Result.s3Bucket,
              s3Result.isLocal,
              link.created_by,
              effectiveUploader,
              link.id
            ]
          );
        }

        uploadedRecords.push({
          id: savedFile.id,
          original_name: safeOriginalName,
          file_size: size,
          mime_type: mimetype,
          s3_key: s3Result.s3Key
        });
      } else {
        // Memory Store
        const savedFile = memoryStore.addFile({
          file_name: baseName + ext,
          original_name: safeOriginalName,
          mime_type: mimetype,
          file_size: size,
          s3_key: s3Result.s3Key,
          s3_bucket: s3Result.s3Bucket,
          is_local: s3Result.isLocal,
          uploaded_by: link.created_by,
          source: 'one_time_share',
          uploader_display_name: effectiveUploader
        });

        if (link.requirement_id) {
          memoryStore.addRequirementFile({
            requirement_id: link.requirement_id,
            file_name: baseName + ext,
            original_name: safeOriginalName,
            mime_type: mimetype,
            file_size: size,
            s3_key: s3Result.s3Key,
            s3_bucket: s3Result.s3Bucket,
            is_local: s3Result.isLocal,
            uploaded_by: link.created_by,
            uploader_name: effectiveUploader,
            share_link_id: link.id,
            status: 'pending'
          });
        }

        uploadedRecords.push({
          id: savedFile.id,
          original_name: safeOriginalName,
          file_size: size,
          mime_type: mimetype,
          s3_key: s3Result.s3Key
        });
      }
    }

    const allFileNames = uploadedRecords.map(f => f.original_name).join(', ');
    const primaryFileId = uploadedRecords[0]?.id;

    if (db.isPgConnected()) {
      // Mark link as USED and record uploaded files
      await db.query(
        `UPDATE share_upload_links 
         SET status = 'used', 
             used_at = CURRENT_TIMESTAMP, 
             uploaded_file_id = $1, 
             uploaded_file_name = $2, 
             uploaded_files = $3,
             uploader_name = $4
         WHERE id = $5`,
        [primaryFileId, allFileNames, JSON.stringify(uploadedRecords), effectiveUploader, link.id]
      );

      // Record activity log
      await db.query(
        `INSERT INTO activity_logs (user_id, action, file_id, details) 
         VALUES ($1, $2, $3, $4)`,
        [
          link.created_by,
          'ONE_TIME_SHARE_UPLOAD',
          primaryFileId,
          `${uploadedRecords.length} document(s) uploaded by ${effectiveUploader} via one-time link (${link.title}).`
        ]
      );
    } else {
      memoryStore.updateShareLink(link.id, {
        status: 'used',
        used_at: new Date().toISOString(),
        uploaded_file_id: primaryFileId,
        uploaded_file_name: allFileNames,
        uploaded_files: uploadedRecords,
        uploader_name: effectiveUploader
      });
    }

    return res.status(201).json({
      success: true,
      message: `Successfully uploaded ${uploadedRecords.length} file(s)! This upload link has now been completed and closed.`,
      files: uploadedRecords,
      component_name: link.component_name,
      format_of_record: link.format_of_record,
      skid_name: link.skid_name,
      project_name: link.project_name
    });
  } catch (err) {
    console.error('Error during one-time file upload:', err);
    return res.status(500).json({ error: 'Server error while processing uploaded files.' });
  }
};

module.exports = {
  createShareLink,
  listMyShareLinks,
  revokeShareLink,
  deleteShareLink,
  getShareLinkInfo,
  verifyOtp,
  uploadViaShareLink
};
