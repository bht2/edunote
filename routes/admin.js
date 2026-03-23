const express               = require('express');
const router                = express.Router();
const { isAdmin, isSuperAdmin } = require('../middleware/auth');
const authController        = require('../controllers/authController');
const dashboardController   = require('../controllers/dashboardController');
const levelController       = require('../controllers/levelController');
const combinationController = require('../controllers/combinationController');
const classController       = require('../controllers/classController');
const noteController        = require('../controllers/noteController');
const subAdminController    = require('../controllers/subAdminController');
const requestController     = require('../controllers/requestController');

// ── Auth (public) ────────────────────────────────────────────────────────────
router.get('/login',  authController.getLogin);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// ── All routes below require any valid login ─────────────────────────────────
router.use(isAdmin);

// Dashboard — both roles
router.get('/dashboard', dashboardController.index);

// Settings — both roles (own profile only)
router.get('/settings',                dashboardController.getSettings);
router.post('/settings/profile',       dashboardController.updateProfile);
router.post('/settings/password',      dashboardController.updatePassword);
router.post('/settings/avatar',        dashboardController.uploadAvatar);
router.post('/settings/avatar/remove', dashboardController.removeAvatar);

// ── MAIN ADMIN ONLY ──────────────────────────────────────────────────────────

// Education Levels — main admin only
router.get('/levels',              isSuperAdmin, levelController.index);
router.get('/levels/create',       isSuperAdmin, levelController.create);
router.post('/levels',             isSuperAdmin, levelController.store);
router.get('/levels/:id/edit',     isSuperAdmin, levelController.edit);
router.post('/levels/:id',         isSuperAdmin, levelController.update);
router.post('/levels/:id/delete',  isSuperAdmin, levelController.destroy);

// Combinations — main admin can do anything; sub-admin submits requests
router.get('/levels/:levelId/combinations',             isAdmin,       combinationController.index);
router.get('/levels/:levelId/combinations/create',      isAdmin,       combinationController.create);
router.post('/levels/:levelId/combinations',            isAdmin,       combinationController.store);
router.get('/levels/:levelId/combinations/:id/edit',    isAdmin,       combinationController.edit);
router.post('/levels/:levelId/combinations/:id',        isAdmin,       combinationController.update);
router.post('/levels/:levelId/combinations/:id/delete', isAdmin,       combinationController.destroy);

// Classes — both roles
router.get('/combinations/:comboId/classes',             isAdmin, classController.index);
router.get('/combinations/:comboId/classes/create',      isAdmin, classController.create);
router.post('/combinations/:comboId/classes',            isAdmin, classController.store);
router.get('/combinations/:comboId/classes/:id/edit',    isAdmin, classController.edit);
router.post('/combinations/:comboId/classes/:id',        isAdmin, classController.update);
router.post('/combinations/:comboId/classes/:id/delete', isAdmin, classController.destroy);

// Notes — both roles
router.get('/classes/:classId/notes',               isAdmin, noteController.index);
router.get('/classes/:classId/notes/create',        isAdmin, noteController.create);
router.post('/classes/:classId/notes',              isAdmin, noteController.store);
router.get('/classes/:classId/notes/:id/edit',      isAdmin, noteController.edit);
router.post('/classes/:classId/notes/:id',          isAdmin, noteController.update);
router.post('/classes/:classId/notes/:id/delete',   isAdmin, noteController.destroy);

// Sub-Admins — main admin only
router.get('/subadmins',              isSuperAdmin, subAdminController.index);
router.get('/subadmins/create',       isSuperAdmin, subAdminController.create);
router.post('/subadmins',             isSuperAdmin, subAdminController.store);
router.get('/subadmins/:id/edit',     isSuperAdmin, subAdminController.edit);
router.post('/subadmins/:id',         isSuperAdmin, subAdminController.update);
router.post('/subadmins/:id/delete',  isSuperAdmin, subAdminController.destroy);

// Requests — main admin reviews; sub-admin submits
router.get('/requests',                  isSuperAdmin, requestController.index);
router.post('/requests/:id/approve',     isSuperAdmin, requestController.approve);
router.post('/requests/:id/reject',      isSuperAdmin, requestController.reject);
// Sub-admin submits a combination change request
router.post('/requests/submit',          isAdmin,      requestController.submit);

module.exports = router;
