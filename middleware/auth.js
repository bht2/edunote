// Check any logged-in admin (main or sub)
const isAdmin = (req, res, next) => {
  if (req.session && req.session.adminId) return next();
  req.flash('error', 'Please login to access the admin panel.');
  res.redirect('/admin/login');
};

// Check main admin only (role === 'admin')
const isSuperAdmin = (req, res, next) => {
  if (req.session && req.session.adminId && req.session.adminRole === 'admin') return next();
  req.flash('error', 'Access denied. Main admin only.');
  res.redirect('/admin/dashboard');
};

module.exports = { isAdmin, isSuperAdmin };
