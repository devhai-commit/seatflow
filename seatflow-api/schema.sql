CREATE DATABASE IF NOT EXISTS seatflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE seatflow;

CREATE TABLE IF NOT EXISTS app_settings (
  id INT PRIMARY KEY,
  min_rows INT DEFAULT 4,
  cols INT DEFAULT 5,
  seats_per_table INT DEFAULT 2,
  student_list_input TEXT,
  group_settings JSON,
  groups_data JSON,
  group_leaders JSON,
  arrangement_mode VARCHAR(20) DEFAULT 'automatic'
);

CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(36) PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100),
  parent_phone VARCHAR(20),
  address TEXT,
  weight VARCHAR(20),
  height VARCHAR(20),
  is_nearsighted TINYINT(1) DEFAULT 0,
  is_special_needs TINYINT(1) DEFAULT 0,
  avatar_url VARCHAR(500) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS behavior_records (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  type ENUM('bonus', 'penalty', 'info') NOT NULL,
  description TEXT,
  score INT DEFAULT 0,
  timestamp BIGINT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Mỗi học sinh tối đa 1 chỗ ngồi (uq_student).
-- assigned_at là timestamp xếp chỗ, thay cho current_seat_assigned_timestamp trên bảng students.
CREATE TABLE IF NOT EXISTS seating_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  row_index TINYINT UNSIGNED NOT NULL,
  col_index TINYINT UNSIGNED NOT NULL,
  seat_index TINYINT UNSIGNED NOT NULL,
  assigned_at BIGINT NOT NULL,
  UNIQUE KEY uq_position (row_index, col_index, seat_index),
  UNIQUE KEY uq_student (student_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Lịch sử các lần đổi chỗ ngồi. snapshot lưu [[studentId|null,...],...]
CREATE TABLE IF NOT EXISTS seating_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  snapshot LONGTEXT NOT NULL,
  rows_count TINYINT UNSIGNED NOT NULL DEFAULT 4,
  cols_count TINYINT UNSIGNED NOT NULL DEFAULT 6,
  created_at BIGINT NOT NULL,
  note VARCHAR(255) DEFAULT NULL
);
