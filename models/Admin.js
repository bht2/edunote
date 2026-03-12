const db = require('../config/database');
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

  static async verifyPassword(plain, hashed) {
    return await bcrypt.compare(plain, hashed);
  }
}

module.exports = Admin;
