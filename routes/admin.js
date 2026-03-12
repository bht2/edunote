const express             = require('express');
const router              = express.Router();
const { isAdmin }         = require('../middleware/auth');
const authController      = require('../controllers/authController');
const dashboardController = require('../controllers/dashboardController');
const levelController     = require('../controllers/levelController');
const combinationController = require('../controllers/combinationController');
const classController     = require('../controllers/classController');
const noteController      = require('../controllers/noteController');

// Auth
router.get('/login', authController.getLogin);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// Protected routes
router.use(isAdmin);

// Dashboard
router.get('/dashboard', dashboardController.index);

// Settings
router.get('/settings', dashboardController.getSettings);
router.post('/settings/profile', dashboardController.updateProfile);
router.post('/settings/password', dashboardController.updatePassword);
router.post('/settings/avatar', dashboardController.uploadAvatar);
router.post('/settings/avatar/remove', dashboardController.removeAvatar);

// Education Levels
router.get('/levels', levelController.index);
router.get('/levels/create', levelController.create);
router.post('/levels', levelController.store);
router.get('/levels/:id/edit', levelController.edit);
router.post('/levels/:id', levelController.update);
router.post('/levels/:id/delete', levelController.destroy);

// Combinations (under a level)
router.get('/levels/:levelId/combinations', combinationController.index);
router.get('/levels/:levelId/combinations/create', combinationController.create);
router.post('/levels/:levelId/combinations', combinationController.store);
router.get('/levels/:levelId/combinations/:id/edit', combinationController.edit);
router.post('/levels/:levelId/combinations/:id', combinationController.update);
router.post('/levels/:levelId/combinations/:id/delete', combinationController.destroy);

// Classes (under a combination)
router.get('/combinations/:comboId/classes', classController.index);
router.get('/combinations/:comboId/classes/create', classController.create);
router.post('/combinations/:comboId/classes', classController.store);
router.get('/combinations/:comboId/classes/:id/edit', classController.edit);
router.post('/combinations/:comboId/classes/:id', classController.update);
router.post('/combinations/:comboId/classes/:id/delete', classController.destroy);

// Notes (under a class)
router.get('/classes/:classId/notes', noteController.index);
router.get('/classes/:classId/notes/create', noteController.create);
router.post('/classes/:classId/notes', noteController.store);
router.get('/classes/:classId/notes/:id/edit', noteController.edit);
router.post('/classes/:classId/notes/:id', noteController.update);
router.post('/classes/:classId/notes/:id/delete', noteController.destroy);

module.exports = router;
