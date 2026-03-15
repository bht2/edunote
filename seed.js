require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function seed() {
  const db = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'edunote',
    port:     parseInt(process.env.DB_PORT) || 3306,
  });

  try {
    console.log('🌱 Creating tables...');

    await db.execute('DROP TABLE IF EXISTS notes');
    await db.execute('DROP TABLE IF EXISTS classes');
    await db.execute('DROP TABLE IF EXISTS combinations');
    await db.execute('DROP TABLE IF EXISTS education_levels');
    await db.execute('DROP TABLE IF EXISTS admins');

    await db.execute(`CREATE TABLE admins (
      id INT NOT NULL AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL DEFAULT 'Admin',
      avatar VARCHAR(255) DEFAULT NULL,
      role VARCHAR(20) DEFAULT 'admin',
      level_id INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS combo_requests (
      id INT NOT NULL AUTO_INCREMENT,
      sub_admin_id INT NOT NULL,
      education_level_id INT NOT NULL,
      combo_id INT DEFAULT NULL,
      request_type ENUM('create','edit','delete') NOT NULL,
      requested_data JSON,
      status ENUM('pending','approved','rejected') DEFAULT 'pending',
      reviewed_by INT DEFAULT NULL,
      reviewed_at TIMESTAMP NULL DEFAULT NULL,
      rejection_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      FOREIGN KEY (sub_admin_id) REFERENCES admins(id) ON DELETE CASCADE,
      FOREIGN KEY (education_level_id) REFERENCES education_levels(id) ON DELETE CASCADE,
      FOREIGN KEY (combo_id) REFERENCES combinations(id) ON DELETE SET NULL
    )`);

    await db.execute(`CREATE TABLE education_levels (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(150) NOT NULL,
      slug VARCHAR(150) NOT NULL UNIQUE,
      description TEXT,
      color VARCHAR(20) DEFAULT '#4f46e5',
      icon VARCHAR(50) DEFAULT '📚',
      order_index INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )`);

    await db.execute(`CREATE TABLE combinations (
      id INT NOT NULL AUTO_INCREMENT,
      education_level_id INT NOT NULL,
      name VARCHAR(150) NOT NULL,
      slug VARCHAR(200) NOT NULL UNIQUE,
      full_name VARCHAR(255),
      description TEXT,
      color VARCHAR(20) DEFAULT '#6366f1',
      order_index INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      FOREIGN KEY (education_level_id) REFERENCES education_levels(id) ON DELETE CASCADE
    )`);

    await db.execute(`CREATE TABLE classes (
      id INT NOT NULL AUTO_INCREMENT,
      combination_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(200) NOT NULL UNIQUE,
      order_index INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      FOREIGN KEY (combination_id) REFERENCES combinations(id) ON DELETE CASCADE
    )`);

    await db.execute(`CREATE TABLE notes (
      id INT NOT NULL AUTO_INCREMENT,
      class_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      subject VARCHAR(150),
      file_name VARCHAR(255) NOT NULL,
      file_original_name VARCHAR(255) NOT NULL,
      file_url VARCHAR(500),
      file_size BIGINT DEFAULT 0,
      file_type VARCHAR(100),
      cloudinary_public_id VARCHAR(255),
      download_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    )`);

    console.log('✅ Tables created');

    // Admin
    const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', 12);
    await db.execute(
      'INSERT IGNORE INTO admins (email, password, name) VALUES (?,?,?)',
      [process.env.ADMIN_EMAIL || 'admin@edunote.com', hashed, 'Administrator']
    );
    console.log('✅ Admin created');

    // Education Levels
    const levels = [
      ["O'Level", 'olevel', "Ordinary Level - Senior 1 to Senior 3", '#10b981', '🎓', 1],
      ["A'Level General", 'alevel', "Advanced Level - Senior 4 to Senior 6", '#6366f1', '📘', 2],
      ['TVET', 'tvet', "Technical and Vocational Education and Training", '#f59e0b', '🔧', 3],
    ];
    for (const l of levels) {
      await db.execute(
        'INSERT IGNORE INTO education_levels (name,slug,description,color,icon,order_index) VALUES (?,?,?,?,?,?)', l
      );
    }
    console.log('✅ Education levels created');

    // Get level IDs
    const [[olevel]]  = await db.execute("SELECT id FROM education_levels WHERE slug='olevel'");
    const [[alevel]]  = await db.execute("SELECT id FROM education_levels WHERE slug='alevel'");
    const [[tvet]]    = await db.execute("SELECT id FROM education_levels WHERE slug='tvet'");

    // O'Level - single combination
    await db.execute(
      'INSERT IGNORE INTO combinations (education_level_id,name,slug,full_name,color,order_index) VALUES (?,?,?,?,?,?)',
      [olevel.id, "O'Level", 'olevel-main', "Ordinary Level S1-S3", '#10b981', 1]
    );
    const [[olevelCombo]] = await db.execute("SELECT id FROM combinations WHERE slug='olevel-main'");
    for (const [i, cls] of ['S1','S2','S3'].entries()) {
      await db.execute(
        'INSERT IGNORE INTO classes (combination_id,name,slug,order_index) VALUES (?,?,?,?)',
        [olevelCombo.id, cls, `olevel-${cls.toLowerCase()}`, i+1]
      );
    }

    // A'Level combinations
    const aLevelCombos = [
      ['MPC', 'alevel-mpc', 'Mathematics, Physics, Chemistry', '#6366f1'],
      ['PCB', 'alevel-pcb', 'Physics, Chemistry, Biology', '#8b5cf6'],
      ['MPG', 'alevel-mpg', 'Mathematics, Physics, Geography', '#a855f7'],
      ['MCE', 'alevel-mce', 'Mathematics, Chemistry, Economics', '#7c3aed'],
      ['MCB', 'alevel-mcb', 'Mathematics, Chemistry, Biology', '#6d28d9'],
      ['MEG', 'alevel-meg', 'Mathematics, Economics, Geography', '#5b21b6'],
      ['HEG', 'alevel-heg', 'History, Economics, Geography', '#4c1d95'],
      ['HGL', 'alevel-hgl', 'History, Geography, Literature', '#7e22ce'],
      ['HEL', 'alevel-hel', 'History, Economics, Literature', '#9333ea'],
      ['LEG', 'alevel-leg', 'Literature, Economics, Geography', '#a21caf'],
      ['MEL', 'alevel-mel', 'Mathematics, Economics, Literature', '#86198f'],
    ];
    for (const [i, [name, slug, fullName, color]] of aLevelCombos.entries()) {
      await db.execute(
        'INSERT IGNORE INTO combinations (education_level_id,name,slug,full_name,color,order_index) VALUES (?,?,?,?,?,?)',
        [alevel.id, name, slug, fullName, color, i+1]
      );
      const [[combo]] = await db.execute('SELECT id FROM combinations WHERE slug=?', [slug]);
      for (const [j, cls] of ['S4','S5','S6'].entries()) {
        await db.execute(
          'INSERT IGNORE INTO classes (combination_id,name,slug,order_index) VALUES (?,?,?,?)',
          [combo.id, cls, `${slug}-${cls.toLowerCase()}`, j+1]
        );
      }
    }

    // TVET trades
    const tvetTrades = [
      ['SOD', 'tvet-sod', 'Software Development', '#f59e0b'],
      ['CSA', 'tvet-csa', 'Computer System and Applications', '#d97706'],
      ['NIT', 'tvet-nit', 'Network and IT Infrastructure', '#b45309'],
      ['MMP', 'tvet-mmp', 'Multimedia Production', '#92400e'],
      ['AUT', 'tvet-aut', 'Automotive Technology', '#ef4444'],
      ['GME', 'tvet-gme', 'General Mechanics and Electricity', '#dc2626'],
      ['BDC', 'tvet-bdc', 'Building and Civil Construction', '#b91c1c'],
      ['PLT', 'tvet-plt', 'Plumbing Technology', '#991b1b'],
      ['CAP', 'tvet-cap', 'Computer Applications', '#f97316'],
      ['ELT', 'tvet-elt', 'Electrical Technology', '#ea580c'],
      ['ETE', 'tvet-ete', 'Electronics and Telecommunication', '#c2410c'],
      ['TOR', 'tvet-tor', 'Tourism and Recreation', '#22c55e'],
      ['FBO', 'tvet-fbo', 'Food and Beverage Operations', '#16a34a'],
    ];
    for (const [i, [name, slug, fullName, color]] of tvetTrades.entries()) {
      await db.execute(
        'INSERT IGNORE INTO combinations (education_level_id,name,slug,full_name,color,order_index) VALUES (?,?,?,?,?,?)',
        [tvet.id, name, slug, fullName, color, i+1]
      );
      const [[combo]] = await db.execute('SELECT id FROM combinations WHERE slug=?', [slug]);
      for (const [j, cls] of ['L3','L4','L5'].entries()) {
        await db.execute(
          'INSERT IGNORE INTO classes (combination_id,name,slug,order_index) VALUES (?,?,?,?)',
          [combo.id, cls, `${slug}-${cls.toLowerCase()}`, j+1]
        );
      }
    }

    console.log('✅ Rwanda education structure created');
    console.log('🎉 Done! Login: admin@edunote.com / Admin@123');
    await db.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    await db.end();
    process.exit(1);
  }
}

seed();
