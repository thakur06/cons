const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const memoryStore = require('../config/memoryStore');

// ─── PROJECTS ────────────────────────────────────────────────────────────────

const getProjects = async (req, res) => {
  try {
    if (db.isPgConnected()) {
      const result = await db.query(
        `SELECT p.*, u.name as creator_name,
          (SELECT COUNT(*) FROM packages pk WHERE pk.project_id = p.id) as package_count
         FROM projects p
         LEFT JOIN "user" u ON p.created_by = u.id
         ORDER BY p.created_at DESC`
      );
      return res.json({ projects: result.rows });
    } else {
      const list = memoryStore.getProjectsList();
      return res.json({ projects: list });
    }
  } catch (err) {
    console.error('getProjects error:', err);
    return res.status(500).json({ error: 'Failed to fetch projects.' });
  }
};

const createProject = async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Project name is required.' });

    if (db.isPgConnected()) {
      const result = await db.query(
        `INSERT INTO projects (name, code, created_by) VALUES ($1, $2, $3) RETURNING *`,
        [name.trim(), code?.trim() || null, req.user.id]
      );
      return res.status(201).json({ project: result.rows[0] });
    } else {
      const created = memoryStore.addProject({
        name: name.trim(),
        code: code?.trim() || null,
        created_by: req.user.id,
        creator_name: req.user.name
      });
      return res.status(201).json({ project: created });
    }
  } catch (err) {
    console.error('createProject error:', err);
    return res.status(500).json({ error: 'Failed to create project.' });
  }
};

const deleteProject = async (req, res) => {
  try {
    if (req.user.role_name !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can delete projects.' });
    }
    const { id } = req.params;

    if (db.isPgConnected()) {
      const check = await db.query('SELECT id FROM projects WHERE id = $1', [id]);
      if (!check.rows.length) return res.status(404).json({ error: 'Project not found.' });
      await db.query('DELETE FROM projects WHERE id = $1', [id]);
      return res.json({ message: 'Project deleted.' });
    } else {
      const deleted = memoryStore.deleteProjectById(id);
      if (!deleted) return res.status(404).json({ error: 'Project not found.' });
      return res.json({ message: 'Project deleted.' });
    }
  } catch (err) {
    console.error('deleteProject error:', err);
    return res.status(500).json({ error: 'Failed to delete project.' });
  }
};

// ─── PACKAGES / SKIDS ────────────────────────────────────────────────────────

const getPackages = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (db.isPgConnected()) {
      const result = await db.query(
        `SELECT pk.*,
          (SELECT COUNT(*) FROM requirements r WHERE r.package_id = pk.id) as requirement_count
         FROM packages pk
         WHERE pk.project_id = $1
         ORDER BY pk.created_at ASC`,
        [projectId]
      );
      return res.json({ packages: result.rows });
    } else {
      const list = memoryStore.getPackagesByProject(projectId);
      return res.json({ packages: list });
    }
  } catch (err) {
    console.error('getPackages error:', err);
    return res.status(500).json({ error: 'Failed to fetch packages.' });
  }
};

const createPackage = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, skid_type, autoSeedBlowerQap } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Package / Skid name is required.' });

    const isBlower = skid_type === 'blower' || name.toLowerCase().includes('blower') || autoSeedBlowerQap;
    const effectiveSkidType = isBlower ? 'blower' : (skid_type || 'general');

    if (db.isPgConnected()) {
      const proj = await db.query('SELECT id FROM projects WHERE id = $1', [projectId]);
      if (!proj.rows.length) return res.status(404).json({ error: 'Project not found.' });

      const result = await db.query(
        `INSERT INTO packages (project_id, name, skid_type) VALUES ($1, $2, $3) RETURNING *`,
        [projectId, name.trim(), effectiveSkidType]
      );
      const pkg = result.rows[0];

      // Auto-seed QAP components if Blower
      if (isBlower) {
        for (const comp of memoryStore.BLOWER_QAP_TEMPLATE) {
          await db.query(
            `INSERT INTO requirements 
             (package_id, name, description, characteristics, check_requirement, quantum_check, ref_document, acceptance_standard, format_of_record, inspection_p, inspection_w, inspection_r)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              pkg.id,
              comp.name,
              comp.description,
              comp.characteristics,
              comp.check_requirement,
              comp.quantum_check,
              comp.ref_document,
              comp.acceptance_standard,
              comp.format_of_record,
              comp.inspection_p,
              comp.inspection_w,
              comp.inspection_r
            ]
          );
        }
      }

      return res.status(201).json({ package: pkg });
    } else {
      const pkg = memoryStore.addPackage(projectId, {
        name: name.trim(),
        skid_type: effectiveSkidType,
        seedBlowerQap: isBlower
      });
      return res.status(201).json({ package: pkg });
    }
  } catch (err) {
    console.error('createPackage error:', err);
    return res.status(500).json({ error: 'Failed to create package / skid.' });
  }
};

const deletePackage = async (req, res) => {
  try {
    if (req.user.role_name !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can delete packages.' });
    }
    const { id } = req.params;

    if (db.isPgConnected()) {
      const check = await db.query('SELECT id FROM packages WHERE id = $1', [id]);
      if (!check.rows.length) return res.status(404).json({ error: 'Package not found.' });
      await db.query('DELETE FROM packages WHERE id = $1', [id]);
      return res.json({ message: 'Package deleted.' });
    } else {
      const deleted = memoryStore.deletePackageById(id);
      if (!deleted) return res.status(404).json({ error: 'Package not found.' });
      return res.json({ message: 'Package deleted.' });
    }
  } catch (err) {
    console.error('deletePackage error:', err);
    return res.status(500).json({ error: 'Failed to delete package.' });
  }
};

const seedBlowerQapController = async (req, res) => {
  try {
    const { packageId } = req.params;

    if (db.isPgConnected()) {
      const pkgRes = await db.query('SELECT * FROM packages WHERE id = $1', [packageId]);
      if (!pkgRes.rows.length) return res.status(404).json({ error: 'Package not found.' });

      await db.query(`UPDATE packages SET skid_type = 'blower' WHERE id = $1`, [packageId]);

      const inserted = [];
      for (const comp of memoryStore.BLOWER_QAP_TEMPLATE) {
        const res = await db.query(
          `INSERT INTO requirements 
           (package_id, name, description, characteristics, check_requirement, quantum_check, ref_document, acceptance_standard, format_of_record, inspection_p, inspection_w, inspection_r)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
          [
            packageId,
            comp.name,
            comp.description,
            comp.characteristics,
            comp.check_requirement,
            comp.quantum_check,
            comp.ref_document,
            comp.acceptance_standard,
            comp.format_of_record,
            comp.inspection_p,
            comp.inspection_w,
            comp.inspection_r
          ]
        );
        inserted.push(res.rows[0]);
      }
      return res.json({ message: 'Blower QAP components loaded successfully.', requirements: inserted });
    } else {
      const inserted = memoryStore.seedBlowerQap(packageId);
      const pkg = memoryStore.packages.find(p => p.id === packageId);
      if (pkg) pkg.skid_type = 'blower';
      return res.json({ message: 'Blower QAP components loaded successfully.', requirements: inserted });
    }
  } catch (err) {
    console.error('seedBlowerQap error:', err);
    return res.status(500).json({ error: 'Failed to load Blower QAP components.' });
  }
};

// ─── REQUIREMENTS / COMPONENTS ───────────────────────────────────────────────

const getRequirements = async (req, res) => {
  try {
    const { packageId } = req.params;

    if (db.isPgConnected()) {
      const result = await db.query(
        `SELECT r.*,
          (SELECT COUNT(*) FROM requirement_files rf WHERE rf.requirement_id = r.id) as file_count,
          (SELECT COUNT(*) FROM requirement_files rf WHERE rf.requirement_id = r.id AND rf.status = 'completed') as completed_count,
          COALESCE(
            (SELECT json_agg(json_build_object('id', rf.id, 'original_name', rf.original_name, 'mime_type', rf.mime_type, 'status', rf.status) ORDER BY rf.created_at ASC)
             FROM requirement_files rf WHERE rf.requirement_id = r.id),
            '[]'::json
          ) as files
         FROM requirements r
         WHERE r.package_id = $1
         ORDER BY COALESCE(r.sort_order, 0) ASC, r.created_at ASC`,
        [packageId]
      );
      return res.json({ requirements: result.rows });
    } else {
      const list = memoryStore.getRequirementsByPackage(packageId);
      return res.json({ requirements: list });
    }
  } catch (err) {
    console.error('getRequirements error:', err);
    return res.status(500).json({ error: 'Failed to fetch requirements.' });
  }
};

const createRequirement = async (req, res) => {
  try {
    const { packageId } = req.params;
    const {
      name,
      description,
      characteristics,
      check_requirement,
      quantum_check,
      ref_document,
      acceptance_standard,
      format_of_record,
      inspection_p,
      inspection_w,
      inspection_r,
      remark
    } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Component / Operation name is required.' });

    if (db.isPgConnected()) {
      const pkg = await db.query('SELECT id FROM packages WHERE id = $1', [packageId]);
      if (!pkg.rows.length) return res.status(404).json({ error: 'Package not found.' });

      const result = await db.query(
        `INSERT INTO requirements 
         (package_id, name, description, characteristics, check_requirement, quantum_check, ref_document, acceptance_standard, format_of_record, inspection_p, inspection_w, inspection_r, remark) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [
          packageId,
          name.trim(),
          description?.trim() || null,
          characteristics?.trim() || null,
          check_requirement?.trim() || null,
          quantum_check?.trim() || null,
          ref_document?.trim() || null,
          acceptance_standard?.trim() || null,
          format_of_record?.trim() || null,
          inspection_p?.trim() || null,
          inspection_w?.trim() || null,
          inspection_r?.trim() || null,
          remark?.trim() || null
        ]
      );
      return res.status(201).json({ requirement: result.rows[0] });
    } else {
      const created = memoryStore.addRequirement(packageId, {
        name: name.trim(),
        description: description?.trim() || null,
        characteristics: characteristics?.trim() || null,
        check_requirement: check_requirement?.trim() || null,
        quantum_check: quantum_check?.trim() || null,
        ref_document: ref_document?.trim() || null,
        acceptance_standard: acceptance_standard?.trim() || null,
        format_of_record: format_of_record?.trim() || null,
        inspection_p: inspection_p?.trim() || null,
        inspection_w: inspection_w?.trim() || null,
        inspection_r: inspection_r?.trim() || null,
        remark: remark?.trim() || null
      });
      return res.status(201).json({ requirement: created });
    }
  } catch (err) {
    console.error('createRequirement error:', err);
    return res.status(500).json({ error: 'Failed to create requirement.' });
  }
};

const deleteRequirement = async (req, res) => {
  try {
    if (req.user.role_name !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can delete requirements.' });
    }
    const { id } = req.params;

    if (db.isPgConnected()) {
      const check = await db.query('SELECT id FROM requirements WHERE id = $1', [id]);
      if (!check.rows.length) return res.status(404).json({ error: 'Requirement not found.' });
      await db.query('DELETE FROM requirements WHERE id = $1', [id]);
      return res.json({ message: 'Requirement deleted.' });
    } else {
      const deleted = memoryStore.deleteRequirementById(id);
      if (!deleted) return res.status(404).json({ error: 'Requirement not found.' });
      return res.json({ message: 'Requirement deleted.' });
    }
  } catch (err) {
    console.error('deleteRequirement error:', err);
    return res.status(500).json({ error: 'Failed to delete requirement.' });
  }
};

// ─── REORDER REQUIREMENTS ────────────────────────────────────────────────────

const reorderRequirements = async (req, res) => {
  try {
    // orderedIds: array of requirement IDs in the new order
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds array is required.' });
    }

    if (db.isPgConnected()) {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.query(
          'UPDATE requirements SET sort_order = $1 WHERE id = $2',
          [i, orderedIds[i]]
        );
      }
    } else {
      // in-memory fallback
      orderedIds.forEach((id, i) => {
        const r = memoryStore.requirements?.find(r => r.id === id);
        if (r) r.sort_order = i;
      });
      if (memoryStore.saveStore) memoryStore.saveStore();
    }

    return res.json({ message: 'Order saved.' });
  } catch (err) {
    console.error('reorderRequirements error:', err);
    return res.status(500).json({ error: 'Failed to save order.' });
  }
};

module.exports = {
  getProjects,
  createProject,
  deleteProject,
  getPackages,
  createPackage,
  deletePackage,
  seedBlowerQap: seedBlowerQapController,
  getRequirements,
  createRequirement,
  deleteRequirement,
  reorderRequirements
};
