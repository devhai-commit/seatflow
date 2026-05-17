-- Migration: DB redesign for flexible seating
-- Chạy file này một lần trên database hiện có (không cần cho database mới tạo từ schema.sql)

USE seatflow;

-- 1. Đổi tên cột `rows` → `min_rows` trong app_settings
ALTER TABLE app_settings
  CHANGE `rows` `min_rows` INT DEFAULT 4;

-- 2. Xóa cột seating_chart khỏi app_settings (nay lưu trong seating_assignments)
ALTER TABLE app_settings
  DROP COLUMN seating_chart;

-- 3. Xóa cột current_seat_assigned_timestamp khỏi students (nay lấy từ seating_assignments.assigned_at)
ALTER TABLE students
  DROP COLUMN current_seat_assigned_timestamp;

-- 4. Xóa trùng lặp student_id trong seating_assignments (giữ lại bản ghi có id nhỏ nhất)
DELETE sa1 FROM seating_assignments sa1
INNER JOIN seating_assignments sa2
  ON sa1.student_id = sa2.student_id
  AND sa1.id > sa2.id;

-- 5. Thêm unique constraint: mỗi học sinh tối đa 1 chỗ ngồi
ALTER TABLE seating_assignments
  ADD UNIQUE KEY uq_student (student_id);
