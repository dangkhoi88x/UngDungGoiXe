# UngDungGoiXe — Kế hoạch tiếp theo (`plan2.md`)

Tài liệu này bổ sung [`plan.md`](./plan.md) (bối cảnh dự án) và [`architecture.md`](./architecture.md) (kiến trúc & luồng kỹ thuật). Mục tiêu: **biết làm gì tiếp theo** theo mức ưu tiên, dễ giao cho agent hoặc tự triển khai.

**Cách dùng:** tick từng mục khi xong; thêm dòng *Blocked by …* nếu phụ thuộc môi trường (MySQL, Redis, Cloudinary, MoMo, …).

---

## Đăng nhập Google (OAuth 2.0) — bạn đang ở đâu & làm tiếp gì

Bạn đã **tạo OAuth Client** trên Google Auth Platform và có **Client ID** (và thường có **Client Secret** nếu loại *Web application*). Repo hiện tại dùng **JWT tự phát** + refresh cookie (`plan.md` / `architecture.md`) — **chưa** có luồng Google trong code. Dưới đây là lộ trình gọn, phù hợp stack này.

### Bước 1 — Hoàn tất cấu hình Google Cloud Console

| Việc | Ghi chú |
|------|---------|
| **OAuth consent screen** | App name, support email, domain (dev có thể *Testing* + thêm email tester). |
| **Scopes** | Tối thiểu: `openid`, `email`, `profile` (đủ để lấy `sub`, email, tên hiển thị). |
| **Authorized JavaScript origins** | Dev: `http://localhost:5173` (Vite). Prod: `https://your-domain.com`. |
| **Authorized redirect URIs** | Chỉ cần nếu bạn chọn luồng **redirect** (mục B dưới). Ví dụ dev: `http://localhost:8080/login/oauth2/code/google` (Spring default) **hoặc** URL callback bạn tự định nghĩa. |
| **Client Secret** | Với **SPA thuần + Google Identity Services (GIS)** thường dùng **chỉ Client ID** + `id_token` (không cần secret trên FE). Secret chỉ dùng trên **backend** nếu server đổi code/token. **Không** commit secret lên git — dùng env / `.env` local. |

Lưu ý: **Google Maps API key** (đã có trong repo cho `/mapstation`) **khác** OAuth Client — không trộn.

---

### Bước 2 — Chọn kiến trúc (nên chọn một)

#### Phương án **A — SPA gửi `id_token` lên backend** (thường ít đụng `SecurityFilterChain` nhất)

Phù hợp khi bạn muốn giữ **stateless JWT** như hiện tại.

1. **Frontend** (`AuthPage` hoặc component login): dùng [Google Identity Services](https://developers.google.com/identity/gsi/web) (nút “Sign in with Google”) → nhận **credential** (JWT `id_token`).
2. **Backend**: endpoint mới ví dụ `POST /auth/google` với body `{ "idToken": "..." }`.
   - Verify `id_token` bằng thư viện chính thức (ví dụ Google API Client Java, hoặc Nimbus + JWKS Google): **issuer**, **audience** = `GOOGLE_CLIENT_ID`, **exp**, **email_verified**.
   - Tìm `User` theo email; nếu chưa có thì **tạo user** (random password không dùng, hoặc flag `oauthOnly`), gán role mặc định (ví dụ `USER`).
   - Trả **cùng format** như `POST /auth/login` hiện có: `accessToken` + cookie `refresh_token` (tái dùng `JwtService` + `TokenService`).
3. **Security**: `permitAll` cho `POST /auth/google` trong `SecurityConfiguration`.

**Env gợi ý:** `GOOGLE_CLIENT_ID` (bắt buộc verify token). Secret **không** cần nếu chỉ verify `id_token`.

---

#### Phương án **B — Spring Security OAuth2 Login (Authorization Code)**

Luồng: browser → `GET /oauth2/authorization/google` → Google → callback Spring → `OAuth2User` → bạn tự map sang `User` và phát JWT rồi redirect về SPA kèm token (fragment hoặc cookie).

- Cần bật **OAuth2 Client** + cấu hình `spring.security.oauth2.client.registration.google` (client-id, client-secret, scope).
- Cần **session** hoặc cơ chế lưu state OAuth (Spring mặc định dùng session cookie cho OAuth2 login) — **xung đột** với “stateless JWT only” nếu không tách rõ: thường dùng session **chỉ** cho chuỗi OAuth rồi xóa, hoặc chuyển sang phương án A.

Chỉ nên chọn B nếu bạn quen Spring OAuth2 Login và chấp nhận chỉnh `SecurityConfiguration` nhiều hơn.

---

### Bước 3 — Việc làm cụ thể theo thứ tự (phương án A khuyến nghị)

1. Thêm biến môi trường / `application.yaml`: `GOOGLE_CLIENT_ID=...`.
2. Backend: class `GoogleIdTokenVerifier` (hoặc tương đương) + `AuthGoogleRequest` DTO + xử lý trong `AuthenticationService` (hoặc service mới) → tái dùng tạo refresh/access.
3. `AuthenticationController`: `POST /auth/google`.
4. `SecurityConfiguration`: `requestMatchers(HttpMethod.POST, "/auth/google").permitAll()`.
5. Frontend: nút Google → lấy credential → `fetch(\`${API_BASE}/auth/google\`, { method: 'POST', body: JSON.stringify({ idToken }) })` → lưu `accessToken` / `userDisplayName` giống login thường.
6. **Edge cases:** email trùng user đã đăng ký password — quyết định: **link tài khoản** (cùng email) hay từ chối; tên hiển thị lấy từ `name` hoặc `given_name`.

---

### Bước 4 — Kiểm thử

- Đăng nhập Google lần đầu → user mới trong DB.  
- Đăng nhập lần 2 → cùng user, token mới.  
- Gọi `GET /users/my-info` với Bearer → 200.  
- Logout / refresh vẫn hoạt động như luồng hiện tại.

---

### Tài liệu tham khảo nhanh

- [Google Identity Services — Web](https://developers.google.com/identity/gsi/web/guides/overview)  
- [Verify Google ID token (backend)](https://developers.google.com/identity/sign-in/web/backend-auth)  

---

## Ưu tiên cao — ổn định & hoàn thiện đã có

| # | Việc | Ghi chú ngắn |
|---|------|----------------|
| P1 | **Xác minh build full stack** | Backend: `./mvnw clean compile` / `spring-boot:run` trên máy có JDK 21. Frontend: `cd frontend && npm ci && npm run build` — đã từng gặp lỗi TypeScript (`_tsc.js`) → cài lại `typescript` hoặc `npm ci` sạch. |
| P2 | **Đồng bộ env dev/prod** | `JWT_SECRET`, `JWT_AUDIENCE`, Cloudinary (`CLOUDINARY_URL` hoặc cặp key trong `application.yaml`), Redis/MySQL. Document trong README nhỏ hoặc comment trong `.env.example` (không commit secret). |
| P3 | **FE Sonar / độ phức tạp admin xe** | Đã có hướng tách `adminVehiclesShared.ts` — nếu CI/Sonar vẫn báo: hoàn thiện tách helper/component trong `AdminVehiclesSection.tsx`. |
| P4 | **Smoke test luồng feedback** | COMPLETED booking → modal `/account/orders` → POST feedback → kiểm tra `Vehicle.rating`, `/rent/:id` hiển thị section đánh giá, admin tab «Đánh giá booking». |

---

## Ưu tiên trung — trải nghiệm người dùng & báo cáo

| # | Việc | Ghi chú ngắn |
|---|------|----------------|
| M1 | **Danh sách xe `/rent`** | Có thể thêm sort theo rating / lượt thuê; filter theo khoảng giá server-side nếu dataset lớn (hiện có filter FE). |
| M2 | **Lịch sử đơn `/account/orders`** | Đổi nhãn nút «Đánh giá xe» → «Đã đánh giá» khi đã có feedback (prefetch `GET .../feedback/me` cho đơn COMPLETED — trade-off số request). |
| M3 | **Chi tiết xe** | Rich snippet sao (visual stars), giới hạn độ dài comment public, lazy-load ảnh feedback. |
| M4 | **Owner** | Trên trang xe đã duyệt hoặc lịch sử booking: xem rating trung bình / link tới review (chỉ đọc, không sửa feedback người thuê trừ khi có nghiệp vụ mới). |
| M5 | **Admin feedback** | Lọc theo xe, khoảng ngày, rating; export CSV (tuỳ chọn). |

---

## Ưu tiên thấp — nghiệp vụ mở rộng (nếu cần cho đồ án / sản phẩm)

| # | Việc | Ghi chú ngắn |
|---|------|----------------|
| L1 | **Phản hồi của chủ xe / admin** | Entity `Feedback` đã có field `response`, `respondedBy` — có thể bật API + UI «trả lời đánh giá» (email/push sau). |
| L2 | **Đánh giá trạm (`stationRating`)** | Field có trong entity nhưng luồng submit hiện tập trung xe — mở rộng form + thống kê trạm. |
| L3 | **Giới hạn chỉnh sửa feedback** | Cho phép sửa trong X giờ — cần rule + invalidate cache rating. |
| L4 | **Blog / landing** | Hoàn thiện nội dung SEO, liên kết CTA thuê xe. |
| L5 | **Triển khai** | Docker Compose (MySQL + Redis + app); hoặc pipeline CI (build + test); HTTPS + cookie SameSite production. |

---

## Hạng mục kỹ thuật chung

- **Test:** unit cho `BookingFeedbackService` (rating, URL ảnh); integration test controller với `@SpringBootTest` + Testcontainers (tuỳ thời gian).
- **Quan sát:** logging có cấu trúc cho upload Cloudinary / MoMo IPN; metric đơn giản (Actuator + health).
- **Bảo mật:** rà soát `SecurityConfiguration` khi thêm endpoint public; rate limit upload ảnh (gateway hoặc filter).
- **i18n:** mọi message user-facing mới → thêm đủ `messages_vi/en/fr.properties`.

---

## Gợi ý thứ tự làm trong 1–2 tuần

1. **P1 → P4** (môi trường chạy được + smoke test feedback).  
2. **M1–M3** (polish thuê xe & chi tiết).  
3. **M4–M5** nếu demo owner/admin cần impress.  
4. **L*** khi có yêu cầu nghiệp vụ rõ.

---

## Changelog `plan2.md`

- **2026-05-02:** Thêm mục **Đăng nhập Google (OAuth 2.0)** — bước Console, phương án A (id_token → backend) vs B (Spring OAuth2 Login), checklist tích hợp.
- **2026-05-02:** Khởi tạo — roadmap ưu tiên cao/trung/thấp, tham chiếu feedback/Cloudinary và việc kỹ thuật chung.
