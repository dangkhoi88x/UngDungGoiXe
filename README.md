# New-rentcar (UngDungGoiXe)

Ứng dụng thuê xe gồm:

- **Backend**: Spring Boot (Java 21, Maven Wrapper)
- **Frontend**: React + Vite + TypeScript
- **Database**: MySQL
- **Cache / token store**: Redis

---

## 1) Yêu cầu môi trường

- Java `21`
- Node.js `>= 20` + npm
- MySQL chạy local (mặc định `localhost:3306`)
- Redis chạy local (mặc định `localhost:6379`)

---

## 2) Cấu trúc thư mục chính

- `src/` - backend Spring Boot
- `frontend/` - SPA React/Vite
- `src/main/resources/application.yaml` - config backend
- `architecture.md` - mô tả kiến trúc và luồng nghiệp vụ
- `plan.md` - tóm tắt stack/route/rules

---

## 3) Setup nhanh local

### 3.1 Tạo database

```sql
CREATE DATABASE UngDungGoiXe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3.2 Biến môi trường backend

Backend cần các biến:

- `JWT_SECRET`
- `JWT_AUDIENCE`
- `EMAIL_USERNAME`
- `EMAIL_PASSWORD`

Nếu đã có file `.env` ở root:

```bash
cd "/Users/dank/Documents/New-rentcar"
set -a
source .env
set +a
```

### 3.3 Chạy backend

```bash
cd "/Users/dank/Documents/New-rentcar"
./mvnw spring-boot:run
```

Backend mặc định: `http://localhost:8080`

Swagger: `http://localhost:8080/swagger-ui.html`

### 3.4 Chạy frontend

```bash
cd "/Users/dank/Documents/New-rentcar/frontend"
npm install
cp .env.example .env.local
npm run dev
```

Frontend mặc định: `http://localhost:5173`

---

## 4) Env frontend

Trong `frontend/.env.local`:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
# Optional
# VITE_GOOGLE_MAP_ID=
# VITE_API_BASE=/api
```

Mặc định Vite proxy:

- `/api` -> `http://localhost:8080`
- `/files` -> `http://localhost:8080`

---

## 5) Scripts thường dùng

### Backend

```bash
./mvnw spring-boot:run
./mvnw test
```

### Frontend

```bash
npm run dev
npm run build
npm run lint
```

---

## 6) Tài khoản / phân quyền chính

- Người dùng thường: thuê xe, xem lịch sử, quản lý tài khoản/GPLX
- Owner: gửi yêu cầu đăng xe, sửa request, theo dõi duyệt
- Admin: quản lý xe/trạm/booking/người dùng, duyệt owner request

---

## 7) Một số route chính

- `/` - trang chủ
- `/rent` - danh sách xe thuê
- `/rent/:id` - chi tiết xe
- `/booking/:vehicleId` - đặt xe
- `/owner/register-vehicle` - gửi yêu cầu xe owner
- `/owner/vehicle-requests` - danh sách yêu cầu owner
- `/admin/*` - dashboard admin

---

## 8) Lỗi hay gặp

- `vite http proxy error ECONNREFUSED`:
  - Backend chưa chạy hoặc crash.
- Vào trang có API mà trắng/lỗi:
  - Kiểm tra token đăng nhập và backend log.
- Thay đổi backend không phản ánh ở UI:
  - Restart backend.
- HMR lỗi lạ ở frontend:
  - restart `npm run dev` (nếu cần, xóa cache `.vite`).

---

## 9) Ghi chú bảo mật

- Không commit secret thật (`.env`, mail app password, key thanh toán).
- Nên tách config local/prod bằng env và profile.

