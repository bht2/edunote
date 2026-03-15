const db = require('../config/database');

class ComboRequest {
  static async create(data) {
    const [result] = await db.execute(
      `INSERT INTO combo_requests (sub_admin_id, education_level_id, combo_id, request_type, requested_data)
       VALUES (?, ?, ?, ?, ?)`,
      [data.sub_admin_id, data.education_level_id, data.combo_id || null,
       data.request_type, JSON.stringify(data.requested_data)]
    );
    return result.insertId;
  }

  static async createNew(data) {
    const [result] = await db.execute(
      `INSERT INTO combo_requests (sub_admin_id, education_level_id, combo_id, request_type, requested_data)
       VALUES (?, ?, NULL, 'create', ?)`,
      [data.sub_admin_id, data.education_level_id, JSON.stringify(data.requested_data)]
    );
    return result.insertId;
  }

  static async findPending() {
    const [rows] = await db.execute(`
      SELECT cr.*, a.name as admin_name, a.email as admin_email,
             el.name as level_name,
             c.name as combo_name, c.color as combo_color
      FROM combo_requests cr
      JOIN admins a ON cr.sub_admin_id = a.id
      JOIN education_levels el ON cr.education_level_id = el.id
      LEFT JOIN combinations c ON cr.combo_id = c.id
      WHERE cr.status = 'pending'
      ORDER BY cr.created_at DESC
    `);
    return rows;
  }

  static async findAll() {
    const [rows] = await db.execute(`
      SELECT cr.*, a.name as admin_name,
             el.name as level_name,
             c.name as combo_name
      FROM combo_requests cr
      JOIN admins a ON cr.sub_admin_id = a.id
      JOIN education_levels el ON cr.education_level_id = el.id
      LEFT JOIN combinations c ON cr.combo_id = c.id
      ORDER BY cr.created_at DESC
      LIMIT 100
    `);
    return rows;
  }

  static async findBySubAdmin(adminId) {
    const [rows] = await db.execute(`
      SELECT cr.*, el.name as level_name, c.name as combo_name
      FROM combo_requests cr
      JOIN education_levels el ON cr.education_level_id = el.id
      LEFT JOIN combinations c ON cr.combo_id = c.id
      WHERE cr.sub_admin_id = ?
      ORDER BY cr.created_at DESC
    `, [adminId]);
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.execute(`
      SELECT cr.*, a.name as admin_name, a.email as admin_email,
             el.name as level_name,
             c.name as combo_name, c.color as combo_color
      FROM combo_requests cr
      JOIN admins a ON cr.sub_admin_id = a.id
      JOIN education_levels el ON cr.education_level_id = el.id
      LEFT JOIN combinations c ON cr.combo_id = c.id
      WHERE cr.id = ?
    `, [id]);
    return rows[0] || null;
  }

  static async approve(id, reviewedBy) {
    await db.execute(
      `UPDATE combo_requests SET status='approved', reviewed_by=?, reviewed_at=NOW() WHERE id=?`,
      [reviewedBy, id]
    );
  }

  static async reject(id, reviewedBy, reason) {
    await db.execute(
      `UPDATE combo_requests SET status='rejected', reviewed_by=?, reviewed_at=NOW(), rejection_reason=? WHERE id=?`,
      [reviewedBy, reason || '', id]
    );
  }

  static async countPending() {
    const [[row]] = await db.execute(
      `SELECT COUNT(*) as count FROM combo_requests WHERE status='pending'`
    );
    return row.count;
  }
}

module.exports = ComboRequest;
