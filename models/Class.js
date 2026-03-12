const db = require('../config/database');

class Class {
  static async findByCombination(combinationId) {
    const [rows] = await db.execute(`
      SELECT cl.*, COUNT(n.id) as note_count
      FROM classes cl
      LEFT JOIN notes n ON cl.id = n.class_id
      WHERE cl.combination_id = ?
      GROUP BY cl.id
      ORDER BY cl.order_index ASC, cl.name ASC
    `, [combinationId]);
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.execute(`
      SELECT cl.*, c.name as combo_name, c.slug as combo_slug, c.color as combo_color,
             e.name as level_name, e.slug as level_slug
      FROM classes cl
      JOIN combinations c ON cl.combination_id = c.id
      JOIN education_levels e ON c.education_level_id = e.id
      WHERE cl.id=?
    `, [id]);
    return rows[0] || null;
  }

  static async findBySlug(slug) {
    const [rows] = await db.execute(`
      SELECT cl.*, c.name as combo_name, c.slug as combo_slug, c.color as combo_color,
             c.full_name as combo_full_name,
             e.name as level_name, e.slug as level_slug, e.color as level_color
      FROM classes cl
      JOIN combinations c ON cl.combination_id = c.id
      JOIN education_levels e ON c.education_level_id = e.id
      WHERE cl.slug=?
    `, [slug]);
    return rows[0] || null;
  }

  static async create({ combinationId, name, slug, orderIndex }) {
    const [result] = await db.execute(
      'INSERT INTO classes (combination_id,name,slug,order_index) VALUES (?,?,?,?)',
      [combinationId, name, slug, orderIndex || 0]
    );
    return result.insertId;
  }

  static async update(id, { name, slug, orderIndex }) {
    await db.execute(
      'UPDATE classes SET name=?,slug=?,order_index=? WHERE id=?',
      [name, slug, orderIndex || 0, id]
    );
  }

  static async delete(id) {
    await db.execute('DELETE FROM classes WHERE id=?', [id]);
  }
}

module.exports = Class;
