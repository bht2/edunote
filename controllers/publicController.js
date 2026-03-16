const EducationLevel = require('../models/EducationLevel');
const Combination    = require('../models/Combination');
const Class          = require('../models/Class');
const Note           = require('../models/Note');
const path           = require('path');
const fs             = require('fs');
const os             = require('os');
const { execSync }   = require('child_process');

// ── helpers ──────────────────────────────────────────────────────────────────

function getExt(filename) {
  if (!filename) return '';
  return path.extname(filename).toLowerCase().replace('.', '');
}

// Download a URL to a temp file — follows redirects (Cloudinary uses them)
function downloadToTemp(url, ext) {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), `edunote_${Date.now()}.${ext}`);
    const file    = fs.createWriteStream(tmpFile);

    function doRequest(reqUrl, redirectCount) {
      if (redirectCount > 5) return reject(new Error('Too many redirects'));
      const proto = reqUrl.startsWith('https') ? require('https') : require('http');
      proto.get(reqUrl, res => {
        // Follow redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return doRequest(res.headers.location, redirectCount + 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          file.close();
          fs.unlink(tmpFile, () => {});
          return reject(new Error(`HTTP ${res.statusCode} for ${reqUrl}`));
        }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(tmpFile); });
        file.on('error',  err => { fs.unlink(tmpFile, () => {}); reject(err); });
      }).on('error', err => {
        file.close();
        fs.unlink(tmpFile, () => {});
        reject(err);
      });
    }

    doRequest(url, 0);
  });
}

// Convert local file to HTML (mammoth for docx, LibreOffice for doc/ppt/pptx)
async function convertToHtml(filePath, ext) {
  if (ext === 'docx') {
    try {
      const mammoth = require('mammoth');
      const result  = await mammoth.convertToHtml({ path: filePath });
      return { html: result.value, method: 'mammoth' };
    } catch (e) {
      console.error('mammoth error:', e.message);
    }
  }
  if (['doc', 'ppt', 'pptx'].includes(ext)) {
    try {
      const tmpDir = path.join(os.tmpdir(), 'edunote-convert');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      execSync(
        `libreoffice --headless --convert-to html --outdir "${tmpDir}" "${filePath}"`,
        { timeout: 30000, stdio: 'pipe' }
      );
      const baseName = path.basename(filePath, path.extname(filePath));
      const outFile  = path.join(tmpDir, baseName + '.html');
      if (fs.existsSync(outFile)) {
        let html = fs.readFileSync(outFile, 'utf8');
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) html = bodyMatch[1];
        html = html.replace(/<meta[^>]*>/gi, '').replace(/<link[^>]*>/gi, '');
        fs.unlinkSync(outFile);
        return { html, method: 'libreoffice' };
      }
    } catch (e) {
      console.error('LibreOffice convert error:', e.message);
    }
  }
  return null;
}

// Get file content for reader — downloads from Cloudinary if needed
async function getFileContent(note) {
  // Always use file_original_name for extension — file_name is Cloudinary public_id
  const ext = getExt(note.file_original_name) || getExt(note.file_name);

  if (!ext) return { readMode: 'unsupported', html: null, txtContent: null };

  // PDF — no server-side work needed, embed via URL directly
  if (ext === 'pdf') return { readMode: 'pdf', html: null, txtContent: null };

  // For everything else we need the actual file bytes
  const fileUrl = note.file_url;
  if (!fileUrl) {
    // Legacy: try local uploads folder
    const fp = path.join(__dirname, '..', 'uploads', note.file_name);
    if (!fs.existsSync(fp)) return { readMode: 'unsupported', html: null, txtContent: null };
    if (ext === 'txt') return { readMode: 'txt', txtContent: fs.readFileSync(fp, 'utf8'), html: null };
    const result = await convertToHtml(fp, ext);
    if (result) return { readMode: 'html', html: result.html, txtContent: null };
    return { readMode: 'unsupported', html: null, txtContent: null };
  }

  // Download from Cloudinary to temp file
  let tmpPath = null;
  try {
    tmpPath = await downloadToTemp(fileUrl, ext);

    if (ext === 'txt') {
      const txt = fs.readFileSync(tmpPath, 'utf8');
      fs.unlink(tmpPath, () => {});
      return { readMode: 'txt', txtContent: txt, html: null };
    }

    if (['docx', 'doc', 'ppt', 'pptx'].includes(ext)) {
      const result = await convertToHtml(tmpPath, ext);
      fs.unlink(tmpPath, () => {});
      if (result) return { readMode: 'html', html: result.html, txtContent: null };
      return { readMode: 'unsupported', html: null, txtContent: null };
    }

    fs.unlink(tmpPath, () => {});
    return { readMode: 'unsupported', html: null, txtContent: null };

  } catch (e) {
    if (tmpPath) fs.unlink(tmpPath, () => {});
    console.error('getFileContent download error:', e.message);
    return { readMode: 'unsupported', html: null, txtContent: null };
  }
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

  // GET /notes — list all education levels
  getLevels: async (req, res) => {
    try {
      const levels = await EducationLevel.findAll();
      res.render('public/levels', { title: 'Browse Notes — EduNote', levels, layout: 'layouts/public' });
    } catch (e) {
      console.error(e);
      res.render('public/error', { title: 'Error', message: 'Something went wrong.', layout: 'layouts/public' });
    }
  },

  // GET /notes/:levelSlug — combinations inside a level
  getCombinations: async (req, res) => {
    try {
      const level = await EducationLevel.findBySlug(req.params.levelSlug);
      if (!level) return res.status(404).render('public/error', { title: '404', message: 'Level not found.', layout: 'layouts/public' });
      const combinations = await Combination.findByLevel(level.id);
      res.render('public/combinations', {
        title: `${level.name} — Choose Combination`,
        level, combinations,
        layout: 'layouts/public'
      });
    } catch (e) {
      console.error(e);
      res.render('public/error', { title: 'Error', message: 'Something went wrong.', layout: 'layouts/public' });
    }
  },

  // GET /notes/:levelSlug/:comboSlug — notes grouped by class
  getNotes: async (req, res) => {
    try {
      const level = await EducationLevel.findBySlug(req.params.levelSlug);
      const combo = await Combination.findBySlug(req.params.comboSlug);
      if (!level || !combo || combo.education_level_id !== level.id)
        return res.status(404).render('public/error', { title: '404', message: 'Page not found.', layout: 'layouts/public' });

      const classes     = await Class.findByCombination(combo.id);
      const classesWith = await Promise.all(classes.map(async (cl) => {
        const notes = await Note.findByClass(cl.id);
        return { ...cl, notes: notes.map(n => ({ ...n, file_size_formatted: Note.formatFileSize(n.file_size) })) };
      }));
      const allNotes  = classesWith.flatMap(cl => cl.notes);
      const allCombos = await Combination.findByLevel(level.id);

      res.render('public/notes', {
        title: `${combo.name} — ${level.name} Notes`,
        level, combo, allCombos, classesWith, allNotes,
        layout: 'layouts/public'
      });
    } catch (e) {
      console.error(e);
      res.render('public/error', { title: 'Error', message: 'Something went wrong.', layout: 'layouts/public' });
    }
  },

  // GET /read/:id — full online reader (PDF embed, DOCX/DOC/PPT/PPTX converted, TXT rendered)
  readNote: async (req, res) => {
    try {
      const note = await Note.findById(req.params.id);
      if (!note) return res.status(404).render('public/error', { title: '404', message: 'Note not found.', layout: 'layouts/public' });

      const fileData = await getFileContent(note);

      res.render('public/reader', {
        title: `${note.title} — Read Online`,
        note:  { ...note, file_size_formatted: Note.formatFileSize(note.file_size) },
        readMode:   fileData.readMode,
        html:       fileData.html,
        txtContent: fileData.txtContent,
        layout: 'layouts/reader'
      });
    } catch (e) {
      console.error('readNote error:', e);
      res.render('public/error', { title: 'Error', message: 'Could not open reader.', layout: 'layouts/public' });
    }
  },

  // GET /download/:id — redirect to Cloudinary URL and track download
  downloadNote: async (req, res) => {
    try {
      const note = await Note.findById(req.params.id);
      if (!note) return res.status(404).render('public/error', { title: '404', message: 'Note not found.', layout: 'layouts/public' });
      await Note.incrementDownload(note.id);
      if (note.file_url) return res.redirect(note.file_url);
      // Legacy: local file
      const fp = path.join(__dirname, '..', 'uploads', note.file_name);
      if (!fs.existsSync(fp)) return res.status(404).render('public/error', { title: 'Error', message: 'File not found.', layout: 'layouts/public' });
      res.download(fp, note.file_original_name);
    } catch (e) {
      console.error(e);
      res.render('public/error', { title: 'Error', message: 'Download failed.', layout: 'layouts/public' });
    }
  },

  // GET /view/:id — inline PDF viewer (redirects to Cloudinary URL)
  viewNote: async (req, res) => {
    try {
      const note = await Note.findById(req.params.id);
      if (!note) return res.status(404).send('Not found');
      if (note.file_url) return res.redirect(note.file_url);
      // Legacy: stream local file
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
