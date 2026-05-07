# Rent-car-platform (UngDungGoiXe)

Ứng dụng thuê xe gồm:

- Backend: Spring Boot (Java 21, Maven Wrapper)
- Frontend: React + Vite + TypeScript
- Database: MySQL
- Cache / token store: Redis
- Media storage: AWS S3

## Yêu cầu môi trường

- Java 21
- Node.js >= 20 và npm
- MySQL local (mặc định `localhost:3306`)
- Redis local (mặc định `localhost:6379`)

## Cấu trúc thư mục chính

- `src/`: backend Spring Boot
- `frontend/`: SPA React/Vite
- `src/main/resources/application.yaml`: cấu hình backend
- `.github/workflows/ci.yml`: pipeline CI/CD

## Setup local nhanh

### 1) Tạo database

```sql
CREATE DATABASE UngDungGoiXe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2) Cấu hình biến môi trường backend

Biến tối thiểu nên có khi chạy local:

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

Ghi chú:

- `application.yaml` đã có fallback cho một số biến, nhưng để test đầy đủ upload/media bạn cần set đủ bộ AWS.
- Không commit các giá trị thật vào repo.

### 3) Chạy backend

```bash
cd /Users/dank/Desktop/giaoxe/Rent-car-platform
./mvnw spring-boot:run
```

- Backend mặc định: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

### 4) Chạy frontend

```bash
cd /Users/dank/Desktop/giaoxe/Rent-car-platform/frontend
npm install
cp .env.example .env.local
npm run dev
```

- Frontend mặc định: `http://localhost:5173`

## Env frontend

Trong `frontend/.env.local`:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
# Optional
# VITE_GOOGLE_MAP_ID=
# VITE_API_BASE=/api
```

Vite proxy mặc định:

- `/api` -> `http://localhost:8080`
- `/files` -> `http://localhost:8080`

## Scripts thường dùng

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

## Trạng thái media storage

Các luồng upload hiện đã chuyển sang AWS S3:

- `POST /vehicles/{id}/photos`
- `POST /uploads/owner-vehicle/photo`
- `POST /uploads/owner-vehicle/document`
- `POST /bookings/{id}/feedback/photos`
- `POST /admin/blog/posts/cover-image`
- `POST /users/my-documents`

## CI/CD (GitHub Actions)

Workflow: `.github/workflows/ci.yml`

- Runner: `ubuntu-latest`
- Services: MySQL 8 + Redis 7
- Build backend bằng Maven Wrapper
- Build và push Docker image lên Docker Hub

Secrets cần cấu hình trong GitHub:

- `JWT_SECRET`, `JWT_AUDIENCE`
- `EMAIL_USERNAME`, `EMAIL_PASSWORD`
- `DOCKER_USERNAME`, `DOCKER_PASSWORD`

Nếu bật test hoặc cần upload S3 trong CI, thêm:

- `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `REGION`, `BUCKET_NAME`

## Lỗi hay gặp

- `Could not resolve placeholder 'JWT_AUDIENCE'`:
  - Thiếu env JWT khi chạy test/context.
- `Bucket cannot be empty`:
  - Thiếu `BUCKET_NAME`.
- `Unable to locate credentials` hoặc lỗi quyền S3:
  - Kiểm tra `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, IAM policy và region.
- `vite http proxy error ECONNREFUSED`:
  - Backend chưa chạy hoặc bị crash.

## Bảo mật

- Không commit `.env` hoặc secret thật.
- Rotate secret ngay nếu lộ trong chat/log/commit.
- Dùng GitHub Secrets cho CI thay vì hard-code trong workflow.

