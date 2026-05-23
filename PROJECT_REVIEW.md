# Project Review - ThueXeOto

Ngay review: 2026-05-23  
Website deploy: https://www.thuexeoto.online  
Ghi chu nguon code: Theo yeu cau cua chu du an, tai lieu nay ghi nhan codebase duoc viet/ho tro boi Claude va duoc review lai de chuan bi hoan thien san pham.

## 1. Tong Quan

ThueXeOto la nen tang marketplace B2B/B2C cho thue xe o to tu lai. He thong phu hop voi bai toan ket noi nguoi thue xe voi chu xe/don vi cho thue, gom cac luong chinh:

- Nguoi dung dang ky, dang nhap, xac minh giay phep, tim xe, dat xe, thanh toan va danh gia sau chuyen di.
- Chu xe gui yeu cau dang xe, upload anh/tai lieu, theo doi trang thai duyet va xem lich su booking cua xe.
- Admin quan ly user, xe, tram, booking, thanh toan, feedback, blog va dashboard.

Stack hien tai:

- Backend: Spring Boot 4, Java 21, Spring Security, JWT, OAuth2 Google, JPA, MySQL, Redis, MapStruct, Lombok, Spring Mail, AWS S3, MoMo.
- Frontend: React 19, TypeScript, Vite, React Router, Leaflet/OpenStreetMap, TipTap.
- Deploy: frontend tren AWS Amplify, backend Docker image, MySQL/Redis/S3.

## 2. Diem Tot

- Kien truc da tach controller, DTO, mapper, repository, service interface va service implement ro rang.
- Da chuyen media chinh sang AWS S3, phu hop production hon so voi luu file local.
- Booking co xu ly chong trung lich bang overlapping query va da co optimistic locking bang `@Version`.
- Admin dashboard va cac man hinh quan tri co pham vi tinh nang kha day du.
- Frontend da co TypeScript, API layer rieng, auth fetch wrapper va cac page tach theo nghiep vu.
- Da co Dockerfile, docker-compose, README va luong build frontend/backend co the kiem tra duoc.
- Da bo Google Maps de dung OpenStreetMap/Leaflet, giam phu thuoc API key va chi phi.

## 3. Findings Uu Tien

### P0 - Production MoMo config van tro ve localhost - da fix

File: `src/main/resources/application-prod.yaml`

Trang thai hien tai: da doi `momo.return-url` va `momo.ipn-url` sang bien moi truong:

- `MOMO_RETURN_URL`, mac dinh `https://www.thuexeoto.online/payment/momo-return`
- `MOMO_IPN_URL`, mac dinh `https://api.thuexeoto.online/momo/ipn-handler`

Rui ro neu deploy thieu/sai env:

- Khi thanh toan tren production, MoMo co the redirect/IPN ve localhost thay vi domain that.
- Payment co the thanh cong tren MoMo nhung backend khong nhan IPN, dan den booking/payment khong cap nhat dung.

Can lam tiep tren server:

- Them `MOMO_RETURN_URL` va `MOMO_IPN_URL` vao file `.env` EC2.
- Rebuild/push Docker image backend moi, pull va restart container tren EC2.

### P0 - Secret MoMo dang hardcode trong file prod - da fix

File: `src/main/resources/application-prod.yaml`

Trang thai hien tai: da doi sang:

- `access-key: ${MOMO_ACCESS_KEY}`
- `secret-key: ${MOMO_SECRET_KEY}`

Rui ro:

- Secret bi day len GitHub/Docker image.
- Kho xoay vong key va quan ly moi truong.

Can lam tiep:

- Them `MOMO_ACCESS_KEY` va `MOMO_SECRET_KEY` vao `.env` production.
- Rotate lai key neu repository da public.

### P1 - Mot so fallback/localhost con lot vao code production - da fix

Files:

- `src/main/resources/application-prod.yaml`
- `src/main/java/com/example/ungdunggoixe/configuration/AppProperties.java`
- `src/main/java/com/example/ungdunggoixe/service/implement/UserServiceImplement.java`
- `src/main/java/com/example/ungdunggoixe/service/implement/OwnerVehicleRequestServiceImplement.java`

Trang thai hien tai:

- `application-prod.yaml` da doi thanh `web-base-url: ${APP_WEB_BASE_URL}` nen production bat buoc co env.
- Da tao `AppProperties` voi `@ConfigurationProperties(prefix = "app")` va `@NotBlank` de validate `webBaseUrl`.
- `UserServiceImplement` va `OwnerVehicleRequestServiceImplement` khong tu fallback ve localhost nua, ma lay domain tu `AppProperties`.

Can lam tiep tren server:

- Bao dam `.env` EC2 co `APP_WEB_BASE_URL=https://www.thuexeoto.online`.
- Rebuild/push Docker image moi va restart backend.

### P1 - Comment/UI text con lech voi trang thai S3 hien tai - da fix

Da cap nhat cac vi du:

- `frontend/src/api/vehicles.ts`: comment upload anh xe chuyen sang AWS S3.
- `frontend/src/components/VehiclePhotoUpload.tsx`: button admin khong con hien Cloudinary.
- `frontend/src/pages/AdminBlogPostsSection.tsx`: toast/button upload cover chuyen sang AWS S3.
- `src/main/java/com/example/ungdunggoixe/entity/Station.java`: comment ban do chuyen sang OpenStreetMap/Leaflet.
- Mot so text/comment `demo` tren UI public da duoc don bot.

Rui ro neu tai xuat hien:

- Nguoi review, nguoi cham do an hoac dev moi de hieu nham he thong dang dung Cloudinary/Google Maps.

Can lam tiep:

- Chay `rg "Cloudinary|Google Maps|localhost|demo"` truoc khi release.

### P1 - Test coverage con mong

Hien project chi co it test, trong khi nghiep vu nhay cam gom booking, payment, refund/topup, auth va upload.

Rui ro:

- Sua tinh tien theo ngay/gio, MoMo callback hoac status booking de gay regression.
- Khi refactor service/interface hoac mapper, loi chi lo ra luc deploy.

Suggest:

- Them unit test cho `BookingServiceImplement`:
  - tinh tien thue theo ngay bang `dailyRate`
  - phi tra tre theo gio bang `hourlyRate`
  - overlapping booking
  - status transition
- Them test cho payment:
  - MoMo signature
  - confirm PAID
  - topup/refund adjustment

### P2 - Frontend con mot so text tieng Anh/demo chua dong bo - da don bot

Da cap nhat cac text public noi bat:

- Landing CTA: `Start a Chat`, `Explore Now`.
- Header/search: `Search destination...`, `My Account`, `Log In`, `Sign Up`, `Log Out`.
- Trang rent: hero title, pickup/return label, availability hint.
- Auth page: `Sign in`, `Sign up`, `New here?`, `Create one`.
- Account/detail page: cac text brand cu `VEX Member`, `Hi`, `Log Out`.

Can lam tiep:

- Tao file constants/i18n nho cho label dung lai thay vi hardcode rai rac.

### P2 - Mono-repo van on, nhung can quy uoc deploy ro hon

Hien frontend va backend cung mot repo. Dieu nay van chap nhan duoc, nhung deploy da tach:

- Frontend: AWS Amplify.
- Backend: Docker image.

Suggest:

- Neu tiep tuc mono-repo: viet ro folder, workflow, branch deploy frontend/backend.
- Neu tach repo: backend va frontend co release pipeline rieng, README rieng, env rieng.

## 4. Suggest Ky Thuat

### Backend

1. Chuan hoa config
   - Tao `@ConfigurationProperties` cho `app`, `momo`, `aws`, `jwt`.
   - Prod config khong nen co localhost mac dinh cho URL public.
   - Secret chi lay tu env/secret manager.

2. Tang chat luong booking/payment
   - Dong bo naming: base price la gia thue du kien theo ngay, extra fee la phi phat sinh theo gio.
   - Luu ro `rentalDays` neu can hien thi/bao cao sau nay.
   - Audit log cho cac hanh dong admin: confirm pickup, return, refund, topup.

3. Clean old code/text
   - Xoa comment Cloudinary/Google Maps cu.
   - Xoa cac file khong con dung.
   - Doi `UngDungGoiXe` artifact/name neu muon branding chuyen hẳn sang ThueXeOto.

4. Bao mat
   - Rotate secret neu tung commit len GitHub.
   - Kiem tra CORS prod chi allow domain that.
   - Kiem tra Swagger UI co nen mo public tren prod hay khong.

5. Observability
   - Them structured logs cho payment callback, mail send, S3 upload/delete.
   - Them health check cho DB/Redis/S3.

### Frontend

1. Viet hoa UI public
   - Header, CTA, placeholder, footer, empty states.
   - Giam text "demo" tren production.

2. Tach component dung chung
   - Header/nav dang co o `TopNav` va mot so page rieng.
   - Nen gom thanh mot `PublicLayout`.

3. Cai thien UX booking
   - Hien cach tinh tien: so ngay x gia/ngay.
   - Neu chon 1.5 ngay thi noi ro lam tron thanh 2 ngay.
   - Hien phi tre gio chi o flow return/topup/refund, khong gay nham luc dat xe.

4. Performance
   - Build dang canh bao chunk > 500KB.
   - Nen lazy load admin blog editor/TipTap va admin dashboard sections.

## 5. Plan Tiep Theo

### Phase 1 - Release Hygiene (1-2 ngay)

- [ ] Doi MoMo prod URL sang env, khong dung localhost.
- [ ] Dua MoMo access key/secret key ra env va rotate key neu can.
- [ ] Sweep text/comment cu: `Cloudinary`, `Google Maps`, `demo`, `localhost`.
- [ ] Chuan hoa README: local/dev/prod env tach ro.
- [ ] Build lai frontend va backend, tao Docker image tag moi.

### Phase 2 - Test Critical Flows (2-4 ngay)

- [ ] Unit test tinh tien booking theo ngay.
- [ ] Unit test phi tra tre theo gio.
- [ ] Test overlapping booking va optimistic locking.
- [ ] Test MoMo return/IPN signature.
- [ ] Test mail welcome/payment/owner request review voi mock mail sender.

### Phase 3 - UX Polish (2-3 ngay)

- [ ] Viet hoa toan bo UI public.
- [ ] Gop header/nav thanh component dung chung.
- [ ] Lam ro man hinh booking: so ngay tinh phi, tong tien, coc, payment.
- [ ] Kiem tra mobile layout cho `/`, `/rent`, `/rent/:id`, `/booking/:id`.

### Phase 4 - Production Hardening (3-5 ngay)

- [ ] CORS prod chi allow `https://www.thuexeoto.online`.
- [ ] Health check backend cho DB/Redis.
- [ ] Backup MySQL va quy trinh restore.
- [ ] S3 lifecycle policy cho file tam/anh feedback neu can.
- [ ] Log payment callback va admin action day du.

### Phase 5 - Feature Mo Rong

- [ ] Owner revenue dashboard.
- [ ] Notification/email cho booking created/confirmed/cancelled.
- [ ] Search xe theo ban do/tram gan nhat.
- [ ] Coupon/discount thuc su thay vi input disabled.
- [ ] Review moderation cho admin.

## 6. Checklist Truoc Khi Demo/Cham Do An

- [ ] Domain `https://www.thuexeoto.online` vao duoc trang chu.
- [ ] Dang ky user moi nhan mail welcome dung domain.
- [ ] Dang nhap Google hoat dong tren production domain.
- [ ] Upload anh xe/giay to len S3 thanh cong.
- [ ] Dat xe tinh tien theo ngay.
- [ ] Thanh toan MoMo redirect ve dung website.
- [ ] Admin thay booking/payment cap nhat dung.
- [ ] Owner request duyet/từ chối gui mail dung link.
- [ ] Khong con text "demo", "Cloudinary", "Google Maps" tren UI production.

## 7. Ket Luan

Codebase da co nen tang kha tot cho mot san pham thue xe o to tu lai: co auth, booking, payment, admin, owner flow, S3 media va frontend day du. Diem can uu tien khong phai viet them tinh nang moi ngay, ma la hardening production config, bo hardcode secret/localhost, bo text cu, va them test cho cac luong nhay cam. Sau khi lam xong cac phase dau, project se thuyet phuc hon khi dua vao CV, demo do an hoac deploy that.
