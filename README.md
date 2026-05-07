# 🚗 Rent-car-platform 

Nền tảng đặt xe tự lái với hệ thống quản trị, quy trình duyệt xe cho chủ xe (owner), thanh toán MoMo, đánh giá sau chuyến đi và lưu trữ media trên AWS S3.

## 🎯 Mục tiêu dự án

- Xây dựng hệ thống thuê xe rõ ràng theo vai trò: User / Owner / Admin.
- Chuẩn hóa quy trình nghiệp vụ booking, thanh toán, duyệt xe và feedback.
- Tăng độ tin cậy vận hành với CI/CD, quản lý token bằng Redis, media bằng S3.

## 🧰 Tech Stack

### Backend
- Java 21
- Spring Boot 4
- Spring Security + JWT + OAuth2
- Spring Data JPA
- Spring Data Redis
- Maven Wrapper
- Swagger/OpenAPI

### Frontend
- React
- TypeScript
- Vite

### DevOps / Hạ tầng
- MySQL
- Redis
- AWS S3
- Docker + Docker Hub
- GitHub Actions

## ✨ Tính năng chính

### User
- Đăng ký/đăng nhập, refresh token, OAuth Google.
- Tìm xe, xem chi tiết xe, đặt xe.
- Thanh toán MoMo (prepay tổng), theo dõi trạng thái đơn.
- Upload giấy tờ xác minh tài khoản (`/users/my-documents`) lên S3.
- Gửi đánh giá sau chuyến đi, upload ảnh feedback lên S3.

### Owner
- Gửi yêu cầu đăng xe, upload ảnh xe/tài liệu lên S3.
- Theo dõi trạng thái duyệt hồ sơ xe.
- Quản lý yêu cầu và cập nhật thông tin bổ sung khi cần.

### Admin
- Quản lý xe, trạm, người dùng, booking.
- Duyệt/từ chối yêu cầu đăng xe từ owner.
- Quản trị bài viết blog + upload cover image lên S3.
- Theo dõi feedback và các luồng điều chỉnh thanh toán.

## 📁 Cấu trúc thư mục

- `src/`: Backend Spring Boot
- `frontend/`: Frontend React/Vite
- `src/main/resources/application.yaml`: cấu hình runtime backend
- `.github/workflows/ci.yml`: pipeline CI/CD

## ⚙️ Hướng dẫn cài đặt (step-by-step)

### 1) Chuẩn bị môi trường

- Java 21
- Node.js >= 20 + npm
- MySQL (mặc định `localhost:3306`)
- Redis (mặc định `localhost:6379`)

### 2) Tạo database

```sql
CREATE DATABASE UngDungGoiXe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3) Cấu hình biến môi trường backend

Tạo `.env` (hoặc export trực tiếp) với các biến sau:

```env
JWT_SECRET=your_jwt_secret
JWT_AUDIENCE=ungdunggoixe-local

EMAIL_USERNAME=your_email
EMAIL_PASSWORD=your_email_app_password

AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
REGION=ap-southeast-1
BUCKET_NAME=your_s3_bucket
```

### 4) Chạy backend

```bash
cd /Users/dank/Desktop/giaoxe/Rent-car-platform
./mvnw spring-boot:run
```

- Backend URL: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

### 5) Chạy frontend

```bash
cd /Users/dank/Desktop/giaoxe/Rent-car-platform/frontend
npm install
cp .env.example .env.local
npm run dev
```

- Frontend URL: `http://localhost:5173`

### 6) Cấu hình env frontend

`frontend/.env.local`:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
# Optional
# VITE_GOOGLE_MAP_ID=
# VITE_API_BASE=/api
```

Vite proxy mặc định:

- `/api` -> `http://localhost:8080`
- `/files` -> `http://localhost:8080`

## 🧪 Lệnh chạy thường dùng

### Backend

```bash
./mvnw spring-boot:run
./mvnw test
./mvnw verify
./mvnw package -DskipTests
```

### Frontend

```bash
npm run dev
npm run build
npm run lint
```

## ☁️ Media Upload (AWS S3)

Các endpoint upload chính hiện dùng S3:

- `POST /vehicles/{id}/photos`
- `POST /uploads/owner-vehicle/photo`
- `POST /uploads/owner-vehicle/document`
- `POST /bookings/{id}/feedback/photos`
- `POST /admin/blog/posts/cover-image`
- `POST /users/my-documents`

## 🔁 CI/CD

Workflow: `.github/workflows/ci.yml`

- Build backend với Maven Wrapper
- Build & push Docker image lên Docker Hub
- Service phụ trợ trong pipeline: MySQL, Redis

GitHub Secrets tối thiểu:

- `JWT_SECRET`, `JWT_AUDIENCE`
- `EMAIL_USERNAME`, `EMAIL_PASSWORD`
- `DOCKER_USERNAME`, `DOCKER_PASSWORD`

Nếu chạy test/media phụ thuộc AWS trong CI:

- `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `REGION`, `BUCKET_NAME`


## 🔒 Bảo mật

- Không commit `.env` hoặc secret thật vào repo.
- Dùng GitHub Secrets thay vì hard-code trong workflow.
- Rotate secrets ngay nếu có rủi ro lộ thông tin.

