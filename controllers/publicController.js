const EducationLevel = require('../models/EducationLevel');
const Combination    = require('../models/Combination');
const Class          = require('../models/Class');
const Note           = require('../models/Note');
const path           = require('path');
const fs             = require('fs');
const os             = require('os');

// ── helpers ───────────────────────────────────────────────────────────────────

function getExt(filename) {
  if (!filename) return '';
  return path.extname(filename).toLowerCase().replace('.', '');
}

// Stream a remote URL through our server to the browser response.
// Follows redirects and strips X-Frame-Options so PDFs work in iframes.
function proxyStream(url, res, hops) {
  if (hops > 10) { if (!res.headersSent) res.status(500).send('Too many redirects'); return; }
  const proto = url.startsWith('https') ? require('https') : require('http');
  const req   = proto.get(url, (upstream) => {
    if (upstream.statusCode >= 300 && upstream.statusCode < 400 && upstream.headers.location) {
      upstream.resume();
      return proxyStream(upstream.headers.location, res, hops + 1);
    }
    if (upstream.statusCode !== 200) {
      upstream.resume();
      if (!res.headersSent) res.status(upstream.statusCode || 502).send('File unavailable');
      return;
    }
    res.setHeader('Content-Type', upstream.headers['content-type'] || 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.removeHeader('Content-Security-Policy');
    upstream.pipe(res);
  });
  req.on('error', (err) => {
    console.error('[proxy] error:', err.message);
    if (!res.headersSent) res.status(502).send('Proxy error: ' + err.message);
  });
  req.setTimeout(30000, () => {
    req.destroy();
    if (!res.headersSent) res.status(504).send('Proxy timeout');
  });
}

// Determine how to render a note in the reader.
// Returns { readMode, fileUrl }
// readMode values:
//   'pdf'      → proxy through /view/:id → iframe
//   'office'   → Google Docs Viewer iframe (DOCX, DOC, PPT, PPTX)
//   'txt'      → browser-side fetch + display
//   'unsupported' → show download prompt
function getReadMode(note) {
  const ext    = getExt(note.file_original_name) || getExt(note.file_name);
  const url    = note.file_url || '';

  if (!ext || !url) return { readMode: 'unsupported', fileUrl: url };

  if (ext === 'pdf')                              return { readMode: 'pdf',     fileUrl: url };
  if (['docx','doc','ppt','pptx'].includes(ext))  return { readMode: 'office',  fileUrl: url };
  if (ext === 'txt')                              return { readMode: 'txt',     fileUrl: url };

  return { readMode: 'unsupported', fileUrl: url };
}

// ── controller ────────────────────────────────────────────────────────────────

const pub = {

  // GET /
  index: async (req, res) => {
    try {
      const levels = await EducationLevel.findAll();
      const levelsWithCounts = await Promise.all(levels.map(async (l) => {
        const combos = await Combination.findByLevel(l.id);
        let noteCount = 0;
        for (const c of combos) {
          const classes = await Class.findByCombination(c.id);
          for (const cl of classes) noteCount += (cl.note_count || 0);
        }
        return { ...l, note_count: noteCount, combo_count: combos.length };
      }));
      res.render('public/index', {
        title: 'EduNote — Free Educational Notes for Rwanda',
        levels: levelsWithCounts,
        layout: 'layouts/public'
      });
    } catch (e) {
      console.error(e);
      res.render('public/error', { title: 'Error', message: 'Something went wrong.', layout: 'layouts/public' });
    }
  },

  // GET /notes
  getLevels: async (req, res) => {
    try {
      const levels = await EducationLevel.findAll();
      res.render('public/levels', { title: 'Browse Notes — EduNote', levels, layout: 'layouts/public' });
    } catch (e) {
      console.error(e);
      res.render('public/error', { title: 'Error', message: 'Something went wrong.', layout: 'layouts/public' });
    }
  },

  // GET /notes/:levelSlug
  getCombinations: async (req, res) => {
    try {
      const level = await EducationLevel.findBySlug(req.params.levelSlug);
      if (!level) return res.status(404).render('public/error', { title: '404', message: 'Level not found.', layout: 'layouts/public' });
      const combinations = await Combination.findByLevel(level.id);
      res.render('public/combinations', {
        title: `${level.name} — Choose Combination`,
        level, combinations, layout: 'layouts/public'
      });
    } catch (e) {
      console.error(e);
      res.render('public/error', { title: 'Error', message: 'Something went wrong.', layout: 'layouts/public' });
    }
  },

  // GET /notes/:levelSlug/:comboSlug
  getClasses: async (req, res) => {
    try {
      const level = await EducationLevel.findBySlug(req.params.levelSlug);
      const combo = await Combination.findBySlug(req.params.comboSlug);
      if (!level || !combo || combo.education_level_id !== level.id)
        return res.status(404).render('public/error', { title: '404', message: 'Page not found.', layout: 'layouts/public' });
      const classes   = await Class.findByCombination(combo.id);
      const allCombos = await Combination.findByLevel(level.id);
      res.render('public/classes', {
        title: `${combo.name} — Choose Class`,
        level, combo, classes, allCombos, layout: 'layouts/public'
      });
    } catch (e) {
      console.error(e);
      res.render('public/error', { title: 'Error', message: 'Something went wrong.', layout: 'layouts/public' });
    }
  },

  // GET /notes/:levelSlug/:comboSlug/:classSlug
  getNotes: async (req, res) => {
    try {
      const level = await EducationLevel.findBySlug(req.params.levelSlug);
      const combo = await Combination.findBySlug(req.params.comboSlug);
      const cls   = await Class.findBySlug(req.params.classSlug);
      if (!level || !combo || !cls
          || combo.education_level_id !== level.id
          || cls.combination_id      !== combo.id)
        return res.status(404).render('public/error', { title: '404', message: 'Page not found.', layout: 'layouts/public' });
      const notes      = await Note.findByClass(cls.id);
      const allClasses = await Class.findByCombination(combo.id);
      const allCombos  = await Combination.findByLevel(level.id);
      res.render('public/notes', {
        title: `${cls.name} — ${combo.name} Notes`,
        level, combo, cls, allCombos, allClasses,
        notes: notes.map(n => ({ ...n, file_size_formatted: Note.formatFileSize(n.file_size) })),
        layout: 'layouts/public'
      });
    } catch (e) {
      console.error(e);
      res.render('public/error', { title: 'Error', message: 'Something went wrong.', layout: 'layouts/public' });
    }
  },

  // GET /read/:id — reader page
  // PDF    → /view/:id proxied through server (avoids Cloudinary X-Frame-Options)
  // Office → Google Docs Viewer iframe (Google fetches from Cloudinary, we don't)
  // TXT    → browser fetches file_url via JS fetch()
  readNote: async (req, res) => {
    try {
      const note = await Note.findById(req.params.id);
      if (!note) return res.status(404).render('public/error', { title: '404', message: 'Note not found.', layout: 'layouts/public' });

      const { readMode, fileUrl } = getReadMode(note);

      res.render('public/reader', {
        title:    `${note.title} — Read Online`,
        note:     { ...note, file_size_formatted: Note.formatFileSize(note.file_size) },
        readMode,
        fileUrl,
        html:       null,
        txtContent: null,
        layout: 'layouts/reader'
      });
    } catch (e) {
      console.error('readNote error:', e);
      res.render('public/error', { title: 'Error', message: 'Could not open reader.', layout: 'layouts/public' });
    }
  },

  // GET /download/:id
  downloadNote: async (req, res) => {
    try {
      const note = await Note.findById(req.params.id);
      if (!note) return res.status(404).render('public/error', { title: '404', message: 'Note not found.', layout: 'layouts/public' });
      await Note.incrementDownload(note.id);
      if (note.file_url) return res.redirect(note.file_url);
      const fp = path.join(__dirname, '..', 'uploads', note.file_name);
      if (!fs.existsSync(fp)) return res.status(404).render('public/error', { title: 'Error', message: 'File not found.', layout: 'layouts/public' });
      res.download(fp, note.file_original_name);
    } catch (e) {
      console.error(e);
      res.render('public/error', { title: 'Error', message: 'Download failed.', layout: 'layouts/public' });
    }
  },

  // GET /view/:id — proxy PDF bytes through server so iframe works
  // (Cloudinary sends X-Frame-Options: DENY, we strip it)
  viewNote: async (req, res) => {
    try {
      const note = await Note.findById(req.params.id);
      if (!note) return res.status(404).send('Not found');
      if (note.file_url) return proxyStream(note.file_url, res, 0);
      // Legacy local file
      const fp = path.join(__dirname, '..', 'uploads', note.file_name);
      if (!fs.existsSync(fp)) return res.status(404).send('File not found');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      fs.createReadStream(fp).pipe(res);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) res.status(500).send('Error');
    }
  }
};

module.exports = pub;
