-- EduNote v2 — Full Schema
-- Run: mysql -u root -p edunote < database.sql

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS combo_requests;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS combinations;
DROP TABLE IF EXISTS education_levels;
DROP TABLE IF EXISTS admins;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE admins (
  id         INT NOT NULL AUTO_INCREMENT,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  name       VARCHAR(100) NOT NULL DEFAULT 'Admin',
  avatar     VARCHAR(255) DEFAULT NULL,
  role       VARCHAR(20)  DEFAULT 'admin',
  level_id   INT          DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE education_levels (
  id          INT NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150) NOT NULL,
  slug        VARCHAR(150) NOT NULL UNIQUE,
  description TEXT,
  color       VARCHAR(20) DEFAULT '#4f46e5',
  icon        VARCHAR(50) DEFAULT '📚',
  order_index INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE combinations (
  id                 INT NOT NULL AUTO_INCREMENT,
  education_level_id INT NOT NULL,
  name               VARCHAR(150) NOT NULL,
  slug               VARCHAR(200) NOT NULL UNIQUE,
  full_name          VARCHAR(255),
  description        TEXT,
  color              VARCHAR(20) DEFAULT '#6366f1',
  order_index        INT DEFAULT 0,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (education_level_id) REFERENCES education_levels(id) ON DELETE CASCADE
);

CREATE TABLE classes (
  id              INT NOT NULL AUTO_INCREMENT,
  combination_id  INT NOT NULL,
  name            VARCHAR(100) NOT NULL,
  slug            VARCHAR(200) NOT NULL UNIQUE,
  order_index     INT DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (combination_id) REFERENCES combinations(id) ON DELETE CASCADE
);

CREATE TABLE notes (
  id                  INT NOT NULL AUTO_INCREMENT,
  class_id            INT NOT NULL,
  title               VARCHAR(255) NOT NULL,
  description         TEXT,
  subject             VARCHAR(150),
  file_name           VARCHAR(255) NOT NULL,
  file_original_name  VARCHAR(255) NOT NULL,
  file_url            VARCHAR(500),
  file_size           BIGINT DEFAULT 0,
  file_type           VARCHAR(100),
  cloudinary_public_id VARCHAR(255),
  download_count      INT DEFAULT 0,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE TABLE combo_requests (
  id                 INT NOT NULL AUTO_INCREMENT,
  sub_admin_id       INT NOT NULL,
  education_level_id INT NOT NULL,
  combo_id           INT DEFAULT NULL,
  request_type       ENUM('create','edit','delete') NOT NULL,
  requested_data     JSON,
  status             ENUM('pending','approved','rejected') DEFAULT 'pending',
  reviewed_by        INT DEFAULT NULL,
  reviewed_at        TIMESTAMP NULL DEFAULT NULL,
  rejection_reason   TEXT,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (sub_admin_id)       REFERENCES admins(id) ON DELETE CASCADE,
  FOREIGN KEY (education_level_id) REFERENCES education_levels(id) ON DELETE CASCADE,
  FOREIGN KEY (combo_id)           REFERENCES combinations(id) ON DELETE SET NULL
);
