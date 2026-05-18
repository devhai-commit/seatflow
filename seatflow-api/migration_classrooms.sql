-- Migration: Multi-classroom support
-- Chạy file này MỘT LẦN trên database hiện có (không cần cho database mới tạo từ schema.sql)

USE seatflow;

-- 1. Tạo bảng classrooms
CREATE TABLE IF NOT EXISTS classrooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  grade VARCHAR(50) DEFAULT NULL,
  school_year VARCHAR(20) DEFAULT NULL,
  created_at BIGINT NOT NULL
);

-- 2. Tạo lớp mặc định (id=1) từ class_name đã có
INSERT IGNORE INTO classrooms (id, name, created_at)
VALUES (1, 'Lớp chưa đặt tên', UNIX_TIMESTAMP() * 1000);

-- Lấy tên lớp từ app_settings nếu có
UPDATE classrooms c
JOIN app_settings a ON a.id = 1
SET c.name = a.class_name
WHERE c.id = 1 AND a.class_name IS NOT NULL AND a.class_name != '';

-- 3. Thêm classroom_id vào students (tất cả HS hiện có thuộc lớp 1)
-- Nếu đã chạy rồi thì bỏ qua lệnh này
ALTER TABLE students ADD COLUMN classroom_id INT NOT NULL DEFAULT 1;

-- 4. Thêm classroom_id vào seating_assignments
-- Nếu đã chạy rồi thì bỏ qua từ đây
ALTER TABLE seating_assignments ADD COLUMN classroom_id INT NOT NULL DEFAULT 1;

-- Xóa unique key cũ (chỉ position), thêm key mới có classroom_id
ALTER TABLE seating_assignments DROP INDEX uq_position;
ALTER TABLE seating_assignments
  ADD UNIQUE KEY uq_position (classroom_id, row_index, col_index, seat_index);

-- 5. Thêm classroom_id vào seating_history
ALTER TABLE seating_history ADD COLUMN classroom_id INT NOT NULL DEFAULT 1;
