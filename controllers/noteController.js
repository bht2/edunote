const Note        = require('../models/Note');
const Class       = require('../models/Class');
const Combination = require('../models/Combination');
const { upload, uploadToCloudinary, deleteFromCloudinary } = require('../middleware/upload');
const path = require('path');

const noteController = {
  index: async (req, res) => {
    try {
      const cls   = await Class.findById(req.params.classId);
      if (!cls) { req.flash('error', 'Class not found.'); return res.redirect('/admin/levels'); }
      const combo = await Combination.findById(cls.combination_id);
      const notes = await Note.findByClass(cls.id);
      const notesWithSize = notes.map(n => ({ ...n, file_size_formatted: Note.formatFileSize(n.file_size) }));
      res.render('admin/notes/index', {
        title: `${combo.name} ${cls.name} — Notes`,
        layout: 'layouts/admin', cls, combo, notes: notesWithSize
      });
    } catch (err) {
      req.flash('error', 'Failed to load notes.');
      res.redirect('/admin/levels');
    }
  },

  create: async (req, res) => {
    try {
      const cls   = await Class.findById(req.params.classId);
      const combo = await Combination.findById(cls.combination_id);
      res.render('admin/notes/create', { title: 'Upload Note', layout: 'layouts/admin', cls, combo });
    } catch (err) {
      req.flash('error', 'Failed to load form.');
      res.redirect('/admin/levels');
    }
  },

  store: [
    upload.single('note_file'),
    async (req, res) => {
      try {
        const cls = await Class.findById(req.params.classId);
        if (!req.file) {
          req.flash('error', 'Please select a file to upload.');
          return res.redirect(`/admin/classes/${cls.id}/notes/create`);
        }
        const { title, description, subject } = req.body;
        const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);
        await Note.create({
          classId: cls.id,
          title,
          description,
          subject,
          fileName: result.public_id,
          fileOriginalName: req.file.originalname,
          fileUrl: result.secure_url,
          fileSize: req.file.size,
          fileType: req.file.mimetype,
          cloudinaryPublicId: result.public_id
        });
        req.flash('success', `Note "${title}" uploaded successfully.`);
        res.redirect(`/admin/classes/${cls.id}/notes`);
      } catch (err) {
        console.error(err);
        req.flash('error', 'Failed to upload note: ' + err.message);
        res.redirect(`/admin/classes/${req.params.classId}/notes/create`);
      }
    }
  ],

  edit: async (req, res) => {
    try {
      const note  = await Note.findById(req.params.id);
      const cls   = await Class.findById(note.class_id);
      const combo = await Combination.findById(cls.combination_id);
      res.render('admin/notes/edit', { title: 'Edit Note', layout: 'layouts/admin', note, cls, combo });
    } catch (err) {
      req.flash('error', 'Failed to load note.');
      res.redirect('/admin/levels');
    }
  },

  update: [
    upload.single('note_file'),
    async (req, res) => {
      try {
        const note = await Note.findById(req.params.id);
        const { title, description, subject } = req.body;
        if (req.file) {
          // Delete old file from cloudinary
          if (note.cloudinary_public_id) {
            await deleteFromCloudinary(note.cloudinary_public_id, 'raw');
          }
          const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);
          await Note.update(note.id, {
            title, description, subject,
            fileName: result.public_id,
            fileOriginalName: req.file.originalname,
            fileUrl: result.secure_url,
            fileSize: req.file.size,
            fileType: req.file.mimetype,
            cloudinaryPublicId: result.public_id
          });
        } else {
          await Note.update(note.id, { title, description, subject });
        }
        req.flash('success', 'Note updated.');
        res.redirect(`/admin/classes/${note.class_id}/notes`);
      } catch (err) {
        req.flash('error', 'Failed to update note.');
        res.redirect(`/admin/classes/${req.params.classId}/notes`);
      }
    }
  ],

  destroy: async (req, res) => {
    try {
      const note = await Note.findById(req.params.id);
      if (note && note.cloudinary_public_id) {
        await deleteFromCloudinary(note.cloudinary_public_id, 'raw');
      }
      await Note.delete(req.params.id);
      req.flash('success', 'Note deleted.');
      res.redirect(`/admin/classes/${note.class_id}/notes`);
    } catch (err) {
      req.flash('error', 'Failed to delete note.');
      res.redirect('/admin/levels');
    }
  }
};

module.exports = noteController;
