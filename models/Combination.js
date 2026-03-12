const db = require('../config/database');

class Combination {
  static async findAll() {
    const [rows] = await db.execute(`
      SELECT c.*, e.name as level_name, e.slug as level_slug, e.color as level_color
      FROM combinations c
      JOIN education_levels e ON c.education_level_id = e.id
      ORDER BY e.order_index ASC, c.order_index ASC
    `);
    return rows;
  }

  static async findByLevel(levelId) {
    const [rows] = await db.execute(`
      SELECT c.*, COUNT(cl.id) as class_count
      FROM combinations c
      LEFT JOIN classes cl ON c.id = cl.combination_id
      WHERE c.education_level_id = ?
      GROUP BY c.id
      ORDER BY c.order_index ASC, c.name ASC
    `, [levelId]);
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.execute(`
      SELECT c.*, e.name as level_name, e.slug as level_slug
      FROM combinations c
      JOIN education_levels e ON c.education_level_id = e.id
      WHERE c.id=?
    `, [id]);
    return rows[0] || null;
  }

  static async findBySlug(slug) {
    const [rows] = await db.execute(`
      SELECT c.*, e.name as level_name, e.slug as level_slug, e.color as level_color
      FROM combinations c
      JOIN education_levels e ON c.education_level_id = e.id
      WHERE c.slug=?
    `, [slug]);
    return rows[0] || null;
  }

  static async create({ educationLevelId, name, slug, fullName, description, color, orderIndex }) {
    const [result] = await db.execute(
      'INSERT INTO combinations (education_level_id,name,slug,full_name,description,color,order_index) VALUES (?,?,?,?,?,?,?)',
      [educationLevelId, name, slug, fullName || '', description || '', color || '#6366f1', orderIndex || 0]
    );
    return result.insertId;
  }

  static async update(id, { name, slug, fullName, description, color, orderIndex }) {
    await db.execute(
      'UPDATE combinations SET name=?,slug=?,full_name=?,description=?,color=?,order_index=? WHERE id=?',
      [name, slug, fullName || '', description || '', color || '#6366f1', orderIndex || 0, id]
    );
  }

  static async delete(id) {
    await db.execute('DELETE FROM combinations WHERE id=?', [id]);
  }

  static toSlug(levelSlug, name) {
    const n = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `${levelSlug}-${n}`;
  }
}

module.exports = Combination;
