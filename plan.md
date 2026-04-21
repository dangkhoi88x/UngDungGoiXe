# UngDungGoiXe — Project context (for Cursor / agents)

**Read this file at the start of a new session** when working on this repository. It summarizes stack, layout, APIs, and product rules so you do not need the user to re-explain the project.

**Related:** [`architecture.md`](./architecture.md) — diagrams and technical architecture (layers, security, domain, sequences).

---

## What this project is

- **Vietnamese academic / demo app** (“Ứng dụng gọi xe” / vehicle rental thesis-style codebase).
- **Backend:** Spring Boot **4.0.x**, Java **21**, REST API, JWT resource server, JPA/Hibernate, **MySQL**, **Redis** (tokens / infra as configured).
- **Frontend:** **React 19** + **TypeScript** + **Vite 5**, **React Router 7**. Dev server proxies **`/api` → `http://localhost:8080`** (path rewrite strips `/api` prefix on the backend).

---

## Repository layout

| Path | Role |
|------|------|
| `pom.xml` | Maven root; Spring Boot parent **4.0.5** |
| `src/main/java/com/example/ungdunggoixe/` | Java application (`UngDungGoiXeApplication`) |
| `src/main/resources/application.yaml` | DB, Redis, JWT placeholders, multipart, `app.upload-dir` |
| `src/main/resources/schema-mysql.sql` | SQL init (with `continue-on-error`); complements Hibernate `ddl-auto: update` |
| `src/main/resources/db/seed.sql` | Seed data (if used) |
| `frontend/` | Vite SPA (`npm run dev` → typically **http://localhost:5173**) |
| `frontend/src/api/*.ts` | Typed API clients (`authFetch`, unwrap `ApiResponse`) |
| `frontend/src/pages/*.tsx` | Route-level UI |
| `frontend/src/components/` | Shared UI (e.g. license gate modal) |
| `.claude/skills/` | Optional agent skills (frontend-design, etc.) |

---

## Backend — main technologies

- **Spring Web MVC**, **Spring Data JPA**, **Spring Security** with **OAuth2 Resource Server (JWT)**.
- **DaoAuthenticationProvider** + **BCrypt** for login; JWT in `Authorization: Bearer` for protected routes.
- **Refresh token** returned as **httpOnly cookie** `refresh_token` on login/refresh (`AuthenticationController`).
- **MapStruct** for DTO ↔ entity mapping where mappers exist.
- **Lombok** on entities/DTOs; **`ApiResponse<T>`** envelope: `status`, `data`, `message`, `timestamp`, optional `code` (integer error code).

### Important backend files

- **`SecurityConfiguration`:** `csrf` disabled; stateless session; public: `/auth/**`, `/users` (register), `/stations/**`, `/vehicles/**`, `/bookings/vehicle-availability`, `/files/**`; most other routes **authenticated** via JWT. Note: `/users/**` permitAll comes after specific authenticated `/users/my-*` matchers.
- **`GlobalExceptionHandler`:** Uses **`new ApiResponse<>()` + setters** for error bodies (not `builder().code(int)`), to avoid **`NoSuchMethodError`** on Lombok builder signatures.
- **`ErrorCode`:** Business + HTTP mapping for `AppException` and handlers.
- **Controllers (REST):** `AuthenticationController` (`/auth`), `UserController` (`/users`), `StationController` (`/stations`), `VehicleController` (`/vehicles`), `BookingController` (`/bookings`), `PaymentController` (`/payments`).

### Domain entities (JPA)

- **`User`**, **`Role`**, **`UserRole`** — roles in JWT claim **`roles`** (no `ROLE_` prefix in converter config; frontend normalizes many variants).
- **`Station`**, **`Vehicle`** — rental fleet tied to stations; vehicle `status` includes **AVAILABLE**, maintenance, etc.
- **`Booking`** — renter, vehicle, station, time range, amounts, **BookingStatus** lifecycle (PENDING → CONFIRMED → ONGOING → COMPLETED / CANCELLED), **PaymentStatus**, deposit rules in **`BookingService`** (e.g. min deposit % before confirm).
- **`Payment`** — payments tied to bookings (e.g. CASH at station).
- **`RefreshToken`**, **`BlacklistedToken`** — session hygiene.
- **`Feedback`**, **`Blog`** — present in codebase; scope varies by feature.

### Booking API (high level)

- **Create:** `POST /bookings` with body like **`CreateBookingRequest`**: `renterId` (alias `userId`), `vehicleId`, `stationId`, `startTime`, `expectedEndTime`, optional `pickupNote`.
- **Availability:** `GET /bookings/vehicle-availability?vehicleId=&start=&end=` (public).
- **Pricing note:** `BookingService#calculateBasePrice` uses **`max(1, full hours between start and end) × hourlyRate`** (frontend `computeBookingEstimate` in `frontend/src/api/bookings.ts` mirrors this).

### User / GPLX

- **`LicenseVerificationStatus`:** `NOT_SUBMITTED`, `PENDING`, `APPROVED`, `REJECTED`.
- User profile / documents endpoints under **`/users`** (my-info, my-documents, my-profile) — see `UserController` and `UserService`.

### Config / secrets

- **`application.yaml`:** MySQL URL/user/pass, Redis password, **`jwt.secret-key`** / **`jwt.audience`** from env **`JWT_SECRET`**, **`JWT_AUDIENCE`**.
- **`app.upload-dir`:** relative/absolute path for license images.

---

## Frontend — routes (`App.tsx`)

| Route | Page |
|-------|------|
| `/` | `StudioXLandingPage` (marketing-style landing) |
| `/auth` | `AuthPage` (login/register) |
| `/logout` | Clears tokens + display name, calls logout API, redirects `/auth` |
| `/account` | `UserAccountPage` |
| `/account/update` | `UserAccountUpdatePage` |
| `/rent` | `CarRentalPage` (vehicle list) |
| `/rent/:id` | `VehicleDetailPage` |
| `/booking/:vehicleId` | `VehicleBookingPage` (checkout / create booking) |
| `/admin/*` | `AdminDashboardPage` — **JWT must include admin-type role** (`RequireAdmin` in `App.tsx`) |

### API base URL

- Default **`import.meta.env.VITE_API_BASE ?? '/api'`** in API modules — aligns with Vite proxy.

### Auth client behavior

- **`authFetch`:** attaches `accessToken` from `localStorage`; on **401** tries **`/auth/refresh-token`** (cookie), updates `accessToken`; on failure clears session and may redirect to `/auth`.
- **Local storage keys:** `accessToken`, `refreshToken` (if used by client), `userDisplayName`.

### Rental UX rules (implemented)

- **Đặt xe** from vehicle detail: logged-in users trigger **`fetchMyInfo()`**; **GPLX gate:** allow booking only if `licenseVerificationStatus` is **`APPROVED` or `PENDING`**. Otherwise show **`LicenseRequiredModal`** with link to **`/account`**.
- **Direct `/booking/:id`:** same gate after profile load.
- Vehicle must be **AVAILABLE** for booking CTA / flow where enforced.

### Key frontend files

- **`frontend/src/api/auth.ts`**, **`authFetch.ts`**, **`apiResponse.ts`** — login, refresh, unwrap envelope, parse errors.
- **`frontend/src/api/vehicles.ts`**, **`stations.ts`**, **`bookings.ts`**, **`users.ts`** — REST wrappers; **`users.ts`** exports **`isLicenseApprovedForRent`**, **`licenseVerificationLabel`**, etc.

---

## How to run (typical)

1. **MySQL** database `UngDungGoiXe` (see `application.yaml`), **Redis** if required by token logic.
2. Set **`JWT_SECRET`**, **`JWT_AUDIENCE`** (and adjust yaml if needed).
3. **Backend:** `./mvnw spring-boot:run` (or IDE) — default **http://localhost:8080**.
4. **Frontend:** `cd frontend && npm install && npm run dev` — **http://localhost:5173**, API via **`/api`**.

---

## Conventions for agents

- Prefer **small, task-scoped diffs**; match existing naming (Vietnamese UI strings + English code is normal).
- **Do not** reintroduce **`ApiResponse.builder().code(primitive)`** in exception handlers without verifying Lombok-generated builder signatures; use **setters** or a verified factory pattern.
- When changing booking money rules, keep **backend `BookingService`** and **`computeBookingEstimate`** in sync.
- GPLX rental gate: **`APPROVED` ∪ `PENDING`** unless product owner changes requirement.

---

## Updating this document

When you add major features (new modules, deployment, env vars), append a short **Changelog** section below with date + bullet points.

### Changelog

- **2026-04-20:** Link to `architecture.md` (diagrams, layers, sequences).
- **2026-04-20:** Initial `plan.md` — stack, routes, security, booking/payment/GPTX gate, run instructions.
