const db     = require('../config/database');
const bcrypt = require('bcryptjs');

class Admin {
  static async findByEmail(email) {
    const [rows] = await db.execute('SELECT * FROM admins WHERE email = ?', [email]);
    return rows[0] || null;
  }

  static async findById(id) {
    const [rows] = await db.execute('SELECT * FROM admins WHERE id = ?', [id]);
    return rows[0] || null;
  }

  // Returns all admins joined with their assigned education level name
  static async findAll() {
    const [rows] = await db.execute(`
      SELECT a.*, el.name as level_name
      FROM admins a
      LEFT JOIN education_levels el ON a.level_id = el.id
      ORDER BY a.created_at ASC
    `);
    return rows;
  }

  static async create({ name, email, password, role = 'sub', level_id = null }) {
    const hashed = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      'INSERT INTO admins (name, email, password, role, level_id) VALUES (?,?,?,?,?)',
      [name, email, hashed, role, level_id || null]
    );
    return result.insertId;
  }

  static async updateProfile(id, { name, email }) {
    await db.execute('UPDATE admins SET name=?, email=? WHERE id=?', [name, email, id]);
  }

  static async updatePassword(id, newPassword) {
    const hashed = await bcrypt.hash(newPassword, 12);
    await db.execute('UPDATE admins SET password=? WHERE id=?', [hashed, id]);
  }

  static async updateAvatar(id, avatar) {
    await db.execute('UPDATE admins SET avatar=? WHERE id=?', [avatar, id]);
  }

  static async updateSubAdmin(id, { name, email, level_id }) {
    await db.execute(
      'UPDATE admins SET name=?, email=?, level_id=? WHERE id=?',
      [name, email, level_id || null, id]
    );
  }

  static async resetPassword(id, newPassword) {
    const hashed = await bcrypt.hash(newPassword, 12);
    await db.execute('UPDATE admins SET password=? WHERE id=?', [hashed, id]);
  }

  static async delete(id) {
    await db.execute('DELETE FROM admins WHERE id=?', [id]);
  }

  static async verifyPassword(plain, hashed) {
    return await bcrypt.compare(plain, hashed);
  }
}

module.exports = Admin;
