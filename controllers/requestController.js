const ComboRequest = require('../models/ComboRequest');
const Combination  = require('../models/Combination');

module.exports = {

  index: async (req, res) => {
    try {
      const requests     = await ComboRequest.findAll();
      const pendingCount = await ComboRequest.countPending();
      res.render('admin/requests/index', {
        layout: 'layouts/admin',
        title: 'Change Requests — EduNote',
        requests,
        pendingCount
      });
    } catch (err) {
      console.error(err);
      req.flash('error', 'Error loading requests.');
      res.redirect('/admin/dashboard');
    }
  },

  approve: async (req, res) => {
    try {
      const request = await ComboRequest.findById(req.params.id);
      if (!request || request.status !== 'pending') {
        req.flash('error', 'Request not found or already reviewed.');
        return res.redirect('/admin/requests');
      }

      const data = typeof request.requested_data === 'string'
        ? JSON.parse(request.requested_data)
        : request.requested_data;

      if (request.request_type === 'create') {
        const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        await Combination.create({
          educationLevelId: request.education_level_id,
          name:             data.name,
          slug,
          fullName:         data.full_name || '',
          description:      data.description || '',
          color:            data.color || '#6366f1',
          orderIndex:       data.order_index || 0
        });
        req.flash('success', `✅ Approved — new combination "${data.name}" created.`);

      } else if (request.request_type === 'edit') {
        const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        await Combination.update(request.combo_id, {
          name:       data.name,
          slug,
          fullName:   data.full_name || '',
          description: data.description || '',
          color:      data.color || '#6366f1',
          orderIndex: data.order_index || 0
        });
        req.flash('success', '✅ Approved — combination updated.');

      } else if (request.request_type === 'delete') {
        await Combination.delete(request.combo_id);
        req.flash('success', '✅ Approved — combination deleted.');
      }

      await ComboRequest.approve(req.params.id, req.session.adminId);
      res.redirect('/admin/requests');
    } catch (err) {
      console.error(err);
      req.flash('error', 'Error approving request: ' + err.message);
      res.redirect('/admin/requests');
    }
  },

  reject: async (req, res) => {
    try {
      const { reason } = req.body;
      await ComboRequest.reject(req.params.id, req.session.adminId, reason);
      req.flash('success', 'Request rejected.');
      res.redirect('/admin/requests');
    } catch (err) {
      req.flash('error', 'Error rejecting request.');
      res.redirect('/admin/requests');
    }
  }
};
