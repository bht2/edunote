const Sector = require('../models/Sector');
const Level  = require('../models/Level');
const Note   = require('../models/Note');
const path   = require('path');
const fs     = require('fs');
const { execSync } = require('child_process');

// \u2500\u2500 helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function getExt(filename) {
  return path.extname(filename).toLowerCase().replace('.', '');
}

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

  // For doc, ppt, pptx \u2014 try LibreOffice
  if (['doc','ppt','pptx','docx'].includes(ext)) {
    try {
      const tmpDir = path.join(require('os').tmpdir(), 'edunote-convert');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      execSync(
        `libreoffice --headless --convert-to html --outdir "${tmpDir}" "${filePath}"`,
        { timeout: 30000, stdio: 'pipe' }
      );

      const baseName = path.basename(filePath, path.extname(filePath));
      const outFile  = path.join(tmpDir, baseName + '.html');

      if (fs.existsSync(outFile)) {
        let html = fs.readFileSync(outFile, 'utf8');
        // Extract just the body content
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) html = bodyMatch[1];
        // Clean up LO's inline styles a bit
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
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const pub = {

  // GET /
  index: async (req, res) => {
    try {
      const sectors = await Sector.findAll();
      const levels  = await Level.findAll();
      res.render('public/index', { title: 'EduNote - Your Learning Resource Hub', sectors, levels, layout: 'layouts/public' });
    } catch (e) { console.error(e); res.render('public/error', { title: 'Error', message: 'Something went wrong.', layout: 'layouts/public' }); }
  },

  // GET /notes
  getSectors: async (req, res) => {
    try {
      const sectors = await Sector.findAll();
      res.render('public/sectors', { title: 'Browse Subjects - EduNote', sectors, layout: 'layouts/public' });
    } catch (e) { console.error(e); res.render('public/error', { title: 'Error', message: 'Something went wrong.', layout: 'layouts/public' }); }
  },

  // GET /notes/:sectorSlug
  getSectorLevels: async (req, res) => {
    try {
      const sector = await Sector.findBySlug(req.params.sectorSlug);
      if (!sector) return res.status(404).render('public/error', { title: '404', message: 'Sector not found.', layout: 'layouts/public' });
      const levels = await Level.findBySector(sector.id);
      res.render('public/sector-levels', { title: `${sector.name} \u2014 Choose Level - EduNote`, sector, levels, layout: 'layouts/public' });
    } catch (e) { console.error(e); res.render('public/error', { title: 'Error', message: 'Something went wrong.', layout: 'layouts/public' }); }
  },

  // GET /notes/:sectorSlug/:levelSlug
  getLevelNotes: async (req, res) => {
    try {
      const sector = await Sector.findBySlug(req.params.sectorSlug);
      const level  = await Level.findBySlug(req.params.levelSlug);
      if (!sector || !level || level.sector_id !== sector.id)
        return res.status(404).render('public/error', { title: '404', message: 'Page not found.', layout: 'layouts/public' });

      const notes     = await Note.findByLevel(level.id);
      const allLevels = await Level.findBySector(sector.id);

      res.render('public/notes', {
        title: `${level.name} \u2014 ${sector.name} Notes - EduNote`,
        sector, level, allLevels,
        notes: notes.map(n => ({ ...n, file_size_formatted: Note.formatFileSize(n.file_size) })),
        layout: 'layouts/public'
      });
    } catch (e) { console.error(e); res.render('public/error', { title: 'Error', message: 'Something went wrong.', layout: 'layouts/public' }); }
  },

  // GET /read/:id \u2014 full-page online reader
  readNote: async (req, res) => {
    try {
      const note = await Note.findById(req.params.id);
      if (!note) return res.status(404).render('public/error', { title: '404', message: 'Note not found.', layout: 'layouts/public' });

      const fp  = path.join(__dirname, '..', 'uploads', note.file_name);
      if (!fs.existsSync(fp)) return res.status(404).render('public/error', { title: 'Error', message: 'File not found.', layout: 'layouts/public' });

      const ext      = getExt(note.file_name);
      let   readMode = 'unsupported';
      let   html     = null;
      let   txtContent = null;

      if (ext === 'pdf') {
        readMode = 'pdf';
      } else if (ext === 'txt') {
        readMode = 'txt';
        txtContent = fs.readFileSync(fp, 'utf8');
      } else if (['docx', 'doc', 'ppt', 'pptx'].includes(ext)) {
        const result = await convertToHtml(fp, ext);
        if (result) {
          readMode = 'html';
          html = result.html;
        } else {
          readMode = 'unsupported';
        }
      }

      res.render('public/reader', {
        title: note.title + ' \u2014 Read Online',
        note: { ...note, file_size_formatted: Note.formatFileSize(note.file_size) },
        readMode,
        html,
        txtContent,
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
      const fp = path.join(__dirname, '..', 'uploads', note.file_name);
      if (!fs.existsSync(fp)) return res.status(404).render('public/error', { title: 'Error', message: 'File not found.', layout: 'layouts/public' });
      await Note.incrementDownload(note.id);
      res.download(fp, note.file_original_name);
    } catch (e) { console.error(e); res.render('public/error', { title: 'Error', message: 'Download failed.', layout: 'layouts/public' }); }
  },

  // GET /view/:id \u2014 inline PDF stream
  viewNote: async (req, res) => {
    try {
      const note = await Note.findById(req.params.id);
      if (!note) return res.status(404).send('Not found');
      const fp = path.join(__dirname, '..', 'uploads', note.file_name);
      if (!fs.existsSync(fp)) return res.status(404).send('File not found');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${note.file_original_name}"`);
      fs.createReadStream(fp).pipe(res);
    } catch (e) { console.error(e); res.status(500).send('Error'); }
  }
};

module.exports = pub;