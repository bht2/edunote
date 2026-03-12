const EducationLevel = require('../models/EducationLevel');

const levelController = {
  index: async (req, res) => {
    try {
      const levels = await EducationLevel.findAll();
      res.render('admin/levels/index', { title: 'Education Levels', layout: 'layouts/admin', levels });
    } catch (err) {
      req.flash('error', 'Failed to load levels.');
      res.redirect('/admin/dashboard');
    }
  },

  create: (req, res) => {
    res.render('admin/levels/create', { title: 'Add Education Level', layout: 'layouts/admin' });
  },

  store: async (req, res) => {
    try {
      const { name, description, color, icon, order_index } = req.body;
      const slug = EducationLevel.toSlug(name);
      await EducationLevel.create({ name, slug, description, color, icon, orderIndex: order_index || 0 });
      req.flash('success', `Education level "${name}" created.`);
      res.redirect('/admin/levels');
    } catch (err) {
      req.flash('error', 'Failed to create level. Slug may already exist.');
      res.redirect('/admin/levels/create');
    }
  },

  edit: async (req, res) => {
    try {
      const level = await EducationLevel.findById(req.params.id);
      if (!level) { req.flash('error', 'Level not found.'); return res.redirect('/admin/levels'); }
      res.render('admin/levels/edit', { title: 'Edit Level', layout: 'layouts/admin', level });
    } catch (err) {
      req.flash('error', 'Failed to load level.');
      res.redirect('/admin/levels');
    }
  },

  update: async (req, res) => {
    try {
      const { name, description, color, icon, order_index } = req.body;
      const slug = EducationLevel.toSlug(name);
      await EducationLevel.update(req.params.id, { name, slug, description, color, icon, orderIndex: order_index || 0 });
      req.flash('success', 'Level updated.');
      res.redirect('/admin/levels');
    } catch (err) {
      req.flash('error', 'Failed to update level.');
      res.redirect('/admin/levels');
    }
  },

  destroy: async (req, res) => {
    try {
      await EducationLevel.delete(req.params.id);
      req.flash('success', 'Level deleted.');
      res.redirect('/admin/levels');
    } catch (err) {
      req.flash('error', 'Failed to delete level.');
      res.redirect('/admin/levels');
    }
  }
};

module.exports = levelController;
