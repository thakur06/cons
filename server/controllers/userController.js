const db = require('../config/db');
const memoryStore = require('../config/memoryStore');

/**
 * List all users with roles (Admin only)
 */
const listUsers = async (req, res) => {
  try {
    let userList = [];
    if (db.isPgConnected()) {
      const result = await db.query(
        `SELECT u.id, u.name, u.email, u.role_id, r.name as role_name, u.created_at 
         FROM "user" u 
         JOIN roles r ON u.role_id = r.id 
         ORDER BY u.created_at DESC`
      );
      userList = result.rows;
    } else {
      userList = memoryStore.users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role_id: u.role_id,
        role_name: u.role_name,
        created_at: u.created_at
      }));
    }

    return res.json({ users: userList });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Server error listing users.' });
  }
};

/**
 * Update user role (Admin only)
 */
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role_id } = req.body;

    if (!role_id) {
      return res.status(400).json({ error: 'role_id is required.' });
    }

    const newRoleId = parseInt(role_id, 10);

    if (db.isPgConnected()) {
      const roleCheck = await db.query('SELECT name FROM roles WHERE id = $1', [newRoleId]);
      if (roleCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid role_id.' });
      }

      const result = await db.query(
        'UPDATE "user" SET role_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, role_id',
        [newRoleId, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }

      return res.json({
        message: 'User role updated successfully!',
        user: { ...result.rows[0], role_name: roleCheck.rows[0].name }
      });
    } else {
      const user = memoryStore.findUserById(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const role = memoryStore.findRoleById(newRoleId);
      if (!role) {
        return res.status(400).json({ error: 'Invalid role_id.' });
      }

      user.role_id = newRoleId;
      user.role_name = role.name;

      return res.json({
        message: 'User role updated successfully!',
        user: { id: user.id, name: user.name, email: user.email, role_id: user.role_id, role_name: user.role_name }
      });
    }
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Server error updating role.' });
  }
};

/**
 * Get dashboard stats
 */
const getStats = async (req, res) => {
  try {
    let totalFiles = 0;
    let totalSize = 0;
    let pdfCount = 0;
    let docxCount = 0;
    let totalUsers = 0;

    if (db.isPgConnected()) {
      const filesRes = await db.query('SELECT mime_type, file_size FROM files');
      totalFiles = filesRes.rows.length;
      filesRes.rows.forEach(f => {
        totalSize += parseInt(f.file_size || '0', 10);
        if (f.mime_type === 'application/pdf') pdfCount++;
        else docxCount++;
      });

      const userRes = await db.query('SELECT COUNT(*) as count FROM "user"');
      totalUsers = parseInt(userRes.rows[0].count, 10);
    } else {
      totalFiles = memoryStore.files.length;
      memoryStore.files.forEach(f => {
        totalSize += f.file_size;
        if (f.mime_type === 'application/pdf') pdfCount++;
        else docxCount++;
      });
      totalUsers = memoryStore.users.length;
    }

    return res.json({
      total_files: totalFiles,
      total_size_bytes: totalSize,
      total_size_mb: (totalSize / (1024 * 1024)).toFixed(2),
      pdf_count: pdfCount,
      docx_count: docxCount,
      total_users: totalUsers
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Server error fetching stats.' });
  }
};

module.exports = {
  listUsers,
  updateUserRole,
  getStats
};
