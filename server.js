require('dotenv').config();
const express    = require('express');
const session    = require('express-session');
const flash      = require('connect-flash');
const ejsLayouts = require('express-ejs-layouts');
const path       = require('path');

const app  = express();
app.set('trust proxy', 1); // Trust Railway reverse proxy
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(ejsLayouts);
app.set('layout', 'layouts/public');

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'edunote-v2-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.HTTPS === 'true',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(flash());

// Make session data and role available to all views
app.use((req, res, next) => {
  res.locals.success_msg    = req.flash('success');
  res.locals.error_msg      = req.flash('error');
  res.locals.adminId        = req.session.adminId     || null;
  res.locals.adminName      = req.session.adminName   || null;
  res.locals.adminEmail     = req.session.adminEmail  || null;
  res.locals.adminAvatar    = req.session.adminAvatar || null;
  res.locals.adminRole      = req.session.adminRole   || null;   // 'admin' or 'sub'
  res.locals.adminLevelId   = req.session.adminLevelId || null;  // sub-admin's level
  res.locals.isSuperAdmin   = req.session.adminRole === 'admin'; // convenience flag for views
  next();
});

app.use('/',      require('./routes/public'));
app.use('/admin', require('./routes/admin'));

// 404
app.use((req, res) => {
  res.status(404).render('public/error', {
    title: '404 — Not Found',
    message: 'The page you are looking for does not exist.',
    layout: 'layouts/public'
  });
});

// 500
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('public/error', {
    title: '500 — Server Error',
    message: 'Something went wrong on our end.',
    layout: 'layouts/public'
  });
});

// Keep MySQL pool alive
const db = require('./config/database');
setInterval(() => {
  db.execute('SELECT 1').catch(err => console.error('DB keep-alive error:', err.message));
}, 5 * 60 * 1000);
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 EduNote v2 running at http://localhost:${PORT}`);
  console.log(`📚 Admin: https://localhost:${PORT}/admin/login`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
