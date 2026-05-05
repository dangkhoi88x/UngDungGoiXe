# UngDungGoiXe — Onboarding kỹ thuật cho developer

**Đối tượng:** dev mới vào repo, code review, hoặc thuyết trình **nội bộ kỹ thuật**.  
**Bổ sung:** [`introduce.md`](./introduce.md) (tổng quan sản phẩm), [`plan.md`](./plan.md) (quy ước nhanh), [`architecture.md`](./architecture.md) (sơ đồ sâu, sequence đầy đủ).

---

## 1. Stack & phiên bản (thực tế trong repo)

| Thành phần | Chi tiết |
|------------|----------|
| **Backend** | Java **21**, Spring Boot **4.0.5** (`pom.xml` parent), Maven |
| **Frontend** | React **19**, TypeScript, Vite **5** (`frontend/package.json`) |
| **DB** | MySQL, Hibernate **7** / JPA, `ddl-auto: update` + `schema-mysql.sql` (bổ sung cột) |
| **Cache / session** | Redis — refresh token whitelist, blacklist access (logout) |
| **API docs** | Springdoc OpenAPI — UI thường tại `/swagger-ui.html` (xem `application.yaml`) |
| **Tích hợp** | Cloudinary (HTTP5 client), Google API Client (verify `id_token`), MoMo (HTTP + HMAC) |

**Quy ước gọi API từ FE:** mọi request dùng tiền tố **`/api/...`**; Vite `rewrite` bỏ `/api` khi proxy tới backend `:8080` → backend nhận **`/bookings`**, **`/auth/login`**, không phải `/api/bookings`.

---

## 2. Cấu trúc repo (điều hướng nhanh)

```
New-rentcar/
├── pom.xml                          # Maven root, dependency
├── src/main/java/com/example/ungdunggoixe/
│   ├── UngDungGoiXeApplication.java # entrypoint
│   ├── configuration/               # Security, JWT, Cloudinary, WebMvc, …
│   ├── controller/                  # REST — mỏng, delegate service
│   ├── service/                     # nghiệp vụ, @Transactional
│   ├── repository/                  # Spring Data JPA
│   ├── entity/                      # JPA model
│   ├── dto/request|response/        # Hợp đồng JSON
│   ├── mapper/                      # MapStruct
│   ├── exception/                   # AppException, GlobalExceptionHandler
│   └── security/                    # JWT converter / validator nếu có
├── src/main/resources/
│   ├── application.yaml
│   └── i18n/messages_*.properties
└── frontend/
    ├── vite.config.ts               # proxy /api → backend
    ├── src/App.tsx                  # routes
    ├── src/pages/                   # màn hình theo route
    └── src/api/                     # fetch helpers, authFetch, *.ts theo domain
```

---

## 3. Hợp đồng API & lỗi

- **Envelope:** `ApiResponse<T>` — `status`, `message`, `data`, `timestamp`, đôi khi `code` (số nghiệp vụ).
- **Lỗi có chủ đích:** `AppException(ErrorCode)` → `GlobalExceptionHandler` map sang HTTP status + message i18n (`ErrorCode.messageKey`).
- **Frontend:** `parseJsonSafe`, `unwrapApiData`, `getApiMessage` trong `frontend/src/api/apiResponse.ts`.

Luồng đọc khi debug 400/409: xem **mã trong response** (nếu có) → đối chiếu `ErrorCode.java` → key trong `messages_vi.properties`.

---

## 4. Bảo mật — luồng request có JWT

```mermaid
sequenceDiagram
  participant C as Client
  participant F as SecurityFilterChain
  participant J as JwtDecoder + CustomJwtValidator
  participant R as Controller

  C->>F: GET/POST + Bearer access JWT
  F->>J: decode HS256, validate aud, typ=ACCESS, exp, jti not blacklisted
  alt hợp lệ
    J->>F: Authentication (principal = Jwt / user id)
    F->>R: invoke handler
  else không hợp lệ
    F-->>C: 401
  end
```

**File cốt lõi:**

- `configuration/SecurityConfiguration.java` — `permitAll` vs `authenticated`, **thứ tự matcher quan trọng** (route `/users/my-*` authenticated **trước** `/users` permitAll).
- `configuration/JwtConfiguration.java` — bean decoder / validator.
- `security/CustomJwtValidator.java` (hoặc tương đương trong repo) — audience, `typ`, blacklist Redis.
- `service/JwtService.java` — phát access/refresh.
- `service/TokenService.java` — Redis: refresh whitelist, access blacklist.

**Method security:** `@PreAuthorize("isAuthenticated()")` trên một số controller (ví dụ upload); phần lớn dựa vào matcher + `authenticated()` cho `anyRequest()`.

---

## 5. Luồng đăng nhập email/mật khẩu + refresh + logout

```mermaid
sequenceDiagram
  participant FE as frontend/src/api/auth.ts
  participant AC as AuthenticationController
  participant AS as AuthenticationService
  participant AM as AuthenticationManager
  participant JWT as JwtService
  participant RD as Redis TokenService

  FE->>AC: POST /auth/login { email, password }
  AC->>AS: authenticate(request)
  AS->>AM: UsernamePasswordAuthenticationToken
  AM-->>AS: User (principal)
  AS->>JWT: generateAccessToken + generateRefreshToken
  AS->>RD: saveRefreshToken(jti)
  AC-->>FE: JSON accessToken + Set-Cookie refresh_token HttpOnly
```

- **Refresh:** `POST /auth/refresh-token` — chỉ cookie `refresh_token`; rotate refresh (`deleteRefreshToken` + save mới).
- **Logout:** `POST /auth/logout` — Bearer access + cookie refresh; xóa refresh + blacklist access `jti`.

**FE auto 401:** `frontend/src/api/authFetch.ts` — gọi refresh rồi retry; thất bại → xóa localStorage + redirect `/auth`.

---

## 6. Luồng đăng nhập Google (authorization code)

Phù hợp code hiện tại (không dùng Spring OAuth2 Login session).

```mermaid
sequenceDiagram
  participant FE as AuthPage / GoogleOAuthCallbackPage
  participant BE as AuthenticationController + Services
  participant GO as Google OAuth

  FE->>BE: GET /auth/google-oauth-client-id (optional — lấy clientId public)
  FE->>FE: sessionStorage state, redirect authorize
  FE->>GO: user đăng nhập Google
  GO->>FE: redirect /auth/google?code=&state=
  FE->>BE: POST /auth/google { code, redirectUri }
  BE->>GO: POST token (client_secret server-only)
  GO-->>BE: id_token
  BE->>BE: GoogleIdTokenVerifier + ensureUserForGoogleOAuth
  BE-->>FE: JWT + Set-Cookie refresh
```

**Class chính:** `GoogleOAuthService`, `AuthenticationService.authenticateWithGoogle`, `UserService.ensureUserForGoogleOAuth`, DTO `GoogleOAuthCodeRequest`.

**Env:** `OAUTH_GOOGLE_ID`, `OAUTH_GOOGLE_SECRET` → `application.yaml` `oauth2.google.*`. FE có thể thêm `VITE_OAUTH_GOOGLE_ID` hoặc chỉ dựa endpoint public client id.

---

## 7. Luồng đặt xe (booking) — góc nhìn code

1. **Khả dụng:** `GET /bookings/vehicle-availability` — `permitAll`; service kiểm tra trùng slot theo `Vehicle` + khoảng thời gian.
2. **Tạo đơn:** `POST /bookings` — body kiểu `CreateBookingRequest`; `BookingService` tính giá (`calculateBasePrice`: số giờ làm tròn tối thiểu 1), áp rule cọc / trạng thái.
3. **State machine:** enum `BookingStatus` — chuyển trạng thái tập trung trong service; lỗi chuyển sai → `BOOKING_STATUS_TRANSITION_INVALID`, v.v.

**File:** `BookingController.java`, `BookingService.java`, `BookingRepository` + query availability.

---

## 8. Luồng thanh toán MoMo (prepay tổng)

```mermaid
sequenceDiagram
  participant FE as VehicleBookingPage / bookings.ts
  participant PC as PaymentController / BookingController
  participant PS as PaymentService
  participant MM as MoMo API
  participant IP as MomoController ipn

  FE->>PC: POST /bookings/{id}/payments/momo/prepay-total (JWT)
  PS->>MM: create payment → payUrl
  FE->>MM: redirect user
  MM->>IP: POST /momo/ipn-handler (server-side)
  PS->>PS: verify signature, update Payment + Booking
  MM->>FE: redirect return-url → /payment/momo-return
  FE->>PS: POST /momo/confirm-return (bổ sung khi IPN không tới dev)
```

**Lưu ý dev:** `momo.ipn-url` phải public để MoMo gọi; localhost thường dùng tunnel hoặc **`confirm-return`** sau redirect.

**File:** `MomoController`, `MomoService`, `PaymentService#createMomoPrepayTotal`, `handleMomoIpnResult`; FE `momoConfirm.ts`, `MomoReturnPage.tsx`.

---

## 9. Luồng media Cloudinary

```mermaid
flowchart LR
  subgraph upload [Upload]
    MP[MediaService.upload / uploadOwnerAsset]
    CY[Cloudinary uploader]
  end
  subgraph persist [Persist]
    DB[(MySQL chỉ lưu URL)]
  end
  CTL[VehiclePhotoController / UploadController / BookingFeedbackService] --> MP
  MP --> CY
  CY --> MP
  MP --> CTL
  CTL --> DB
```

- **Bean:** `CloudinaryConfiguration` → URL dạng `cloudinary://key:secret@cloud_name`.
- **Folder:** `vehicles/{id}`, `owner-vehicles/{userId}/photos|documents`, `bookings/{bookingId}/feedback`.
- **Xóa:** `MediaService.tryDestroyBySecureUrl` — chỉ destroy khi URL thuộc `res.cloudinary.com` + path đúng `cloud_name` (tránh xóa nhầm URL ngoài).

---

## 10. Luồng feedback sau booking

1. Điều kiện: `BookingStatus.COMPLETED`, renter đúng user, **chưa** có `Feedback` cho `booking_id`.
2. **Upload ảnh:** `POST /bookings/{id}/feedback/photos` → `BookingFeedbackService.uploadFeedbackPhoto` → `MediaService.upload(..., bookings/{id}/feedback)`.
3. **Submit:** `POST /bookings/{id}/feedback` — body `SubmitBookingVehicleFeedbackRequest` gồm `vehicleRating`, `comment`, `photoUrls[]`; service validate URL thuộc Cloudinary + path booking.
4. **Aggregate:** cập nhật `Vehicle.rating` (trung bình) sau khi lưu feedback.

**Public đọc:** `GET /vehicles/{id}/feedback` — `permitAll` (kiểm tra `SecurityConfiguration` nhóm `/vehicles/**`).

---

## 11. Frontend — lớp API & routing

| Thành phần | Vai trò |
|------------|---------|
| `main.tsx` | `StrictMode`, `BrowserRouter` |
| `App.tsx` | Định nghĩa route; `RequireAdmin` đọc JWT claim `roles` |
| `api/auth.ts` | login, refresh, logout, Google resolve client id, `googleOAuthLoginRequest` |
| `api/authFetch.ts` | Wrapper fetch + Bearer + retry refresh |
| `api/*.ts` theo domain | vehicles, bookings, payments, owner, admin, … |

**Biến môi trường FE:** `VITE_API_BASE` (mặc định `/api`), tuỳ chọn `VITE_OAUTH_GOOGLE_ID`, Maps keys cho `/mapstation`, v.v.

---

## 12. Biến môi trường backend (checklist onboarding)

| Biến / nhóm | Ghi chú |
|-------------|---------|
| `JWT_SECRET`, `JWT_AUDIENCE` | Bắt buộc cho JWT |
| MySQL, Redis | URL / password trong `application.yaml` hoặc env |
| `CLOUDINARY_*` / `cloudinary.*` | Upload ảnh |
| `OAUTH_GOOGLE_ID`, `OAUTH_GOOGLE_SECRET` | Google login |
| MoMo | partner code, keys, `return-url`, `ipn-url` |
| Email | `EMAIL_USERNAME`, `EMAIL_PASSWORD` nếu dùng gửi mail đăng ký |

---

## 13. Lệnh chạy nhanh

```bash
# Backend (JDK 21)
./mvnw -DskipTests compile
./mvnw spring-boot:run

# Frontend
cd frontend && npm ci && npm run dev
```

IntelliJ: **Rebuild Project** trước run nếu thiếu `target/classes` (tránh `ClassNotFoundException` main class).

---

## 14. Thứ tự đọc code đề xuất (onboarding 1–2 ngày)

1. `SecurityConfiguration` + `JwtConfiguration` + validator JWT  
2. `AuthenticationController` + `AuthenticationService` + `JwtService` + `TokenService`  
3. `GlobalExceptionHandler` + `ErrorCode`  
4. `BookingController` + `BookingService` (create + status)  
5. `PaymentService` + `MomoController` (đoạn prepay + IPN)  
6. `MediaService` + một controller upload (`VehiclePhotoController` / `UploadController`)  
7. `BookingFeedbackService` + `BookingController` feedback endpoints  
8. FE: `auth.ts` + `authFetch.ts` + một page đặt xe / feedback  

Chi tiết diagram và edge case: **`architecture.md`**.

---

## 15. Liên kết tài liệu

| File | Khi nào mở |
|------|------------|
| [`introduce.md`](./introduce.md) | Pitch stakeholder / không đọc code |
| [`introduce-dev.md`](./introduce-dev.md) | **File này** — onboarding dev |
| [`plan.md`](./plan.md) | Quy ước route, matcher security tóm tắt |
| [`architecture.md`](./architecture.md) | Sequence đầy đủ, MoMo §13, Cloudinary §16, Google OAuth §4.6 |
