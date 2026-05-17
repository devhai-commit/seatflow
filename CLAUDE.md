# SeatFlow – Ứng dụng quản lý sơ đồ lớp học

## Tổng quan

Ứng dụng web quản lý chỗ ngồi học sinh cho giáo viên tiểu học/THCS Việt Nam.
Gồm 2 service chạy song song:
- **seatflow-ui** – React SPA (port 5173)
- **seatflow-api** – REST API Node.js + MySQL (port 3001)

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 4 |
| DnD | @dnd-kit/core 6 |
| Backend | Node.js ESM, Express 4, mysql2/promise |
| Database | MySQL (seatflow db) |
| Auth | LocalStorage đơn giản (`seatflow_isLoggedIn`) |

## Cấu trúc thư mục

```
smart-class/
├── seatflow-ui/src/
│   ├── App.tsx              ← Root: toàn bộ state + logic nghiệp vụ
│   ├── apiClient.ts         ← Tất cả gọi API (fetch wrapper)
│   ├── types.ts             ← Tất cả TypeScript types
│   ├── data/mockData.ts
│   └── components/
│       ├── LoginPage.tsx
│       ├── NavBar.tsx
│       ├── SeatingChartPage.tsx   ← Tab sơ đồ, view 2D/3D, DnD
│       ├── PriorityStudentsPage.tsx ← Tab ưu tiên ngồi trước
│       ├── StudentManagerPage.tsx  ← Tab quản lý hồ sơ học sinh
│       └── HelpModal.tsx
├── seatflow-api/
│   ├── server.js            ← Express app + tất cả routes
│   ├── schema.sql           ← DDL database
│   ├── seed.sql             ← Dữ liệu mẫu
│   └── .env                 ← DB_HOST/PORT/USER/PASSWORD/DB_NAME, PORT=3001
└── CLAUDE.md
```

## Database Schema (MySQL: seatflow)

```sql
app_settings (id INT PK=1, rows, cols, seats_per_table, student_list_input,
  seating_chart JSON, group_settings JSON, groups_data JSON,
  group_leaders JSON, arrangement_mode VARCHAR)

students (id UUID PK, full_name, short_name, current_seat_assigned_timestamp BIGINT,
  parent_phone, address, weight, height,
  is_nearsighted TINYINT(1), is_special_needs TINYINT(1))

behavior_records (id UUID PK, student_id FK, type ENUM(bonus|penalty|info),
  description, score INT, timestamp BIGINT)

seating_assignments (id AI PK, student_id FK, row_index, col_index, seat_index,
  assigned_at BIGINT, UNIQUE(row_index, col_index, seat_index))
```

## API Endpoints (seatflow-api)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | /api/settings | Lấy cài đặt + seating_chart từ DB |
| POST | /api/settings | Lưu settings (upsert id=1), sync seating_assignments |
| GET | /api/students | Lấy tất cả học sinh + behavior_records |
| POST | /api/students/sync | Thêm tên mới, trả về toàn bộ danh sách |
| PUT | /api/students/batch-timestamps | Cập nhật timestamp ngồi hàng loạt |
| PUT | /api/students/:id | Cập nhật hồ sơ học sinh |
| POST | /api/students/:id/behavior | Thêm ghi chú hành vi |
| DELETE | /api/behavior/:id | Xóa ghi chú hành vi |

`VITE_API_URL` trong `.env.local` trỏ tới API (mặc định http://localhost:3001)

## Types chính (src/types.ts)

```typescript
Student { id, fullName, shortName, currentSeatAssignedTimestamp, parentPhone,
  address, weight, height, isNearsighted, isSpecialNeeds, behaviorRecords[] }

SeatingChart = Row[]        // SeatingChart[row][col][seat] = Student
type Row = Table[]
type Table = Student[]

ViewMode = '2d' | '3d'
ArrangementMode = 'automatic' | 'manual'
ActiveTab = 'chart' | 'priority' | 'manager'
GroupArrangement = 'horizontal' | 'vertical' | 'cluster'
```

## State Management (App.tsx)

Toàn bộ state dùng `useState` trong App.tsx – không có global state manager.
- `useEffect` gọi API load dữ liệu khi `isLoggedIn` thay đổi
- Auto-save settings debounce 1 giây khi rows/cols/seatsPerTable/groupSettings thay đổi
- `useCallback` cho tất cả handlers để tránh re-render không cần thiết

## Logic nghiệp vụ quan trọng

**Sắp xếp tự động (handleInitialArrangement):**
Ưu tiên: `isSpecialNeeds` → `isNearsighted || height<135` → học sinh thường
Mỗi nhóm được xáo trộn ngẫu nhiên (Fisher-Yates) trước khi xếp vào chart.

**Luân chuyển chỗ ngồi (handleRotateSeats):**
Normal students xoay vòng theo chunk = `cols × seatsPerTable`.
Special/priority được xáo trộn lại, xếp vào hàng đầu.

**Drag & Drop (DndContext wraps tabs):**
- `table-{row}-{col}` → hoán đổi 2 bàn
- `student-{id}` → `student-{id}`: hoán đổi 2 học sinh
- `student-{id}` → `table-{row}-{col}`: di chuyển học sinh sang bàn trống

Khi DnD xảy ra → `arrangementMode` chuyển thành `'manual'`.

**Short name:** Họ cuối + suffix A/B/C nếu trùng tên.

## Chạy project

```bash
# API
cd seatflow-api && npm run dev      # node --watch server.js

# UI
cd seatflow-ui && npm run dev       # vite dev server

# DB setup
mysql -u root -p < seatflow-api/schema.sql
mysql -u root -p seatflow < seatflow-api/seed.sql
```

## .env seatflow-api

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=08032003
DB_NAME=seatflow
PORT=3001
```

## Ghi chú kỹ thuật

- `seating_chart` lưu cả trong `app_settings` (JSON blob) lẫn `seating_assignments` (relational)
- Khi POST /api/settings với `seating_chart` → server tự sync bảng `seating_assignments`
- MySQL `TINYINT(1)` được cast thành boolean qua `typeCast` trong pool config
- JSON_FIELDS: `['seating_chart', 'group_settings', 'groups_data', 'group_leaders']` được stringify khi lưu, parse khi đọc
- Export CSV dùng BOM (`﻿`) để Excel đọc đúng UTF-8
- Import/Export JSON backup toàn bộ state (version=1)
