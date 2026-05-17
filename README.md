# SeatFlow – Quản lý sơ đồ lớp học

Ứng dụng web giúp giáo viên tiểu học / THCS sắp xếp chỗ ngồi học sinh và theo dõi nề nếp lớp học.

## Tính năng chính

- **Sơ đồ chỗ ngồi** – xem dạng 2D hoặc 3D, kéo thả học sinh giữa các bàn
- **Xếp chỗ tự động** – ưu tiên học sinh khuyết tật, cận thị, chiều cao thấp ngồi đầu
- **Xếp chỗ thủ công** – kéo thả tự do, chỉ định tổ trưởng
- **Luân chuyển chỗ ngồi** – xoay vòng theo dãy bàn
- **Quản lý hồ sơ** – thông tin, ảnh đại diện, số điện thoại phụ huynh
- **Nề nếp** – cộng/trừ điểm hàng tuần, xếp loại tháng/kỳ/năm
- **Xuất CSV / JSON** – backup dữ liệu

---

## Yêu cầu cài đặt

| Phần mềm | Phiên bản tối thiểu |
|----------|-------------------|
| Node.js  | 18+               |
| MySQL    | 8.0+              |
| npm      | 9+                |

---

## Cài đặt lần đầu

### 1. Clone dự án

```bash
git clone https://github.com/<your-username>/smart-class.git
cd smart-class
```

### 2. Tạo database MySQL

```bash
# Đăng nhập MySQL
mysql -u root -p

# Trong MySQL shell
CREATE DATABASE seatflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;

# Tạo bảng
mysql -u root -p seatflow < seatflow-api/schema.sql

# (Tuỳ chọn) Load dữ liệu mẫu
mysql -u root -p seatflow < seatflow-api/seed.sql
```

### 3. Cấu hình Backend

```bash
cd seatflow-api
cp .env.example .env
```

Mở file `.env` và điền thông tin:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=mật_khẩu_mysql_của_bạn
DB_NAME=seatflow
PORT=3001
```

Cài dependencies:

```bash
npm install
```

### 4. Cấu hình Frontend

```bash
cd ../seatflow-ui
npm install
```

Tạo file `.env.local` (nếu API không chạy ở port 3001):

```env
VITE_API_URL=http://localhost:3001
```

---

## Chạy ở môi trường phát triển

Mở **2 terminal**:

**Terminal 1 – Backend:**
```bash
cd seatflow-api
npm run dev
# API chạy tại http://localhost:3001
```

**Terminal 2 – Frontend:**
```bash
cd seatflow-ui
npm run dev
# Giao diện tại http://localhost:5173
```

Mở trình duyệt vào `http://localhost:5173`

---

## Deploy với Nginx (Production)

### 1. Build frontend

```bash
cd seatflow-ui
npm run build
# Output: seatflow-ui/dist/
```

### 2. Copy file lên server

```bash
# Copy thư mục dist vào web root
sudo cp -r seatflow-ui/dist/* /var/www/seatflow/
```

### 3. Chạy backend bằng PM2

```bash
npm install -g pm2
cd seatflow-api
pm2 start server.js --name seatflow-api
pm2 save && pm2 startup
```

### 4. Cấu hình Nginx

Tạo `/etc/nginx/sites-available/seatflow`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/seatflow;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/seatflow /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Cấu trúc thư mục

```
smart-class/
├── seatflow-ui/          # React frontend (Vite + TypeScript)
│   └── src/
│       ├── App.tsx       # State chính + logic nghiệp vụ
│       ├── apiClient.ts  # Gọi API
│       ├── types.ts      # TypeScript types
│       └── components/   # Các trang/tab
├── seatflow-api/         # Node.js backend (Express + MySQL)
│   ├── server.js         # API routes
│   ├── schema.sql        # Tạo bảng database
│   └── seed.sql          # Dữ liệu mẫu
└── README.md
```

---

## Đăng nhập

Mặc định dùng LocalStorage đơn giản – không cần tài khoản.  
Nhấn **Đăng nhập** trên màn hình chờ là vào được ngay.

---

## Gặp lỗi?

| Lỗi | Nguyên nhân thường gặp |
|-----|----------------------|
| `Cannot connect to database` | Sai mật khẩu MySQL trong `.env` |
| `Port 3001 already in use` | Có tiến trình khác chiếm port, chạy `npx kill-port 3001` |
| Trang trắng sau build | Thiếu `try_files` trong Nginx config |
| Ảnh không hiện | Thư mục `uploads/` chưa có quyền ghi |

---

## Công nghệ sử dụng

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, @dnd-kit
- **Backend:** Node.js ESM, Express 4, mysql2
- **Database:** MySQL 8
