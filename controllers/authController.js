const Admin = require('../models/Admin');

const authController = {
  getLogin: (req, res) => {
    if (req.session.adminId) return res.redirect('/admin/dashboard');
    res.render('admin/login', { title: 'Admin Login — EduNote', layout: 'layouts/admin-auth' });
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        req.flash('error', 'Email and password are required.');
        return res.redirect('/admin/login');
      }
      const admin = await Admin.findByEmail(email.trim().toLowerCase());
      if (!admin) {
        req.flash('error', 'Invalid credentials.');
        return res.redirect('/admin/login');
      }
      const isMatch = await Admin.verifyPassword(password, admin.password);
      if (!isMatch) {
        req.flash('error', 'Invalid credentials.');
        return res.redirect('/admin/login');
      }

      // Store role and assigned level in session
      req.session.adminId      = admin.id;
      req.session.adminName    = admin.name;
      req.session.adminEmail   = admin.email;
      req.session.adminAvatar  = admin.avatar || null;
      req.session.adminRole    = admin.role;      // 'admin' or 'sub'
      req.session.adminLevelId = admin.level_id || null; // sub-admin's assigned level

      req.flash('success', `Welcome back, ${admin.name}!`);
      res.redirect('/admin/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      req.flash('error', 'Something went wrong. Please try again.');
      res.redirect('/admin/login');
    }
  },

  logout: (req, res) => {
    req.session.destroy(() => res.redirect('/admin/login'));
  }
};

module.exports = authController;
