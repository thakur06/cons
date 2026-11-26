const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const {
  getProjects, createProject, deleteProject,
  getPackages, createPackage, deletePackage, seedBlowerQap, seedChillerQap, seedElectricalPanelQap,
  getRequirements, createRequirement, deleteRequirement, reorderRequirements
} = require('../controllers/projectController');

const {
  uploadRequirementFile,
  getRequirementFiles,
  markFileComplete,
  deleteRequirementFile
} = require('../controllers/requirementFileController');

const { exportProjectPdf } = require('../controllers/exportController');

// All routes require auth
router.use(authMiddleware);

// Projects
router.get('/projects', getProjects);
router.post('/projects', createProject);
router.delete('/projects/:id', deleteProject);

// PDF Export
router.post('/projects/:id/export-pdf', exportProjectPdf);

// Packages / Skids
router.get('/projects/:projectId/packages', getPackages);
router.post('/projects/:projectId/packages', createPackage);
router.post('/packages/:packageId/seed-blower-qap', seedBlowerQap);
router.post('/packages/:packageId/seed-chiller-qap', seedChillerQap);
router.post('/packages/:packageId/seed-electrical-panel-qap', seedElectricalPanelQap);
router.delete('/packages/:id', deletePackage);

// Requirements / Components
router.get('/packages/:packageId/requirements', getRequirements);
router.post('/packages/:packageId/requirements', createRequirement);
router.patch('/packages/:packageId/requirements/reorder', reorderRequirements);
router.delete('/requirements/:id', deleteRequirement);

// Requirement Files (supports single 'file' or multiple 'files')
router.get('/requirements/:requirementId/files', getRequirementFiles);
router.post('/requirements/:requirementId/files', upload.any(), uploadRequirementFile);
router.patch('/requirement-files/:id/complete', markFileComplete);
router.delete('/requirement-files/:id', deleteRequirementFile);

module.exports = router;
