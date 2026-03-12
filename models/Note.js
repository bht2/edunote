const db = require('../config/database');

class Note {
  static async findAll() {
    const [rows] = await db.execute(`
      SELECT n.*, cl.name as class_name, c.name as combo_name, e.name as level_name
      FROM notes n
      JOIN classes cl ON n.class_id = cl.id
      JOIN combinations c ON cl.combination_id = c.id
      JOIN education_levels e ON c.education_level_id = e.id
      ORDER BY n.created_at DESC
    `);
    return rows;
  }

  static async findByClass(classId) {
    const [rows] = await db.execute(`
      SELECT n.*, cl.name as class_name, c.name as combo_name, c.color as combo_color,
             e.name as level_name
      FROM notes n
      JOIN classes cl ON n.class_id = cl.id
      JOIN combinations c ON cl.combination_id = c.id
      JOIN education_levels e ON c.education_level_id = e.id
      WHERE n.class_id = ?
      ORDER BY n.subject ASC, n.created_at DESC
    `, [classId]);
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.execute(`
      SELECT n.*, cl.name as class_name, cl.slug as class_slug,
             c.name as combo_name, c.slug as combo_slug, c.color as combo_color,
             e.name as level_name, e.slug as level_slug
      FROM notes n
      JOIN classes cl ON n.class_id = cl.id
      JOIN combinations c ON cl.combination_id = c.id
      JOIN education_levels e ON c.education_level_id = e.id
      WHERE n.id = ?
    `, [id]);
    return rows[0] || null;
  }

  static async create({ classId, title, description, subject, fileName, fileOriginalName, fileUrl, fileSize, fileType, cloudinaryPublicId }) {
    const [result] = await db.execute(
      'INSERT INTO notes (class_id,title,description,subject,file_name,file_original_name,file_url,file_size,file_type,cloudinary_public_id) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [classId, title, description || '', subject || '', fileName, fileOriginalName, fileUrl || '', fileSize || 0, fileType || '', cloudinaryPublicId || '']
    );
    return result.insertId;
  }

  static async update(id, { title, description, subject, fileName, fileOriginalName, fileUrl, fileSize, fileType, cloudinaryPublicId }) {
    if (fileName) {
      await db.execute(
        'UPDATE notes SET title=?,description=?,subject=?,file_name=?,file_original_name=?,file_url=?,file_size=?,file_type=?,cloudinary_public_id=? WHERE id=?',
        [title, description || '', subject || '', fileName, fileOriginalName, fileUrl || '', fileSize || 0, fileType || '', cloudinaryPublicId || '', id]
      );
    } else {
      await db.execute(
        'UPDATE notes SET title=?,description=?,subject=? WHERE id=?',
        [title, description || '', subject || '', id]
      );
    }
  }

  static async delete(id) {
    await db.execute('DELETE FROM notes WHERE id=?', [id]);
  }

  static async incrementDownload(id) {
    await db.execute('UPDATE notes SET download_count = download_count + 1 WHERE id=?', [id]);
  }

  static async countAll() {
    const [[row]] = await db.execute('SELECT COUNT(*) as total FROM notes');
    return row.total;
  }

  static async countDownloads() {
    const [[row]] = await db.execute('SELECT SUM(download_count) as total FROM notes');
    return row.total || 0;
  }

  static formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = Note;
