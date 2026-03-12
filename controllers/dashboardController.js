const EducationLevel = require('../models/EducationLevel');
const Combination    = require('../models/Combination');
const Class          = require('../models/Class');
const Note           = require('../models/Note');
const Admin          = require('../models/Admin');
const { avatarUpload, uploadAvatarToCloudinary, deleteFromCloudinary } = require('../middleware/upload');
const cloudinary     = require('cloudinary').v2;

const dashboardController = {
  index: async (req, res) => {
    try {
      const levels       = await EducationLevel.findAll();
      const combinations = await Combination.findAll();
      const noteCount    = await Note.countAll();
      const downloads    = await Note.countDownloads();
      res.render('admin/dashboard', {
        title: 'Dashboard - EduNote Admin',
        layout: 'layouts/admin',
        levels, combinations, noteCount, downloads
      });
    } catch (err) {
      console.error(err);
      res.render('admin/dashboard', { title: 'Dashboard', layout: 'layouts/admin', levels: [], combinations: [], noteCount: 0, downloads: 0 });
    }
  },

  getSettings: async (req, res) => {
    try {
      const admin = await Admin.findById(req.session.adminId);
      res.render('admin/settings', { title: 'Settings - EduNote', layout: 'layouts/admin', admin });
    } catch (err) {
      req.flash('error', 'Could not load settings.');
      res.redirect('/admin/dashboard');
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { name, email } = req.body;
      await Admin.updateProfile(req.session.adminId, { name, email });
      req.session.adminName  = name;
      req.session.adminEmail = email;
      req.flash('success', 'Profile updated successfully.');
      res.redirect('/admin/settings');
    } catch (err) {
      req.flash('error', 'Failed to update profile.');
      res.redirect('/admin/settings');
    }
  },

  updatePassword: async (req, res) => {
    try {
      const { current_password, new_password, confirm_password } = req.body;
      if (new_password !== confirm_password) {
        req.flash('error', 'New passwords do not match.');
        return res.redirect('/admin/settings');
      }
      const admin = await Admin.findById(req.session.adminId);
      const isMatch = await Admin.verifyPassword(current_password, admin.password);
      if (!isMatch) {
        req.flash('error', 'Current password is incorrect.');
        return res.redirect('/admin/settings');
      }
      await Admin.updatePassword(req.session.adminId, new_password);
      req.flash('success', 'Password updated successfully.');
      res.redirect('/admin/settings');
    } catch (err) {
      req.flash('error', 'Failed to update password.');
      res.redirect('/admin/settings');
    }
  },

  uploadAvatar: [
    avatarUpload.single('avatar'),
    async (req, res) => {
      try {
        if (!req.file) {
          req.flash('error', 'Please select an image file.');
          return res.redirect('/admin/settings');
        }
        // Delete old avatar from cloudinary
        const admin = await Admin.findById(req.session.adminId);
        if (admin.avatar && admin.avatar.includes('cloudinary')) {
          const parts = admin.avatar.split('/');
          const publicId = 'edunote/avatars/' + parts[parts.length - 1].split('.')[0];
          await deleteFromCloudinary(publicId, 'image');
        }
        const result = await uploadAvatarToCloudinary(req.file.buffer);
        await Admin.updateAvatar(req.session.adminId, result.secure_url);
        req.session.adminAvatar = result.secure_url;
        req.flash('success', 'Avatar updated successfully.');
        res.redirect('/admin/settings');
      } catch (err) {
        console.error(err);
        req.flash('error', 'Failed to upload avatar.');
        res.redirect('/admin/settings');
      }
    }
  ],

  removeAvatar: async (req, res) => {
    try {
      await Admin.updateAvatar(req.session.adminId, null);
      req.session.adminAvatar = null;
      req.flash('success', 'Avatar removed.');
      res.redirect('/admin/settings');
    } catch (err) {
      req.flash('error', 'Failed to remove avatar.');
      res.redirect('/admin/settings');
    }
  }
};

module.exports = dashboardController;
