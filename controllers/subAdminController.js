const Admin          = require('../models/Admin');
const EducationLevel = require('../models/EducationLevel');

module.exports = {

  index: async (req, res) => {
    try {
      const [admins, levels] = await Promise.all([
        Admin.findAll(),
        EducationLevel.findAll()
      ]);
      res.render('admin/subadmins/index', {
        layout: 'layouts/admin',
        title: 'Sub-Admins — EduNote',
        admins: admins.filter(a => a.role === 'sub'),
        levels
      });
    } catch (err) {
      console.error(err);
      req.flash('error', 'Error loading sub-admins.');
      res.redirect('/admin/dashboard');
    }
  },

  create: async (req, res) => {
    try {
      const levels = await EducationLevel.findAll();
      res.render('admin/subadmins/create', {
        layout: 'layouts/admin',
        title: 'Add Sub-Admin — EduNote',
        levels
      });
    } catch (err) {
      req.flash('error', 'Error loading form.');
      res.redirect('/admin/subadmins');
    }
  },

  store: async (req, res) => {
    try {
      const { name, email, password, level_id } = req.body;
      if (!name || !email || !password || !level_id) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/admin/subadmins/create');
      }
      await Admin.create({ name, email, password, role: 'sub', level_id: parseInt(level_id) });
      req.flash('success', `Sub-admin ${name} created successfully.`);
      res.redirect('/admin/subadmins');
    } catch (err) {
      console.error(err);
      req.flash('error', err.code === 'ER_DUP_ENTRY' ? 'Email already in use.' : 'Error creating sub-admin.');
      res.redirect('/admin/subadmins/create');
    }
  },

  edit: async (req, res) => {
    try {
      const [admin, levels] = await Promise.all([
        Admin.findById(req.params.id),
        EducationLevel.findAll()
      ]);
      if (!admin || admin.role !== 'sub') {
        req.flash('error', 'Sub-admin not found.');
        return res.redirect('/admin/subadmins');
      }
      res.render('admin/subadmins/edit', {
        layout: 'layouts/admin',
        title: 'Edit Sub-Admin — EduNote',
        subAdmin: admin,
        levels
      });
    } catch (err) {
      req.flash('error', 'Error loading form.');
      res.redirect('/admin/subadmins');
    }
  },

  update: async (req, res) => {
    try {
      const { name, email, level_id, new_password } = req.body;
      await Admin.updateSubAdmin(req.params.id, { name, email, level_id: parseInt(level_id) });
      if (new_password && new_password.trim()) {
        await Admin.resetPassword(req.params.id, new_password.trim());
      }
      req.flash('success', 'Sub-admin updated.');
      res.redirect('/admin/subadmins');
    } catch (err) {
      console.error(err);
      req.flash('error', 'Error updating sub-admin.');
      res.redirect('/admin/subadmins/' + req.params.id + '/edit');
    }
  },

  destroy: async (req, res) => {
    try {
      await Admin.delete(req.params.id);
      req.flash('success', 'Sub-admin deleted.');
      res.redirect('/admin/subadmins');
    } catch (err) {
      req.flash('error', 'Error deleting sub-admin.');
      res.redirect('/admin/subadmins');
    }
  }
};
