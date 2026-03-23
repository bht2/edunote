const EducationLevel = require('../models/EducationLevel');
const Combination    = require('../models/Combination');
const Class          = require('../models/Class');
const Note           = require('../models/Note');
const path           = require('path');
const fs             = require('fs');
const os             = require('os');
const { execSync }   = require('child_process');

// ── helpers ───────────────────────────────────────────────────────────────────

function getExt(filename) {
  if (!filename) return '';
  return path.extname(filename).toLowerCase().replace('.', '');
}

// Build a proper Cloudinary download URL that includes the original filename.
// Cloudinary raw URLs look like: https://res.cloudinary.com/cloud/raw/upload/v.../public_id
// Appending /original_filename.ext makes the browser save with the right name & extension.
function buildCloudinaryUrl(fileUrl, fileOriginalName) {
  if (!fileUrl || !fileOriginalName) return fileUrl;
  // Already has extension in the URL path — return as-is
  const urlExt = getExt(fileUrl.split('?')[0].split('/').pop());
  if (urlExt) return fileUrl;
  // Append the original filename so Cloudinary serves with proper Content-Disposition
  return fileUrl + '/' + encodeURIComponent(fileOriginalName);
}

// Download a URL to a local temp file, following all redirects
function downloadToTemp(url, ext) {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), `edunote_${Date.now()}.${ext}`);
    const file    = fs.createWriteStream(tmpFile);

    function doRequest(reqUrl, hops) {
      if (hops > 10) { file.close(); return reject(new Error('Too many redirects')); }
      const proto = reqUrl.startsWith('https') ? require('https') : require('http');
      proto.get(reqUrl, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return doRequest(res.headers.location, hops + 1);
        }
        if (res.statusCode !== 200) {
          res.resume(); file.close(); fs.unlink(tmpFile, () => {});
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(tmpFile); });
        file.on('error',  err  => { fs.unlink(tmpFile, () => {}); reject(err); });
      }).on('error', err => { file.close(); fs.unlink(tmpFile, () => {}); reject(err); });
    }
    doRequest(url, 0);
  });
}

// Convert a local file to HTML
async function convertToHtml(filePath, ext) {
  if (ext === 'docx') {
    try {
      const mammoth = require('mammoth');
      const result  = await mammoth.convertToHtml({ path: filePath });
      return { html: result.value };
    } catch (e) { console.error('mammoth error:', e.message); }
  }
  if (['doc', 'ppt', 'pptx'].includes(ext)) {
    try {
      const tmpDir = path.join(os.tmpdir(), 'edunote-convert');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      execSync(
        `libreoffice --headless --convert-to html --outdir "${tmpDir}" "${filePath}"`,
        { timeout: 30000, stdio: 'pipe' }
      );
      const outFile = path.join(tmpDir, path.basename(filePath, path.extname(filePath)) + '.html');
      if (fs.existsSync(outFile)) {
        let html = fs.readFileSync(outFile, 'utf8');
        const m  = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (m) html = m[1];
        html = html.replace(/<meta[^>]*>/gi, '').replace(/<link[^>]*>/gi, '');
        fs.unlinkSync(outFile);
        return { html };
      }
    } catch (e) { console.error('LibreOffice error:', e.message); }
  }
  return null;
}

// Get file content for the reader
async function getFileContent(note) {
  // Always use file_original_name for extension — file_name is Cloudinary public_id
  const ext = getExt(note.file_original_name) || getExt(note.file_name);
  if (!ext) return { readMode: 'unsupported', html: null, txtContent: null };

  // PDF handled separately via /view/:id — no conversion needed here
  if (ext === 'pdf') return { readMode: 'pdf', html: null, txtContent: null };

  const fileUrl = note.file_url;

  // No Cloudinary URL — try legacy local uploads folder
  if (!fileUrl) {
    const fp = path.join(__dirname, '..', 'uploads', note.file_name);
    if (!fs.existsSync(fp)) return { readMode: 'unsupported', html: null, txtContent: null };
    if (ext === 'txt') return { readMode: 'txt', txtContent: fs.readFileSync(fp, 'utf8'), html: null };
    const r = await convertToHtml(fp, ext);
    return r ? { readMode: 'html', html: r.html, txtContent: null }
             : { readMode: 'unsupported', html: null, txtContent: null };
  }

  // Download from Cloudinary then convert
  let tmpPath = null;
  try {
    tmpPath = await downloadToTemp(fileUrl, ext);
    if (ext === 'txt') {
      const txt = fs.readFileSync(tmpPath, 'utf8');
      fs.unlink(tmpPath, () => {});
      return { readMode: 'txt', txtContent: txt, html: null };
    }
    if (['docx', 'doc', 'ppt', 'pptx'].includes(ext)) {
      const r = await convertToHtml(tmpPath, ext);
      fs.unlink(tmpPath, () => {});
      return r ? { readMode: 'html', html: r.html, txtContent: null }
               : { readMode: 'unsupported', html: null, txtContent: null };
    }
    fs.unlink(tmpPath, () => {});
    return { readMode: 'unsupported', html: null, txtContent: null };
  } catch (e) {
    if (tmpPath) fs.unlink(tmpPath, () => {});
    console.error('getFileContent error:', e.message);
    return { readMode: 'unsupported', html: null, txtContent: null };
  }
}

// ── controller ────────────────────────────────────────────────────────────────

const pub = {

  search: async (req, res) => {
    const query = (req.query.q || '').trim();
    if (!query) return res.redirect('/notes');
    try {
      const results = await Note.search(query);
      res.render('public/search', {
        title: 'Search: ' + query + ' — EduNote',
        query,
        notes: results.map(n => ({ ...n, file_size_formatted: Note.formatFileSize(n.file_size) })),
        layout: 'layouts/public'
      });
    } catch (e) {
      console.error(e);
      res.render('public/error', { title: 'Error', message: 'Search failed.', layout: 'layouts/public' });
    }
  },

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
        levels: levelsWithCounts, layout: 'layouts/public'
      });
    } catch (e) {
      console.error(e);
      res.render('public/error', { title: 'Error', message: 'Something went wrong.', layout: 'layouts/public' });
    }
  },

  getLevels: async (req, res) => {
    try {
      const levels = await EducationLevel.findAll();
      res.render('public/levels', { title: 'Browse Notes — EduNote', levels, layout: 'layouts/public' });
    } catch (e) {
      console.error(e);
      res.render('public/error', { title: 'Error', message: 'Something went wrong.', layout: 'layouts/public' });
    }
  },

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

  // GET /read/:id — full online reader
  readNote: async (req, res) => {
    try {
      const note = await Note.findById(req.params.id);
      if (!note) return res.status(404).render('public/error', { title: '404', message: 'Note not found.', layout: 'layouts/public' });
      const fileData = await getFileContent(note);
      res.render('public/reader', {
        title: `${note.title} — Read Online`,
        note:  { ...note, file_size_formatted: Note.formatFileSize(note.file_size) },
        readMode: fileData.readMode, html: fileData.html, txtContent: fileData.txtContent,
        layout: 'layouts/reader'
      });
    } catch (e) {
      console.error('readNote error:', e);
      res.render('public/error', { title: 'Error', message: 'Could not open reader.', layout: 'layouts/public' });
    }
  },

  // GET /download/:id
  // Serves the file via our server so we control Content-Disposition with the real filename.
  // We download to temp then send — this ensures the browser gets the correct filename + extension.
  downloadNote: async (req, res) => {
    try {
      const note = await Note.findById(req.params.id);
      if (!note) return res.status(404).render('public/error', { title: '404', message: 'Note not found.', layout: 'layouts/public' });

      await Note.incrementDownload(note.id);

      if (note.file_url) {
        const ext = getExt(note.file_original_name) || 'bin';
        let tmpPath = null;
        try {
          tmpPath = await downloadToTemp(note.file_url, ext);
          // Send with original filename so browser saves it correctly
          res.download(tmpPath, note.file_original_name, (err) => {
            if (tmpPath) fs.unlink(tmpPath, () => {});
            if (err && !res.headersSent) {
              res.status(500).render('public/error', { title: 'Error', message: 'Download failed.', layout: 'layouts/public' });
            }
          });
        } catch (e) {
          if (tmpPath) fs.unlink(tmpPath, () => {});
          console.error('download fetch error:', e.message);
          res.status(502).render('public/error', { title: 'Error', message: 'Could not fetch file from storage.', layout: 'layouts/public' });
        }
        return;
      }

      // Legacy: local file
      const fp = path.join(__dirname, '..', 'uploads', note.file_name);
      if (!fs.existsSync(fp)) return res.status(404).render('public/error', { title: 'Error', message: 'File not found.', layout: 'layouts/public' });
      res.download(fp, note.file_original_name);
    } catch (e) {
      console.error(e);
      res.render('public/error', { title: 'Error', message: 'Download failed.', layout: 'layouts/public' });
    }
  },

  // GET /view/:id — inline PDF viewer
  // Downloads from Cloudinary to temp file then streams with inline Content-Disposition.
  // We MUST do this (not redirect) because Cloudinary raw files force Content-Disposition:attachment.
  viewNote: async (req, res) => {
    try {
      const note = await Note.findById(req.params.id);
      if (!note) return res.status(404).send('Not found');

      if (note.file_url) {
        let tmpPath = null;
        try {
          tmpPath = await downloadToTemp(note.file_url, 'pdf');
          const stat = fs.statSync(tmpPath);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${note.file_original_name || 'document.pdf'}"`);
          res.setHeader('Content-Length', stat.size);
          const stream = fs.createReadStream(tmpPath);
          stream.pipe(res);
          stream.on('end', () => { fs.unlink(tmpPath, () => {}); });
          stream.on('error', () => { fs.unlink(tmpPath, () => {}); });
        } catch (e) {
          if (tmpPath) fs.unlink(tmpPath, () => {});
          console.error('viewNote fetch error:', e.message);
          res.status(502).send('Could not load PDF');
        }
        return;
      }

      // Legacy: local file
      const fp = path.join(__dirname, '..', 'uploads', note.file_name);
      if (!fs.existsSync(fp)) return res.status(404).send('File not found');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${note.file_original_name}"`);
      fs.createReadStream(fp).pipe(res);
    } catch (e) {
      console.error(e);
      res.status(500).send('Error');
    }
  }
};

module.exports = pub;
