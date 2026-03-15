const db = require('../config/database');

class Sector {
  static async findAll() {
    const [rows] = await db.execute(`
      SELECT s.*,
             COUNT(DISTINCT l.id) as level_count,
             (SELECT COUNT(*) FROM notes) as note_count
      FROM sectors s
      LEFT JOIN levels l ON l.sector_id = s.id
      GROUP BY s.id
      ORDER BY s.name ASC
    `);
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.execute('SELECT * FROM sectors WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async findBySlug(slug) {
    const [rows] = await db.execute('SELECT * FROM sectors WHERE slug = ?', [slug]);
    return rows[0] || null;
  }

  static async create({ name, slug, description, color }) {
    const [result] = await db.execute(
      'INSERT INTO sectors (name, slug, description, color) VALUES (?, ?, ?, ?)',
      [name, slug, description || '', color || '#4f46e5']
    );
    return result.insertId;
  }

  static async update(id, { name, slug, description, color }) {
    await db.execute(
      'UPDATE sectors SET name = ?, slug = ?, description = ?, color = ? WHERE id = ?',
      [name, slug, description || '', color || '#4f46e5', id]
    );
  }

  static async delete(id) {
    await db.execute('DELETE FROM sectors WHERE id = ?', [id]);
  }

  static async slugExists(slug, excludeId = null) {
    let query = 'SELECT id FROM sectors WHERE slug = ?';
    const params = [slug];
    if (excludeId) { query += ' AND id != ?'; params.push(excludeId); }
    const [rows] = await db.execute(query, params);
    return rows.length > 0;
  }

  static generateSlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim('-');
  }
}

module.exports = Sector;
