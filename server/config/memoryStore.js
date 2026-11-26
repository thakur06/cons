const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Predefined Roles
const roles = [
  { id: 1, name: 'Admin', description: 'Full control: Upload, View, Download, Delete all files, and Manage user roles' },
  { id: 2, name: 'Manager', description: 'Manage files: Upload, View, Download all files, Delete own files' },
  { id: 3, name: 'User', description: 'Standard user: Upload, View, Download, and Delete own files' }
];

// Initial Seed Users
const salt = bcrypt.genSaltSync(10);
const users = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-111111111111',
    name: 'Admin User',
    email: 'admin@example.com',
    password_hash: bcrypt.hashSync('Admin123!', salt),
    role_id: 1,
    role_name: 'Admin',
    created_at: new Date().toISOString()
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-222222222222',
    name: 'Standard User',
    email: 'user@example.com',
    password_hash: bcrypt.hashSync('User123!', salt),
    role_id: 3,
    role_name: 'User',
    created_at: new Date().toISOString()
  }
];

const files = [];
const activityLogs = [];
const shareUploadLinks = [];

// Standard Blower Quality Assurance Plan (QAP) Template components
// From Document No. BGEI/QAP/BL/2025/002
const BLOWER_QAP_TEMPLATE = [
  {
    name: 'BODY, END PLATES & ROTORS',
    characteristics: 'MECHANICAL HARDNESS',
    check_requirement: 'TENSILE TEST MEASUREMENT',
    quantum_check: '1 PER HEAT/LOT',
    ref_document: 'IS 210:1993/ IS 1865:1991',
    acceptance_standard: 'Data Sheet/ Manu. Spec.',
    format_of_record: 'T.C/ COMPLIANCE REPORT',
    inspection_p: 'M',
    inspection_w: 'Q',
    inspection_r: 'B',
    description: 'Tensile test measurement for body, end plates & rotors (1 per heat/lot).'
  },
  {
    name: 'SHAFT',
    characteristics: 'CHEMICAL & MECHANICAL',
    check_requirement: 'CHEMICAL ANALYSIS',
    quantum_check: '1 PER HEAT/LOT',
    ref_document: 'BS970 (1970)',
    acceptance_standard: 'Data Sheet/ Manu. Spec.',
    format_of_record: 'T.C/ COMPLIANCE REPORT',
    inspection_p: 'M',
    inspection_w: 'Q',
    inspection_r: 'B',
    description: 'Chemical & mechanical analysis for shaft per BS970.'
  },
  {
    name: 'GEARS',
    characteristics: 'CHEMICAL & MECHANICAL',
    check_requirement: 'CHEMICAL ANALYSIS',
    quantum_check: '1 PER HEAT/LOT',
    ref_document: '20MNCR5',
    acceptance_standard: 'Data Sheet/ Manu. Spec.',
    format_of_record: 'T.C/ COMPLIANCE REPORT',
    inspection_p: 'M',
    inspection_w: 'Q',
    inspection_r: 'B',
    description: 'Chemical & mechanical analysis for gears (20MNCR5).'
  },
  {
    name: 'ROTOR ASSEMBLY',
    characteristics: 'BALANCING',
    check_requirement: 'DYNAMIC BAL',
    quantum_check: '100%',
    ref_document: 'ISO 1950-1 1986',
    acceptance_standard: 'GR 6.3/ MANF DRG',
    format_of_record: 'Report',
    inspection_p: 'M',
    inspection_w: 'Q',
    inspection_r: 'B',
    description: 'Dynamic balancing per ISO 1950-1 1986 (100% check).'
  },
  {
    name: 'PERFORMANCE TEST',
    characteristics: 'CAPACITY/ SPEED/ PRESSURE/ POWER',
    check_requirement: 'PERFORMANCE RUN',
    quantum_check: '100%',
    ref_document: 'DATASHEET',
    acceptance_standard: 'DATASHEET COMPLIANCE',
    format_of_record: 'Test Report/ COMPLIANCE CERTIFICATE',
    inspection_p: 'M',
    inspection_w: 'Q',
    inspection_r: 'B',
    description: 'Performance run checking capacity, speed, pressure & power (100%).'
  },
  {
    name: 'VISUAL & DIMENSION',
    characteristics: 'VISUAL CHECK',
    check_requirement: 'MEASUREMENT',
    quantum_check: '100%',
    ref_document: 'GA DRAWING',
    acceptance_standard: 'MFG TOLERANCE',
    format_of_record: 'MFG COMPLIANCE REPORT',
    inspection_p: 'M',
    inspection_w: 'Q',
    inspection_r: 'B',
    description: 'Visual check and GA drawing dimension measurement (100%).'
  },
  {
    name: 'PAINTING',
    characteristics: 'FINISH',
    check_requirement: 'COMPLETENESS',
    quantum_check: '100%',
    ref_document: 'MFG SPEC',
    acceptance_standard: 'MFG SPEC',
    format_of_record: 'MFG COMPLIANCE REPORT',
    inspection_p: 'M',
    inspection_w: 'Q',
    inspection_r: 'B',
    description: 'Painting finish and completeness check per manufacturing spec.'
  },
  {
    name: 'FINAL INSPECTION AND DOCUMENTATION',
    characteristics: 'VERIFICATION',
    check_requirement: 'COMPLETENESS',
    quantum_check: '100%',
    ref_document: 'All Documents Verified',
    acceptance_standard: '-',
    format_of_record: 'FINAL REPORT',
    inspection_p: 'M',
    inspection_w: 'Q',
    inspection_r: 'B,C',
    description: 'Verification of all documents and final inspection completeness.'
  },
  {
    name: 'PACKING/ DISPATCH',
    characteristics: 'VISUAL',
    check_requirement: 'COMPLETENESS',
    quantum_check: '100%',
    ref_document: 'DISPATCH CLEARANCE',
    acceptance_standard: '-',
    format_of_record: 'PHOTOGRAPHS',
    inspection_p: 'M',
    inspection_w: 'Q',
    inspection_r: 'B',
    description: 'Visual check of packaging and dispatch clearance with photographs.'
  }
];

// Initial Seed Projects, Skids (packages), Requirements (components), and Files
const defaultProjectId = 'c1d2e3f4-1111-2222-3333-444455556666';
const defaultPackageId = 'd2e3f4a5-2222-3333-4444-555566667777';

const projects = [
  {
    id: defaultProjectId,
    name: 'Biogas Upgrading Plant',
    code: 'BGEI-2025',
    created_by: 'a1b2c3d4-e5f6-7890-abcd-111111111111',
    creator_name: 'Admin User',
    created_at: new Date().toISOString()
  }
];

const packages = [
  {
    id: defaultPackageId,
    project_id: defaultProjectId,
    name: 'Blower Package',
    skid_type: 'blower',
    created_at: new Date().toISOString()
  }
];

const requirements = BLOWER_QAP_TEMPLATE.map((comp) => ({
  id: uuidv4(),
  package_id: defaultPackageId,
  name: comp.name,
  description: comp.description,
  characteristics: comp.characteristics,
  check_requirement: comp.check_requirement,
  quantum_check: comp.quantum_check,
  ref_document: comp.ref_document,
  acceptance_standard: comp.acceptance_standard,
  format_of_record: comp.format_of_record,
  inspection_p: comp.inspection_p,
  inspection_w: comp.inspection_w,
  inspection_r: comp.inspection_r,
  created_at: new Date().toISOString()
}));

const requirementFiles = [];

// Persistent JSON Store path
const storePath = path.join(__dirname, '../data/store.json');

function saveStore() {
  try {
    const data = {
      projects,
      packages,
      requirements,
      requirementFiles,
      files,
      shareUploadLinks
    };
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save store.json:', err.message);
  }
}

function loadStore() {
  try {
    if (fs.existsSync(storePath)) {
      const raw = fs.readFileSync(storePath, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.projects)) projects.splice(0, projects.length, ...data.projects);
      if (Array.isArray(data.packages)) packages.splice(0, packages.length, ...data.packages);
      if (Array.isArray(data.requirements)) requirements.splice(0, requirements.length, ...data.requirements);
      if (Array.isArray(data.requirementFiles)) requirementFiles.splice(0, requirementFiles.length, ...data.requirementFiles);
      if (Array.isArray(data.files)) files.splice(0, files.length, ...data.files);
      if (Array.isArray(data.shareUploadLinks)) shareUploadLinks.splice(0, shareUploadLinks.length, ...data.shareUploadLinks);
      console.log(`[memoryStore] Loaded ${requirementFiles.length} file(s) and ${requirements.length} requirement(s) from persistent store.json`);
    } else {
      saveStore();
    }
  } catch (err) {
    console.error('Failed to load store.json:', err.message);
  }
}

loadStore();

module.exports = {
  roles,
  users,
  files,
  activityLogs,
  shareUploadLinks,
  projects,
  packages,
  requirements,
  requirementFiles,
  BLOWER_QAP_TEMPLATE,

  // User methods
  findUserByEmail: (email) => users.find(u => u.email.toLowerCase() === email.toLowerCase()),
  findUserById: (id) => users.find(u => u.id === id),
  findRoleById: (roleId) => roles.find(r => r.id === roleId),
  findRoleByName: (name) => roles.find(r => r.name.toLowerCase() === name.toLowerCase()),
  addUser: (userData) => {
    const role = roles.find(r => r.id === userData.role_id) || roles[2];
    const newUser = {
      id: uuidv4(),
      ...userData,
      role_name: role.name,
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    return newUser;
  },

  // File methods
  addFile: (fileData) => {
    const newFile = {
      id: uuidv4(),
      ...fileData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    files.push(newFile);
    return newFile;
  },
  deleteFile: (id) => {
    const idx = files.findIndex(f => f.id === id);
    if (idx !== -1) {
      return files.splice(idx, 1)[0];
    }
    return null;
  },

  // Share link methods
  createShareLink: (linkData) => {
    const newLink = {
      id: uuidv4(),
      failed_attempts: 0,
      status: 'active',
      used_at: null,
      uploaded_file_id: null,
      uploaded_file_name: null,
      uploaded_files: [],
      allow_multiple: true,
      created_at: new Date().toISOString(),
      ...linkData
    };
    shareUploadLinks.push(newLink);
    return newLink;
  },
  findShareLinkByToken: (token) => {
    return shareUploadLinks.find(l => l.token === token);
  },
  findShareLinkById: (id) => {
    return shareUploadLinks.find(l => l.id === id);
  },
  listShareLinksByUser: (userId) => {
    return shareUploadLinks.filter(l => l.created_by === userId);
  },
  updateShareLink: (id, updates) => {
    const link = shareUploadLinks.find(l => l.id === id);
    if (link) {
      Object.assign(link, updates);
      return link;
    }
    return null;
  },
  deleteShareLink: (id) => {
    const idx = shareUploadLinks.findIndex(l => l.id === id);
    if (idx !== -1) {
      return shareUploadLinks.splice(idx, 1)[0];
    }
    return null;
  },

  // Project methods
  getProjectsList: () => {
    return projects.map(p => ({
      ...p,
      package_count: packages.filter(pk => pk.project_id === p.id).length
    }));
  },
  addProject: (data) => {
    const newP = {
      id: uuidv4(),
      name: data.name,
      code: data.code || null,
      created_by: data.created_by,
      creator_name: data.creator_name || 'Admin',
      created_at: new Date().toISOString()
    };
    projects.unshift(newP);
    return newP;
  },
  deleteProjectById: (id) => {
    const idx = projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      const p = projects.splice(idx, 1)[0];
      const pks = packages.filter(pk => pk.project_id === id);
      pks.forEach(pk => {
        module.exports.deletePackageById(pk.id);
      });
      return p;
    }
    return null;
  },

  // Package / Skid methods
  getPackagesByProject: (projectId) => {
    return packages
      .filter(pk => pk.project_id === projectId)
      .map(pk => ({
        ...pk,
        requirement_count: requirements.filter(r => r.package_id === pk.id).length
      }));
  },
  addPackage: (projectId, data) => {
    const newPk = {
      id: uuidv4(),
      project_id: projectId,
      name: data.name,
      skid_type: data.skid_type || (data.name.toLowerCase().includes('blower') ? 'blower' : 'general'),
      created_at: new Date().toISOString()
    };
    packages.push(newPk);

    // Auto-seed QAP components if Skid is Blower
    if (newPk.skid_type === 'blower' || data.name.toLowerCase().includes('blower') || data.seedBlowerQap) {
      module.exports.seedBlowerQap(newPk.id);
    }

    return newPk;
  },
  deletePackageById: (id) => {
    const idx = packages.findIndex(pk => pk.id === id);
    if (idx !== -1) {
      const pk = packages.splice(idx, 1)[0];
      const reqs = requirements.filter(r => r.package_id === id);
      reqs.forEach(r => {
        module.exports.deleteRequirementById(r.id);
      });
      return pk;
    }
    return null;
  },

  // Seed Blower QAP components into a package/skid
  seedBlowerQap: (packageId) => {
    const newReqs = BLOWER_QAP_TEMPLATE.map(comp => ({
      id: uuidv4(),
      package_id: packageId,
      name: comp.name,
      description: comp.description,
      characteristics: comp.characteristics,
      check_requirement: comp.check_requirement,
      quantum_check: comp.quantum_check,
      ref_document: comp.ref_document,
      acceptance_standard: comp.acceptance_standard,
      format_of_record: comp.format_of_record,
      inspection_p: comp.inspection_p,
      inspection_w: comp.inspection_w,
      inspection_r: comp.inspection_r,
      created_at: new Date().toISOString()
    }));
    requirements.push(...newReqs);
    return newReqs;
  },

  // Requirement / Component methods
  getRequirementsByPackage: (packageId) => {
    return requirements
      .filter(r => r.package_id === packageId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(r => {
        const rFiles = requirementFiles.filter(rf => rf.requirement_id === r.id);
        const compCount = rFiles.filter(rf => rf.status === 'completed').length;
        return {
          ...r,
          file_count: rFiles.length,
          completed_count: compCount,
          files: rFiles.map(rf => ({
            id: rf.id,
            original_name: rf.original_name,
            mime_type: rf.mime_type,
            status: rf.status
          }))
        };
      });
  },
  findRequirementById: (id) => {
    return requirements.find(r => r.id === id);
  },
  addRequirement: (packageId, data) => {
    const newR = {
      id: uuidv4(),
      package_id: packageId,
      name: data.name,
      description: data.description || null,
      characteristics: data.characteristics || null,
      check_requirement: data.check_requirement || null,
      quantum_check: data.quantum_check || null,
      ref_document: data.ref_document || null,
      acceptance_standard: data.acceptance_standard || null,
      format_of_record: data.format_of_record || null,
      inspection_p: data.inspection_p || null,
      inspection_w: data.inspection_w || null,
      inspection_r: data.inspection_r || null,
      created_at: new Date().toISOString()
    };
    requirements.push(newR);
    return newR;
  },
  deleteRequirementById: (id) => {
    const idx = requirements.findIndex(r => r.id === id);
    if (idx !== -1) {
      const r = requirements.splice(idx, 1)[0];
      // delete files
      const toDelete = requirementFiles.filter(rf => rf.requirement_id === id);
      toDelete.forEach(rf => {
        const fIdx = requirementFiles.findIndex(item => item.id === rf.id);
        if (fIdx !== -1) requirementFiles.splice(fIdx, 1);
      });
      return r;
    }
    return null;
  },

  // Requirement Files
  getFilesByRequirement: (requirementId) => {
    return requirementFiles
      .filter(rf => rf.requirement_id === requirementId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  addRequirementFile: (data) => {
    const newRf = {
      id: uuidv4(),
      status: 'pending',
      created_at: new Date().toISOString(),
      ...data
    };
    requirementFiles.push(newRf);
    saveStore();
    return newRf;
  },
  updateRequirementFile: (id, updates) => {
    const rf = requirementFiles.find(item => item.id === id);
    if (rf) {
      Object.assign(rf, updates);
      saveStore();
      return rf;
    }
    return null;
  },
  deleteRequirementFileById: (id) => {
    const idx = requirementFiles.findIndex(item => item.id === id);
    if (idx !== -1) {
      const deleted = requirementFiles.splice(idx, 1)[0];
      saveStore();
      return deleted;
    }
    return null;
  },
  saveStore
};
