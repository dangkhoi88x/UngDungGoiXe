# ThueXeOto - Rent Car Platform

ThueXeOto là nền tảng marketplace B2B/B2C cho thuê ô tô tự lái, kết nối người dùng có nhu cầu thuê xe với cá nhân, chủ xe và đơn vị kinh doanh muốn khai thác xe nhàn rỗi của mình. Hệ thống hỗ trợ trọn vẹn quy trình từ đăng xe, duyệt hồ sơ chủ xe, tìm kiếm và đặt xe, thanh toán, quản lý chuyến thuê, đánh giá sau chuyến đi đến lưu trữ hình ảnh/tài liệu trên AWS S3.

Trang web đã được deploy tại: [https://thuexeoto.online](https://thuexeoto.online)

## Tổng Quan

Dự án hiện đang là mono-repo gồm:

- Backend Spring Boot trong thư mục gốc.
- Frontend React/Vite trong thư mục `frontend/`.
- Media upload dùng AWS S3, không còn phục vụ file local qua `/files`.
- Backend production có thể build thành Docker image bằng `Dockerfile`.
- CI GitHub Actions build Maven package và push image Docker Hub.

## Tech Stack

Backend:

- Java 21
- Spring Boot 4.0.5
- Spring Security, JWT, OAuth2 Google
- Spring Data JPA, MySQL
- Spring Data Redis
- MapStruct, Lombok
- AWS SDK S3
- Spring Mail
- Swagger/OpenAPI
- Maven Wrapper

Frontend:

- React 19
- TypeScript
- Vite
- React Router
- OpenStreetMap + Leaflet
- TipTap rich text editor cho blog admin

Hạ tầng:

- MySQL
- Redis
- AWS S3
- Docker
- GitHub Actions

## Tính Năng Chính

Người dùng:

- Đăng ký, đăng nhập, refresh token, đăng nhập Google.
- Tìm kiếm xe, xem chi tiết xe, xem đánh giá công khai.
- Đặt xe và theo dõi lịch sử booking.
- Thanh toán tổng trước qua MoMo.
- Upload giấy tờ xác minh tài khoản lên S3.
- Gửi đánh giá sau chuyến đi, kèm ảnh feedback upload lên S3.

Chủ xe:

- Gửi yêu cầu đăng xe.
- Upload ảnh xe và tài liệu xe lên S3.
- Theo dõi trạng thái duyệt hồ sơ.
- Cập nhật hoặc gửi lại yêu cầu khi admin yêu cầu bổ sung.
- Xem lịch sử booking của xe đã được duyệt.

Admin:

- Quản lý user, xe, trạm, booking.
- Duyệt, từ chối hoặc yêu cầu bổ sung hồ sơ chủ xe.
- Quản lý thanh toán, xác nhận thu thêm/hoàn tiền.
- Quản lý feedback sau chuyến đi.
- Quản lý bài viết blog và upload ảnh cover lên S3.
- Xem dashboard thống kê quản trị.

## Cấu Trúc Thư Mục

```text
.
├── src/                         # Backend Spring Boot
│   └── main/
│       ├── java/com/example/ungdunggoixe/
│       │   ├── configuration/    # Security, AWS, Swagger, Redis, ...
│       │   ├── constant/         # Constant dùng chung
│       │   ├── controller/       # REST API
│       │   ├── dto/              # Request/response DTO
│       │   ├── entity/           # JPA entities
│       │   ├── mapper/           # MapStruct mapper
│       │   ├── repository/       # JPA/Redis repositories
│       │   ├── service/          # Service interfaces
│       │   ├── service/implement/# Service implementations
│       │   └── util/             # Utility helpers
│       └── resources/
│           ├── application.yaml
│           ├── application-dev.yaml
│           ├── application-prod.yaml
│           └── schema-mysql.sql
├── frontend/                    # Frontend React/Vite
├── .github/workflows/ci.yml      # CI build backend + Docker image
├── Dockerfile                    # Backend Docker image
├── pom.xml
└── README.md
```

## Yêu Cầu Môi Trường Local

- Java 21
- Node.js 20 trở lên
- npm
- MySQL chạy ở `localhost:3306`
- Redis chạy ở `localhost:6379`
- AWS S3 bucket nếu muốn test upload media

## Cấu Hình Database

Tạo database local:

```sql
CREATE DATABASE UngDungGoiXe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Mặc định profile `dev` đang dùng:

```yaml
spring.datasource.url: jdbc:mysql://localhost:3306/UngDungGoiXe
spring.datasource.username: root
spring.datasource.password: 12345
spring.data.redis.host: localhost
spring.data.redis.port: 6379
spring.data.redis.password: 12345678
```

Có thể chỉnh trong `src/main/resources/application-dev.yaml` hoặc override bằng biến môi trường.

## Biến Môi Trường Backend

Các biến quan trọng khi chạy local hoặc production:

```env
SPRING_PROFILES_ACTIVE=dev

JWT_SECRET=your_jwt_secret
JWT_AUDIENCE=ungdunggoixe-local

EMAIL_USERNAME=your_gmail
EMAIL_PASSWORD=your_gmail_app_password

AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
REGION=ap-southeast-1
BUCKET_NAME=your_s3_bucket

OAUTH_GOOGLE_ID=your_google_client_id
OAUTH_GOOGLE_SECRET=your_google_client_secret

APP_WEB_BASE_URL=http://localhost:5173
```

Production có thể dùng thêm:

```env
SPRING_PROFILES_ACTIVE=prod
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_USERNAME=root
MYSQL_PASSWORD=your_mysql_password
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
APP_WEB_BASE_URL=https://thuexeoto.online
```

## Chạy Backend Local

Tại root project:

```bash
./mvnw spring-boot:run
```

Backend local:

- API: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

Nếu port `8080` đang bị dùng, có thể chạy port khác:

```bash
./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.port=8081
```

## Chạy Frontend Local

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend local:

- `http://localhost:5173`

`frontend/vite.config.ts` đang proxy `/api` về backend local `http://localhost:8080`. Nếu backend chạy port khác, chỉnh lại proxy hoặc biến môi trường frontend tương ứng.

## Biến Môi Trường Frontend

Ví dụ `frontend/.env.local`:

```env
VITE_API_BASE=/api
```

Khi deploy frontend riêng, cấu hình API base trỏ tới domain backend/API production theo môi trường deploy.

## Media Upload

Project hiện dùng AWS S3 cho media upload. Các luồng upload chính:

- `POST /vehicles/{id}/photos`
- `POST /uploads/owner-vehicle/photo`
- `POST /uploads/owner-vehicle/document`
- `POST /bookings/{id}/feedback/photos`
- `POST /admin/blog/posts/cover-image`
- `POST /users/my-documents`

Lưu ý: các URL file local cũ dạng `/files/...` không còn được phục vụ sau khi chuyển sang S3.

## Lệnh Thường Dùng

Backend:

```bash
./mvnw -q -DskipTests compile
./mvnw test
./mvnw package -DskipTests
```

Frontend:

```bash
cd frontend
npm run dev
npm run build
npm run lint
```

Docker backend:

```bash
docker build -t ungdunggoixe:latest .
docker run -p 8080:8080 --env-file .env ungdunggoixe:latest
```

## CI/CD

Workflow: `.github/workflows/ci.yml`

Pipeline hiện tại:

- Checkout code.
- Setup Java 21.
- Build backend bằng Maven.
- Build Docker image từ `Dockerfile`.
- Push image lên Docker Hub với tag `ungdunggoixe:latest`.

GitHub Secrets cần có:

```text
JWT_SECRET
JWT_AUDIENCE
EMAIL_USERNAME
EMAIL_PASSWORD
DOCKER_USERNAME
DOCKER_PASSWORD
```

Nếu pipeline hoặc môi trường deploy cần upload S3:

```text
AWS_ACCESS_KEY
AWS_SECRET_KEY
REGION
BUCKET_NAME
```

## Ghi Chú Khi Tách Repo Frontend/Backend

Project hiện vẫn là mono-repo. Nếu tách thành hai repo:

- Repo backend giữ `src/`, `pom.xml`, `mvnw`, `.mvn/`, `Dockerfile`.
- Repo frontend đưa toàn bộ nội dung `frontend/` lên root repo mới.
- Frontend production cần cấu hình API base trỏ tới backend public.
- Backend cần cấu hình CORS cho domain frontend, ví dụ `https://thuexeoto.online`.

## Bảo Mật

- Không commit `.env`, secret thật, access key hoặc password production.
- Dùng GitHub Secrets hoặc biến môi trường trên server.
- Rotate secret ngay nếu nghi ngờ bị lộ.
- Cấu hình CORS đúng domain production, tránh mở rộng không cần thiết.
