const Combination    = require('../models/Combination');
const EducationLevel = require('../models/EducationLevel');
const ComboRequest   = require('../models/ComboRequest');

const combinationController = {

  index: async (req, res) => {
    try {
      const level = await EducationLevel.findById(req.params.levelId);
      if (!level) { req.flash('error', 'Level not found.'); return res.redirect('/admin/levels'); }
      const combinations = await Combination.findByLevel(level.id);
      res.render('admin/combinations/index', {
        title: `${level.name} — Combinations`,
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
      // Sub-admin sees a request form; main admin sees direct create form
      res.render('admin/combinations/create', {
        title: res.locals.isSuperAdmin ? 'Add Combination' : 'Request New Combination',
        layout: 'layouts/admin', level
      });
    } catch (err) {
      req.flash('error', 'Failed to load form.');
      res.redirect('/admin/levels');
    }
  },

  store: async (req, res) => {
    try {
      const level = await EducationLevel.findById(req.params.levelId);
      const { name, full_name, description, color, order_index } = req.body;

      if (res.locals.isSuperAdmin) {
        // Main admin — create directly
        const slug = Combination.toSlug(level.slug, name);
        await Combination.create({
          educationLevelId: level.id, name, slug,
          fullName: full_name, description, color, orderIndex: order_index || 0
        });
        req.flash('success', `Combination "${name}" created.`);
      } else {
        // Sub-admin — submit a request for main admin to approve
        await ComboRequest.create({
          sub_admin_id:       req.session.adminId,
          education_level_id: level.id,
          combo_id:           null,
          request_type:       'create',
          requested_data:     { name, full_name, description, color, order_index }
        });
        req.flash('success', `Request to add "${name}" submitted for approval.`);
      }
      res.redirect(`/admin/levels/${level.id}/combinations`);
    } catch (err) {
      req.flash('error', 'Failed. Name may already exist.');
      res.redirect(`/admin/levels/${req.params.levelId}/combinations/create`);
    }
  },

  edit: async (req, res) => {
    try {
      const level = await EducationLevel.findById(req.params.levelId);
      const combo = await Combination.findById(req.params.id);
      if (!combo) { req.flash('error', 'Combination not found.'); return res.redirect(`/admin/levels/${req.params.levelId}/combinations`); }
      res.render('admin/combinations/edit', {
        title: res.locals.isSuperAdmin ? 'Edit Combination' : 'Request Edit Combination',
        layout: 'layouts/admin', level, combo
      });
    } catch (err) {
      req.flash('error', 'Failed to load combination.');
      res.redirect(`/admin/levels/${req.params.levelId}/combinations`);
    }
  },

  update: async (req, res) => {
    try {
      const level = await EducationLevel.findById(req.params.levelId);
      const { name, full_name, description, color, order_index } = req.body;

      if (res.locals.isSuperAdmin) {
        // Main admin — update directly
        const slug = Combination.toSlug(level.slug, name);
        await Combination.update(req.params.id, {
          name, slug, fullName: full_name, description, color, orderIndex: order_index || 0
        });
        req.flash('success', 'Combination updated.');
      } else {
        // Sub-admin — submit edit request
        await ComboRequest.create({
          sub_admin_id:       req.session.adminId,
          education_level_id: level.id,
          combo_id:           req.params.id,
          request_type:       'edit',
          requested_data:     { name, full_name, description, color, order_index }
        });
        req.flash('success', 'Edit request submitted for approval.');
      }
      res.redirect(`/admin/levels/${level.id}/combinations`);
    } catch (err) {
      req.flash('error', 'Failed to update combination.');
      res.redirect(`/admin/levels/${req.params.levelId}/combinations`);
    }
  },

  destroy: async (req, res) => {
    try {
      const level = await EducationLevel.findById(req.params.levelId);

      if (res.locals.isSuperAdmin) {
        // Main admin — delete directly
        await Combination.delete(req.params.id);
        req.flash('success', 'Combination deleted.');
      } else {
        // Sub-admin — submit delete request
        const combo = await Combination.findById(req.params.id);
        await ComboRequest.create({
          sub_admin_id:       req.session.adminId,
          education_level_id: level.id,
          combo_id:           req.params.id,
          request_type:       'delete',
          requested_data:     { name: combo ? combo.name : '' }
        });
        req.flash('success', 'Delete request submitted for approval.');
      }
      res.redirect(`/admin/levels/${level.id}/combinations`);
    } catch (err) {
      req.flash('error', 'Failed to delete combination.');
      res.redirect(`/admin/levels/${req.params.levelId}/combinations`);
    }
  }
};

module.exports = combinationController;
