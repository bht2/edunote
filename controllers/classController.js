const Class          = require('../models/Class');
const Combination    = require('../models/Combination');
const EducationLevel = require('../models/EducationLevel');

const classController = {
  index: async (req, res) => {
    try {
      const combo   = await Combination.findById(req.params.comboId);
      if (!combo) { req.flash('error', 'Combination not found.'); return res.redirect('/admin/levels'); }
      const level   = await EducationLevel.findById(combo.education_level_id);
      const classes = await Class.findByCombination(combo.id);
      res.render('admin/classes/index', { title: `${combo.name} — Classes`, layout: 'layouts/admin', combo, level, classes });
    } catch (err) {
      req.flash('error', 'Failed to load classes.');
      res.redirect('/admin/levels');
    }
  },

  create: async (req, res) => {
    try {
      const combo = await Combination.findById(req.params.comboId);
      const level = await EducationLevel.findById(combo.education_level_id);
      res.render('admin/classes/create', { title: 'Add Class', layout: 'layouts/admin', combo, level });
    } catch (err) {
      req.flash('error', 'Failed to load form.');
      res.redirect('/admin/levels');
    }
  },

  store: async (req, res) => {
    try {
      const combo = await Combination.findById(req.params.comboId);
      const { name, order_index } = req.body;
      const slug = `${combo.slug}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      await Class.create({ combinationId: combo.id, name, slug, orderIndex: order_index || 0 });
      req.flash('success', `Class "${name}" created.`);
      res.redirect(`/admin/combinations/${combo.id}/classes`);
    } catch (err) {
      req.flash('error', 'Failed to create class. May already exist.');
      res.redirect(`/admin/combinations/${req.params.comboId}/classes/create`);
    }
  },

  edit: async (req, res) => {
    try {
      const combo = await Combination.findById(req.params.comboId);
      const level = await EducationLevel.findById(combo.education_level_id);
      const cls   = await Class.findById(req.params.id);
      if (!cls) { req.flash('error', 'Class not found.'); return res.redirect(`/admin/combinations/${req.params.comboId}/classes`); }
      res.render('admin/classes/edit', { title: 'Edit Class', layout: 'layouts/admin', combo, level, cls });
    } catch (err) {
      req.flash('error', 'Failed to load class.');
      res.redirect(`/admin/combinations/${req.params.comboId}/classes`);
    }
  },

  update: async (req, res) => {
    try {
      const combo = await Combination.findById(req.params.comboId);
      const { name, order_index } = req.body;
      const slug = `${combo.slug}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      await Class.update(req.params.id, { name, slug, orderIndex: order_index || 0 });
      req.flash('success', 'Class updated.');
      res.redirect(`/admin/combinations/${combo.id}/classes`);
    } catch (err) {
      req.flash('error', 'Failed to update class.');
      res.redirect(`/admin/combinations/${req.params.comboId}/classes`);
    }
  },

  destroy: async (req, res) => {
    try {
      const combo = await Combination.findById(req.params.comboId);
      await Class.delete(req.params.id);
      req.flash('success', 'Class deleted.');
      res.redirect(`/admin/combinations/${combo.id}/classes`);
    } catch (err) {
      req.flash('error', 'Failed to delete class.');
      res.redirect(`/admin/combinations/${req.params.comboId}/classes`);
    }
  }
};

module.exports = classController;
