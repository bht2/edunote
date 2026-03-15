const db = require('../config/database');

class Level {
  static async findAll() {
    const [rows] = await db.execute('SELECT * FROM levels ORDER BY order_index ASC');
    return rows;
  }
  static async findById(id) {
    const [rows] = await db.execute('SELECT * FROM levels WHERE id = ?', [id]);
    return rows[0] || null;
  }
  static async findBySlug(slug) {
    const [rows] = await db.execute('SELECT * FROM levels WHERE slug = ?', [slug]);
    return rows[0] || null;
  }
  static async create(data) {
    const [result] = await db.execute(
      'INSERT INTO levels (name, slug, description, color, image_url, order_index) VALUES (?,?,?,?,?,?)',
      [data.name, data.slug, data.description || '', data.color || '#4f46e5', data.image_url || null, data.order_index || 0]
    );
    return result;
  }
  static async update(id, data) {
    const [result] = await db.execute(
      'UPDATE levels SET name=?, slug=?, description=?, color=?, image_url=?, order_index=? WHERE id=?',
      [data.name, data.slug, data.description || '', data.color || '#4f46e5', data.image_url || null, data.order_index || 0, id]
    );
    return result;
  }
  static async delete(id) {
    const [result] = await db.execute('DELETE FROM levels WHERE id = ?', [id]);
    return result;
  }
  static async findBySector(sectorId) {
    const [rows] = await db.execute(`
      SELECT l.*,
        (SELECT COUNT(n.id)
         FROM notes n
         JOIN classes cl ON n.class_id = cl.id
         JOIN combinations c ON cl.combination_id = c.id
         JOIN education_levels el ON c.education_level_id = el.id
         WHERE el.slug = l.slug
        ) as note_count
      FROM levels l
      WHERE l.sector_id = ?
      ORDER BY l.order_index ASC
    `, [sectorId]);
    return rows;
  }

  static async countAll() {
    const [rows] = await db.execute('SELECT COUNT(*) as count FROM levels');
    return rows[0].count;
  }
}

module.exports = Level;
