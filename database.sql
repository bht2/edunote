-- EduNote v2 - Rwanda Education Structure
-- Hierarchy: education_levels → combinations → classes → notes

DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS combinations;
DROP TABLE IF EXISTS education_levels;
DROP TABLE IF EXISTS admins;

CREATE TABLE admins (
  id INT NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL DEFAULT 'Admin',
  avatar VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Level 1: O'Level, A'Level General, TVET
CREATE TABLE education_levels (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(20) DEFAULT '#4f46e5',
  icon VARCHAR(50) DEFAULT '📚',
  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Level 2: Combinations (MPC, PCB...) or Trades (SOD, CSA...)
CREATE TABLE combinations (
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
);

-- Level 3: Classes (S1-S6 or L3-L5)
CREATE TABLE classes (
  id INT NOT NULL AUTO_INCREMENT,
  combination_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (combination_id) REFERENCES combinations(id) ON DELETE CASCADE
);

-- Level 4: Notes
CREATE TABLE notes (
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
);
