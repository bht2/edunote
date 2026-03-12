const Combination    = require('../models/Combination');
const EducationLevel = require('../models/EducationLevel');

const combinationController = {
  index: async (req, res) => {
    try {
      const level        = await EducationLevel.findById(req.params.levelId);
      if (!level) { req.flash('error', 'Level not found.'); return res.redirect('/admin/levels'); }
      const combinations = await Combination.findByLevel(level.id);
      res.render('admin/combinations/index', {
        title: `${level.name} — Combinations/Trades`,
        layout: 'layouts/admin', level, combinations
      });
    } catch (err) {
      req.flash('error', 'Failed to load combinations.');
      res.redirect('/admin/levels');
    }
  },

  create: async (req, res) => {
    try {
      const level = await EducationLevel.findById(req.params.levelId);
      if (!level) { req.flash('error', 'Level not found.'); return res.redirect('/admin/levels'); }
      res.render('admin/combinations/create', { title: 'Add Combination/Trade', layout: 'layouts/admin', level });
    } catch (err) {
      req.flash('error', 'Failed to load form.');
      res.redirect('/admin/levels');
    }
  },

  store: async (req, res) => {
    try {
      const level = await EducationLevel.findById(req.params.levelId);
      const { name, full_name, description, color, order_index } = req.body;
      const slug = Combination.toSlug(level.slug, name);
      await Combination.create({ educationLevelId: level.id, name, slug, fullName: full_name, description, color, orderIndex: order_index || 0 });
      req.flash('success', `Combination "${name}" created.`);
      res.redirect(`/admin/levels/${level.id}/combinations`);
    } catch (err) {
      req.flash('error', 'Failed to create combination. Name may already exist.');
      res.redirect(`/admin/levels/${req.params.levelId}/combinations/create`);
    }
  },

  edit: async (req, res) => {
    try {
      const level = await EducationLevel.findById(req.params.levelId);
      const combo = await Combination.findById(req.params.id);
      if (!combo) { req.flash('error', 'Combination not found.'); return res.redirect(`/admin/levels/${req.params.levelId}/combinations`); }
      res.render('admin/combinations/edit', { title: 'Edit Combination', layout: 'layouts/admin', level, combo });
    } catch (err) {
      req.flash('error', 'Failed to load combination.');
      res.redirect(`/admin/levels/${req.params.levelId}/combinations`);
    }
  },

  update: async (req, res) => {
    try {
      const level = await EducationLevel.findById(req.params.levelId);
      const { name, full_name, description, color, order_index } = req.body;
      const slug = Combination.toSlug(level.slug, name);
      await Combination.update(req.params.id, { name, slug, fullName: full_name, description, color, orderIndex: order_index || 0 });
      req.flash('success', 'Combination updated.');
      res.redirect(`/admin/levels/${level.id}/combinations`);
    } catch (err) {
      req.flash('error', 'Failed to update combination.');
      res.redirect(`/admin/levels/${req.params.levelId}/combinations`);
    }
  },

  destroy: async (req, res) => {
    try {
      await Combination.delete(req.params.id);
      req.flash('success', 'Combination deleted.');
      res.redirect(`/admin/levels/${req.params.levelId}/combinations`);
    } catch (err) {
      req.flash('error', 'Failed to delete combination.');
      res.redirect(`/admin/levels/${req.params.levelId}/combinations`);
    }
  }
};

module.exports = combinationController;
