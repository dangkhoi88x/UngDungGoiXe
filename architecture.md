# UngDungGoiXe — Kiến trúc hệ thống

**Mục đích:** Tài liệu kiến trúc kỹ thuật để **phiên Cursor / agent mới** nắm cấu trúc tổng thể, luồng dữ liệu và ranh giới module — **đọc cùng [`plan.md`](./plan.md)** (`plan.md` tập trung stack, route, quy tắc nghiệp vụ ngắn).

---

## 1. Bối cảnh tổng thể (C4 — mức hệ thống)

```mermaid
flowchart LR
  subgraph client [Browser]
    SPA[React SPA Vite]
  end
  subgraph dev [Dev]
    Vite[Vite dev :5173]
  end
  subgraph server [Spring Boot :8080]
    API[REST Controllers]
    SEC[Spring Security JWT]
    SVC[Services]
    JPA[JPA Repositories]
  end
  subgraph data [Data]
    MySQL[(MySQL)]
    Redis[(Redis)]
    FS[Local files uploads]
  end
  SPA --> Vite
  Vite -->|"/api proxy"| API
  API --> SEC
  SEC --> SVC
  SVC --> JPA
  JPA --> MySQL
  SVC --> Redis
  SVC --> FS
```

- **Production / build:** SPA build ra static files có thể phục vụ qua Spring hoặc CDN; dev dùng proxy như trong `frontend/vite.config.ts`.
- **API quy ước:** Frontend gọi **`/api/...`** → Vite rewrite thành **`/...`** trên backend.

---

## 2. Tầng backend (Spring)

```mermaid
flowchart TB
  subgraph presentation [Presentation]
    C[Controllers REST]
    GEH[GlobalExceptionHandler]
    CFG[SecurityConfiguration WebMvcConfig ...]
  end
  subgraph application [Application]
    S[Services]
    M[Mappers MapStruct]
    JWT[JwtService Auth services]
  end
  subgraph domain [Domain persistence]
    R[Repositories JPA]
    E[Entities]
  end
  C --> S
  C --> GEH
  S --> R
  S --> M
  M --> E
  R --> E
```

| Package / nhóm | Trách nhiệm |
|------------------|-------------|
| `controller` | HTTP, DTO in/out, không chứa nghiệp vụ dài |
| `service` | Luồng nghiệp vụ, giao dịch `@Transactional`, gọi repo |
| `repository` | Spring Data JPA, query tùy chỉnh khi cần |
| `entity` | JPA model, quan hệ |
| `dto/request`, `dto/response` | Hợp đồng JSON |
| `mapper` | MapStruct entity ↔ DTO |
| `configuration` | Security filter chain, JWT converter, Redis, static files |
| `exception` | `AppException`, xử lý lỗi chuẩn hóa `ApiResponse` |

---

## 3. Mô hình dữ liệu cốt lõi (rút gọn)

```mermaid
erDiagram
  USER ||--o{ USER_ROLE : has
  ROLE ||--o{ USER_ROLE : grants
  USER ||--o{ BOOKING : rents
  STATION ||--o{ VEHICLE : hosts
  STATION ||--o{ BOOKING : at
  VEHICLE ||--o{ BOOKING : booked
  BOOKING ||--o{ PAYMENT : has
  USER {
    long id
    string email
    enum licenseVerificationStatus
  }
  VEHICLE {
    long id
    long stationId
    enum status
    decimal hourlyRate
  }
  BOOKING {
    long id
    string bookingCode
    enum status
    datetime startTime
    datetime expectedEndTime
  }
```

- **Booking** gắn **renter** (`User`), **vehicle**, **station**; trạng thái và tiền xử lý trong `BookingService`.
- **Payment** gắn booking (chi tiết xem entity/DTO).

---

## 4. Kiến trúc bảo mật (hai luồng)

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant Auth as POST /auth/login
  participant API as Protected REST
  FE->>Auth: email password JSON
  Auth-->>FE: accessToken JSON plus Set-Cookie refresh_token HttpOnly
  FE->>API: Authorization Bearer accessToken
  API-->>FE: 401 optional
  FE->>Auth: POST /auth/refresh-token cookie
  Auth-->>FE: new accessToken plus cookie rotate
```

- **Đăng nhập:** `AuthenticationFilter` (Spring Security 7) + **JWT Resource Server** cho các request có Bearer token.
- **Phân quyền:** JWT claim **`roles`** → `JwtGrantedAuthoritiesConverter` (prefix rỗng); frontend `RequireAdmin` so khớp nhiều biến thể tên role.

Chi tiết matcher `permitAll` / `authenticated`: xem `SecurityConfiguration` trong repo và mục tương ứng trong `plan.md`.

### Sequence ngắn: Validate Access Token

```mermaid
sequenceDiagram
  participant C as Client
  participant SF as Security Filter
  participant JD as accessTokenDecoder
  participant CV as CustomJwtValidator
  participant API as Controller API
  C->>SF: GET /api/... + Bearer accessToken
  SF->>JD: decode + verify signature HS256
  JD->>CV: validate exp, aud, typ=ACCESS, jti not blacklisted
  alt hợp lệ
    SF->>API: set Authentication and continue
    API-->>C: 200 OK
  else không hợp lệ
    SF-->>C: 401 Unauthorized
  end
```

### Security learning flow (chi tiết dễ học)

Mục này là bản “đọc nhanh 1 lần là nắm luồng” cho các file auth/security.

#### 1) Login: tạo Access + Refresh

- **Entry point:** `AuthenticationController.login()` gọi `AuthenticationService.authenticate()`.
- Frontend gửi `POST /auth/login` (`frontend/src/api/auth.ts`).
- Backend dùng `AuthenticationManager` + `DaoAuthenticationProvider` + `UserDetailsServiceImpl` để xác thực email/password.
- Khi hợp lệ:
  - `JwtService.generateAccessToken()` tạo token loại **ACCESS** (`typ=ACCESS`) với claim quan trọng: `sub`, `roles`, `aud`, `jti`, `exp` (~1h).
  - `JwtService.generateRefreshToken()` tạo token loại **REFRESH** (`typ=REFRESH`) với `jti`, `aud`, `exp` (~14 ngày).
  - `TokenService.saveRefreshToken()` lưu `jti` refresh vào Redis (`refresh_token`) như whitelist phiên hợp lệ.
- Response trả:
  - `accessToken` trong JSON.
  - cookie HttpOnly `refresh_token` (set ở controller).

#### 2) Validate Access Token cho API protected

- **Cấu hình chính:** `SecurityConfiguration` + `JwtConfiguration` + `CustomJwtValidator`.
- Mọi route không `permitAll()` đi qua OAuth2 Resource Server JWT filter.
- Bean `accessTokenDecoder` sẽ:
  - verify chữ ký HS256.
  - check mặc định timestamp (`JwtValidators.createDefault()`).
  - check custom (`CustomJwtValidator`):
    - `aud` phải khớp `jwt.audience`.
    - `typ` bắt buộc là `ACCESS`.
    - phải có `jti`.
    - `jti` không nằm trong Redis blacklist (`blacklist_token`).
- Fail ở bước nào cũng trả `401`.

#### 3) Refresh Token: rotate để chống replay

- **Entry point:** `AuthenticationController.refreshToken()` gọi `AuthenticationService.refreshToken()`.
- Frontend gọi `POST /auth/refresh-token` với cookie `refresh_token` (do `authFetch` tự gọi khi gặp 401).
- Service thực hiện:
  1. parse + verify chữ ký refresh token (Nimbus `MACVerifier`).
  2. check hết hạn.
  3. đọc `jti` và kiểm tra tồn tại trong Redis whitelist (`findRefreshByJti`).
  4. kiểm tra token thuộc đúng user.
  5. phát access token mới.
  6. **rotate refresh token:** xóa refresh cũ (`deleteRefreshToken(jti)`), tạo refresh mới, lưu Redis, set cookie mới.
- Ý nghĩa: mỗi refresh token chỉ dùng 1 lần, giảm nguy cơ replay.

#### 4) Logout: vô hiệu hóa cả refresh lẫn access

- **Entry point:** `AuthenticationController.logout()` gọi `AuthenticationService.logOut()`.
- Client gửi:
  - `Authorization: Bearer <accessToken>`
  - cookie `refresh_token` (nếu còn).
- Service xử lý:
  1. validate refresh token (`TokenType.REFRESH`) rồi xóa `jti` khỏi whitelist Redis.
  2. validate access token (`TokenType.ACCESS`) rồi đưa `jti` vào blacklist Redis tới lúc token hết hạn.
- Controller set cookie refresh rỗng (`maxAge=0`) để trình duyệt xóa.
- Sau logout:
  - refresh cũ không dùng lại được.
  - access cũ bị chặn ngay nhờ check blacklist.

#### 5) Frontend auto-recover session (401 -> refresh -> retry)

- File chính: `frontend/src/api/authFetch.ts`.
- Luồng:
  1. Gắn Bearer access token từ `localStorage`.
  2. Nếu response là 401 -> gọi `refreshAccessToken()`.
  3. refresh thành công -> lưu access token mới -> retry request cũ.
  4. refresh fail -> xóa session local + redirect `/auth`.

#### 6) Thứ tự đọc code khuyến nghị

1. `configuration/SecurityConfiguration.java`
2. `configuration/JwtConfiguration.java`
3. `security/CustomJwtValidator.java`
4. `service/JwtService.java`
5. `service/AuthenticationService.java`
6. `service/TokenService.java`
7. `controller/AuthenticationController.java`
8. `frontend/src/api/authFetch.ts` và `frontend/src/api/auth.ts`

#### 7) Ghi chú debug quan trọng

- Redis dùng 2 “kho logic”:
  - `refresh_token`: whitelist refresh token còn hiệu lực.
  - `blacklist_token`: access token đã logout.
- `typ` claim là điểm phân biệt ACCESS / REFRESH.
- `aud` claim bị check custom; mismatch audience sẽ ra 401.
- Khi thay matcher trong `SecurityConfiguration`, chú ý thứ tự `requestMatchers(...)` để tránh mở nhầm endpoint private.

---

## 5. Kiến trúc frontend (SPA)

```mermaid
flowchart TB
  subgraph entry [Entry]
    main[main.tsx]
    App[App.tsx routes]
  end
  subgraph pages [Pages]
    P1[Landing Auth Account]
    P2[Rent list detail]
    P3[Booking checkout]
    P4[Admin dashboard sections]
    P5[Owner P2P register list edit]
    P6[Map stations]
  end
  subgraph api [API layer]
    AF[authFetch]
    M[vehicles stations bookings users auth]
    OVR[ownerVehicleRequests]
  end
  main --> App
  App --> pages
  pages --> api
  AF --> M
  AF --> OVR
```

- **Router:** mọi URL trong `App.tsx` (xem bảng trong `plan.md`).
- **Owner cho thuê (P2P):** `/owner/register-vehicle`, `/owner/vehicle-requests`, `/owner/vehicle-requests/:id/edit` — gọi API qua `ownerVehicleRequests.ts`, form dùng chung helper `lib/ownerVehicleRequestForm.ts`.
- **Trạng thái đăng nhập:** `localStorage` + (tuỳ trang) `fetchMyInfo` cho dữ liệu nhạy cảm như GPLX.
- **Gate GPLX (thuê xe):** logic `isLicenseApprovedForRent` — cho **APPROVED** và **PENDING**; UI `LicenseRequiredModal` khi chặn.

---

## 6. Luồng nghiệp vụ: đặt xe (happy path)

```mermaid
sequenceDiagram
  participant U as User
  participant VD as VehicleDetailPage
  participant API as GET users/my-info
  participant BK as POST bookings
  U->>VD: Đặt xe
  VD->>API: fetchMyInfo GPLX check
  alt APPROVED or PENDING
    VD->>U: navigate booking
    U->>BK: createBooking JWT
    BK-->>U: booking created
  else NOT_SUBMITTED or REJECTED
    VD->>U: modal to account
  end
```

- Kiểm tra lịch trống: `GET /bookings/vehicle-availability` (public) — frontend debounce; backend vẫn kiểm tra khi tạo booking.

---

## 7. Cấu hình & triển khai

| Thành phần | Ghi chú |
|------------|---------|
| `application.yaml` | Datasource, Redis, JWT env, multipart, `app.upload-dir` |
| `schema-mysql.sql` | Bổ sung cột / an toàn với `continue-on-error` |
| Env | `JWT_SECRET`, `JWT_AUDIENCE` bắt buộc cho JWT |

---

## 8. Gợi ý khi mở rộng

- Thêm endpoint: cập nhật **`SecurityConfiguration`** trước khi kỳ vọng gọi từ FE anonymous.
- Thay đổi giá booking: đồng bộ **`BookingService#calculateBasePrice`** và **`computeBookingEstimate`** (frontend).
- Tách microservice: ranh giới tự nhiên hiện tại là **monolith theo package**; tách trước hết có thể là **file storage** hoặc **notification**.

---

## 9. Trạm (Station) — tọa độ & bản đồ

**Mục đích:** lưu tọa độ WGS84 (nullable) để vẽ marker trên bản đồ và hỗ trợ admin chỉnh tay.

| Thành phần | Ghi chú |
|------------|---------|
| **DB** | Bảng `stations`: cột `latitude`, `longitude` (`DOUBLE NULL`). Migration / idempotent: `schema-mysql.sql`. Seed: `src/main/resources/db/seed.sql` (cập nhật tọa độ mẫu). |
| **Backend** | `Station` entity + DTO (`StationResponse`, `CreateStationRequest`, `UpdateStationRequest`). `UpdateStationRequest.clearCoordinates` + `StationService.updateStation` xử lý xóa tọa độ (MapStruct bỏ qua `null`). |
| **API** | `GET /stations` (và các endpoint station khác) trả thêm `latitude`, `longitude`. |
| **Admin FE** | `AdminStationsSection.tsx` — nhập/sửa lat/lng, cột hiển thị, gửi `clearCoordinates` khi xóa. |
| **Bản đồ FE** | Route `/mapstation` — `MapStationPage.tsx` + `MapStationPage.css`. Loader tập trung: `lib/googleMapsLoader.ts` (`@googlemaps/js-api-loader`), đọc `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`, tùy chọn `VITE_GOOGLE_MAP_ID`. Tách khỏi trang thuê xe: `CarRentalPage` / `VehicleBookingPage` không nhúng map (tránh lỗi import / Strict Mode). |
| **API client** | `frontend/src/api/stations.ts` — type `StationDto` + payload cập nhật có `latitude`, `longitude`, `clearCoordinates`. |

---

## 10. Luồng P2P: **Owner Vehicle Request** (chủ xe đăng ký cho thuê — admin duyệt)

Đây là luồng **tách biệt** khỏi `Vehicle` / `Booking` cho đến khi admin **duyệt**: dữ liệu nằm ở bảng request, sau `APPROVED` mới tạo bản ghi `Vehicle` thật và gắn `approved_vehicle_id`.

### 10.1 Trạng thái (`OwnerVehicleRequestStatus`)

| Giá trị | Ý nghĩa ngắn |
|---------|----------------|
| `PENDING` | Chờ admin xử lý |
| `NEED_MORE_INFO` | Admin yêu cầu bổ sung (có `adminNote`) |
| `APPROVED` | Đã tạo xe trong hệ thống, có `approvedVehicleId` |
| `REJECTED` | Từ chối |
| `CANCELLED` | Hủy (ít dùng trong MVP) |

### 10.2 Mô hình dữ liệu & persistence

- **Entity:** `entity/OwnerVehicleRequest.java` — FK `owner` → `User`, `station` → `Station`, tùy chọn `approvedVehicle` → `Vehicle`; thông tin xe (biển số, tên, hãng, nhiên liệu, chỗ, giá, cọc, mô tả, địa chỉ, lat/lng), URL giấy đăng ký / bảo hiểm, `status`, `adminNote`, timestamp.
- **Collection tables:** `owner_vehicle_request_photos` (URL ảnh), `owner_vehicle_request_policies` (chuỗi điều khoản).
- **Schema:** định nghĩa trong `src/main/resources/schema-mysql.sql` (bảng + collection).

```mermaid
erDiagram
  USER ||--o{ OWNER_VEHICLE_REQUEST : submits
  STATION ||--o{ OWNER_VEHICLE_REQUEST : pickup_station
  OWNER_VEHICLE_REQUEST }o--|| VEHICLE : approved_as
  OWNER_VEHICLE_REQUEST {
    long id
    string license_plate
    enum status
    long approved_vehicle_id FK_null
  }
```

### 10.3 Quy tắc nghiệp vụ (backend — `OwnerVehicleRequestService`)

| Quy tắc | Chi tiết |
|---------|-----------|
| **Biển số** | Chuẩn hóa trim + upper; không trùng với xe đã có (`VehicleRepository.existsByLicensePlate`) và không trùng request đang chặn (`PENDING`, `NEED_MORE_INFO`, `APPROVED`) — ngoại trừ chính request khi **update** đổi biển. |
| **Bộ dữ liệu tối thiểu** | Trước khi **tạo**, **cập nhật**, **resubmit** (về `PENDING`) và trước khi **admin approve**: ít nhất **3** URL ảnh (sau trim, bỏ dòng trống); **bắt buộc** URL giấy đăng ký + bảo hiểm (trim, không rỗng). Lỗi: `OWNER_VEHICLE_REQUEST_PHOTOS_INSUFFICIENT` (3006), `OWNER_VEHICLE_REQUEST_DOCS_REQUIRED` (3007). |
| **Create** | User hiện tại + `stationId` hợp lệ → `PENDING`. |
| **Update (`PUT /owner/vehicle-requests/{id}`)** | Chỉ owner của request; chỉ khi `PENDING` hoặc `NEED_MORE_INFO`. |
| **Resubmit (`POST .../resubmit`)** | Chỉ `REJECTED` hoặc `NEED_MORE_INFO` → `PENDING`, xóa `adminNote`; validate đủ ảnh + giấy tờ trước khi đổi trạng thái. |
| **Admin approve** | Chỉ từ `PENDING` / `NEED_MORE_INFO`; validate đủ ảnh + giấy tờ; tạo `Vehicle` (copy field phù hợp), gắn FK approved. |
| **Admin reject / need-more-info** | Theo `AdminOwnerVehicleRequestController` + `OwnerVehicleRequestService` (need-more-info hiện chỉ từ `PENDING` — xem code). |

**Mã lỗi liên quan:** `OWNER_VEHICLE_REQUEST_NOT_FOUND` (3003), `OWNER_VEHICLE_REQUEST_STATUS_INVALID` (3004), `OWNER_VEHICLE_REQUEST_INVALID` (3005), cộng 3006–3007 ở trên. Dùng chung `VEHICLE_LICENSE_PLATE_ALREADY_EXISTS` (3002) khi trùng biển.

### 10.4 API REST (tóm tắt)

| Phương thức & path | Vai trò | Bảo vệ |
|--------------------|---------|--------|
| `POST /owner/vehicle-requests` | Tạo request | JWT, authenticated |
| `GET /owner/vehicle-requests` | Danh sách của tôi | JWT |
| `GET /owner/vehicle-requests/{id}` | Chi tiết một request (của tôi) | JWT |
| `PUT /owner/vehicle-requests/{id}` | Cập nhật | JWT |
| `POST /owner/vehicle-requests/{id}/resubmit` | Gửi lại | JWT |
| `GET /admin/vehicle-requests?status=` | Admin lọc theo status | Role admin (xem controller) |
| `GET /admin/vehicle-requests/{id}` | Chi tiết admin | Admin |
| `POST /admin/vehicle-requests/{id}/approve` | Duyệt (+ body `adminNote` tùy chọn) | Admin |
| `POST /admin/vehicle-requests/{id}/reject` | Từ chối | Admin |
| `POST /admin/vehicle-requests/{id}/need-more-info` | Cần bổ sung | Admin |

Controller: `OwnerVehicleRequestController`, `AdminOwnerVehicleRequestController`. DTO: `CreateOwnerVehicleRequest`, `UpdateOwnerVehicleRequest`, `AdminReviewOwnerVehicleRequest`, `OwnerVehicleRequestResponse`. MapStruct: `OwnerVehicleRequestMapper`. Repo: `OwnerVehicleRequestRepository`.

### 10.5 Frontend

| Khu vực | File / route | Nội dung |
|---------|----------------|-----------|
| **API client** | `frontend/src/api/ownerVehicleRequests.ts` | Types (`OwnerVehicleRequestDto`, payload create/update), hàm owner + admin (`authFetch`). |
| **Đăng ký xe** | `/owner/register-vehicle` — `OwnerRegisterVehiclePage.tsx` + CSS | Form gửi `CreateOwnerVehicleRequest`; validate client đồng bộ với BE (ảnh, giấy tờ, giá). Dùng helper `lib/ownerVehicleRequestForm.ts`. |
| **Danh sách của tôi** | `/owner/vehicle-requests` — `OwnerMyVehicleRequestsPage.tsx` + `OwnerMyVehicleRequestsPage.css` | `fetchMyOwnerVehicleRequests`, nút Sửa / Gửi lại / link xe đã duyệt. |
| **Sửa request** | `/owner/vehicle-requests/:id/edit` — `OwnerEditVehicleRequestPage.tsx` | `fetchMyOwnerVehicleRequestById` + `updateOwnerVehicleRequest`; chặn form nếu không còn `PENDING`/`NEED_MORE_INFO`. |
| **Tài khoản** | `UserAccountPage.tsx` | Section “Cho thuê xe”: link đăng ký + link “Yêu cầu xe của tôi”. |
| **Admin** | `AdminOwnerVehicleRequestsSection.tsx` (lazy trong `AdminDashboardPage.tsx`) | Bảng + lọc + modal duyệt/từ chối/bổ sung; cột **Giấy tờ** (preview ảnh/PDF modal); **Xem nhanh ảnh xe** trong modal duyệt. Session filter: `adminSessionStorage` key `ownerVehicleRequests`. CSS bổ sung: `AdminVehiclesSection.css` (overlay modal ảnh/giấy tờ). |
| **Route** | `App.tsx` | Các route owner + map như hiện tại. |

**Lưu ý UX:** Trạng thái `REJECTED` — backend **không** cho `PUT` update; chỉ **Gửi lại** (`resubmit`) để về `PENDING`, sau đó mới **Sửa** được.

### 10.6 Sơ đồ luồng (owner → admin)

```mermaid
sequenceDiagram
  participant O as Owner (FE)
  participant API as POST /owner/vehicle-requests
  participant AD as Admin (FE)
  participant ADM as POST /admin/vehicle-requests/id/approve
  O->>API: Create request (photos, docs, …)
  API-->>O: PENDING
  AD->>ADM: Approve (sau khi đủ điều kiện)
  ADM-->>AD: APPROVED + vehicleId
  O->>O: GET /owner/vehicle-requests (theo dõi)
```

---

## 11. Changelog (kiến trúc)

- **2026-04-22:** Thêm mục **Trạm — tọa độ & bản đồ** và mục lớn **Owner Vehicle Request (P2P)** — mô hình dữ liệu, quy tắc BE, bảng API, bảng FE, sequence owner/admin.
- **2026-04-20:** Thêm mục “Security learning flow” chi tiết (login/validate/refresh/logout/frontend retry).
- **2026-04-20:** Thêm sequence cực ngắn cho luồng validate access token.
- **2026-04-20:** Khởi tạo `architecture.md` — sơ đồ context, tầng backend, ER rút gọn, security, FE layers, sequence đặt xe.
