Mình đọc lại theo đúng code hiện tại và có đối chiếu với [architecture.md](/Users/dank/Documents/GitHub/UngDungGoiXe/architecture.md) và [plan.md](/Users/dank/Documents/GitHub/UngDungGoiXe/plan.md). Hai file `.md` này khá khớp với code, nhất là 2 phần bạn vừa làm: `owner cho thuê xe` và `MoMo prepay`.

Có 3 cập nhật quan trọng so với bức tranh cũ:
- FE bây giờ đã dùng `react-router-dom` thật trong [frontend/src/App.tsx](/Users/dank/Documents/GitHub/UngDungGoiXe/frontend/src/App.tsx), không còn kiểu tự route bằng `pathname`.
- API FE đang đi theo envelope `ApiResponse<T>` + `unwrapApiData(...)`.
- Luồng sản phẩm bây giờ đã tách rõ thành 2 nhánh mới: `owner request` và `booking + MoMo`.

**Bức tranh tổng thể**
Frontend route chính nằm ở [frontend/src/App.tsx](/Users/dank/Documents/GitHub/UngDungGoiXe/frontend/src/App.tsx):
- người thuê: `/rent`, `/rent/:id`, `/booking/:vehicleId`, `/account`, `/account/orders`
- MoMo return: `/payment/momo-return`
- owner: `/owner/register-vehicle`, `/owner/vehicle-requests`, `/owner/vehicle-requests/:id`, `/owner/vehicle-requests/:id/edit`
- admin: `/admin/*`

Backend đang chia nghiệp vụ khá rõ:
- auth/token: `AuthenticationController`, `AuthenticationService`, `JwtService`, `TokenService`
- booking/payment: `BookingController`, `PaymentController`, `PaymentService`, `MomoController`, `MomoService`
- owner flow: `OwnerVehicleRequestController`, `AdminOwnerVehicleRequestController`, `OwnerVehicleRequestService`
- upload riêng cho owner docs/photos ở [UploadController.java](/Users/dank/Documents/GitHub/UngDungGoiXe/src/main/java/com/example/ungdunggoixe/controller/UploadController.java)

**Luồng owner cho thuê xe**
Đây là một pipeline riêng, chưa đụng trực tiếp vào `Vehicle` thật cho đến lúc admin duyệt.

1. Owner vào trang đăng ký xe ở [OwnerRegisterVehiclePage.tsx](/Users/dank/Documents/GitHub/UngDungGoiXe/frontend/src/pages/OwnerRegisterVehiclePage.tsx).
- FE tải danh sách trạm từ `stations`
- upload ảnh xe và giấy tờ qua `/uploads/owner-vehicle/photo` và `/uploads/owner-vehicle/document`
- sau đó submit JSON chính sang `/owner/vehicle-requests`

2. FE gọi API qua [ownerVehicleRequests.ts](/Users/dank/Documents/GitHub/UngDungGoiXe/frontend/src/api/ownerVehicleRequests.ts).
- mọi request owner/admin đều đi qua `authFetch`
- parse response bằng `unwrapApiData`

3. Backend nhận ở [OwnerVehicleRequestController.java](/Users/dank/Documents/GitHub/UngDungGoiXe/src/main/java/com/example/ungdunggoixe/controller/OwnerVehicleRequestController.java).
- `POST /owner/vehicle-requests`
- `GET /owner/vehicle-requests`
- `GET /owner/vehicle-requests/{id}`
- `PUT /owner/vehicle-requests/{id}`
- `POST /owner/vehicle-requests/{id}/resubmit`
- `POST /owner/vehicle-requests/{id}/cancel`

4. Nghiệp vụ chính nằm ở [OwnerVehicleRequestService.java](/Users/dank/Documents/GitHub/UngDungGoiXe/src/main/java/com/example/ungdunggoixe/service/OwnerVehicleRequestService.java).
- lấy current user từ `SecurityContext`
- validate `stationId`
- chuẩn hóa biển số `trim + uppercase`
- chặn trùng biển số với `Vehicle` thật và với các request đang “blocking”
- bắt buộc ít nhất 3 ảnh
- bắt buộc có `registrationDocUrl` và `insuranceDocUrl`
- khi tạo thì status = `PENDING`
- đồng thời append history ngay từ đầu

5. Owner theo dõi danh sách ở [OwnerMyVehicleRequestsPage.tsx](/Users/dank/Documents/GitHub/UngDungGoiXe/frontend/src/pages/OwnerMyVehicleRequestsPage.tsx).
- có filter/sort
- có `resubmit`
- có `cancel`
- có watcher tự poll trạng thái qua [useOwnerRequestStatusWatcher.ts](/Users/dank/Documents/GitHub/UngDungGoiXe/frontend/src/hooks/useOwnerRequestStatusWatcher.ts)

6. Admin xử lý ở [AdminOwnerVehicleRequestsSection.tsx](/Users/dank/Documents/GitHub/UngDungGoiXe/frontend/src/pages/AdminOwnerVehicleRequestsSection.tsx).
- list request
- filter theo status
- preview docs/ảnh
- approve / reject / need-more-info

7. Backend admin nhận ở [AdminOwnerVehicleRequestController.java](/Users/dank/Documents/GitHub/UngDungGoiXe/src/main/java/com/example/ungdunggoixe/controller/AdminOwnerVehicleRequestController.java).

8. Khi admin `approve`, [OwnerVehicleRequestService.java](/Users/dank/Documents/GitHub/UngDungGoiXe/src/main/java/com/example/ungdunggoixe/service/OwnerVehicleRequestService.java) sẽ:
- validate lại hồ sơ
- tạo một `Vehicle` thật từ dữ liệu request
- gắn `approvedVehicle`
- đổi status sang `APPROVED`
- ghi history
- gửi email review cho owner

Nói ngắn gọn: `OwnerVehicleRequest` là vùng đệm để admin kiểm duyệt, và chỉ sau `APPROVED` mới sinh `Vehicle` thực sự.

**Luồng thuê xe + thanh toán MoMo**
Luồng này hiện đã khá hoàn chỉnh theo kiểu `booking trước, thanh toán prepay sau`.

1. User đặt xe ở [VehicleBookingPage.tsx](/Users/dank/Documents/GitHub/UngDungGoiXe/frontend/src/pages/VehicleBookingPage.tsx).
- FE kiểm tra slot khả dụng
- gọi `createBooking(...)`
- nếu chọn MoMo thì gọi tiếp `createMomoPrepayTotalForBooking(...)`

2. API FE nằm ở [frontend/src/api/bookings.ts](/Users/dank/Documents/GitHub/UngDungGoiXe/frontend/src/api/bookings.ts).
- `POST /bookings`
- `POST /bookings/{id}/payments/momo/prepay-total?momoRequestType=captureWallet|payWithATM`

3. Backend endpoint MoMo prepay nằm ở [BookingController.java](/Users/dank/Documents/GitHub/UngDungGoiXe/src/main/java/com/example/ungdunggoixe/controller/BookingController.java).
- `POST /bookings/{id}/payments/momo/prepay-total`

4. Nghiệp vụ chính nằm ở [PaymentService.java](/Users/dank/Documents/GitHub/UngDungGoiXe/src/main/java/com/example/ungdunggoixe/service/PaymentService.java).
Khi gọi `createMomoPrepayTotal(...)`, service sẽ:
- load booking
- check user có quyền với booking đó
- tính số tiền gửi MoMo = `estimatedRental + depositAmount`
- ép về VND nguyên
- validate min/max theo rule MoMo
- tạo `Payment` với:
  - `paymentMethod = MOMO`
  - `paymentPurpose = PREPAID_TOTAL`
  - `status = PENDING`
- lưu `transactionId = MOMO_PAY_{paymentId}`
- nhét `paymentId`, `bookingId`, `purpose` vào `extraData`
- gọi [MomoService.java](/Users/dank/Documents/GitHub/UngDungGoiXe/src/main/java/com/example/ungdunggoixe/service/MomoService.java) để ký request và lấy `payUrl`

5. FE nhận `payUrl` rồi redirect sang MoMo trong [VehicleBookingPage.tsx](/Users/dank/Documents/GitHub/UngDungGoiXe/frontend/src/pages/VehicleBookingPage.tsx).

6. Sau khi thanh toán, hệ thống có 2 đường cập nhật kết quả:
- server-to-server IPN: [MomoController.java](/Users/dank/Documents/GitHub/UngDungGoiXe/src/main/java/com/example/ungdunggoixe/controller/MomoController.java) `POST /momo/ipn-handler`
- browser return: route FE `/payment/momo-return` ở [MomoReturnPage.tsx](/Users/dank/Documents/GitHub/UngDungGoiXe/frontend/src/pages/MomoReturnPage.tsx), rồi FE gọi [momoConfirm.ts](/Users/dank/Documents/GitHub/UngDungGoiXe/frontend/src/api/momoConfirm.ts) `POST /momo/confirm-return`

7. Cả IPN và confirm-return đều đi vào `paymentService.handleMomoIpnResult(...)`.
Hàm này:
- verify signature trước ở `MomoService`
- map payment bằng `paymentId` trong `extraData`, fallback theo `orderId`
- `resultCode == 0` thì `PAID`, ngược lại `FAILED`
- xử lý idempotent, tránh hạ từ `PAID` xuống `FAILED`
- sau đó luôn gọi `updateBookingPaymentStatus(...)`

8. `updateBookingPaymentStatus(...)` là chốt quan trọng.
- cộng tổng các payment `PAID`
- nếu `REFUND` thì tính âm
- set `booking.partiallyPaid`
- set `booking.paymentStatus`
- nếu booking đang `PENDING` mà payment status đã đủ `PAID` thì auto chuyển booking sang `CONFIRMED`

Tức là: booking không tự confirmed chỉ vì user quay lại trang MoMo; nó chỉ confirmed khi backend đã ghi payment thành công.

**Luồng sau khi trả xe**
Bạn cũng đã nối tiếp phần này trong [PaymentService.java](/Users/dank/Documents/GitHub/UngDungGoiXe/src/main/java/com/example/ungdunggoixe/service/PaymentService.java) và FE lịch sử đơn:
- sau `returnBooking`, hệ thống có thể phát sinh `TOPUP` hoặc `REFUND`
- admin xử lý qua [PaymentController.java](/Users/dank/Documents/GitHub/UngDungGoiXe/src/main/java/com/example/ungdunggoixe/controller/PaymentController.java):
  - `GET /payments/pending-adjustments`
  - `PATCH /payments/{id}/confirm-topup`
  - `PATCH /payments/{id}/confirm-refund`
- user nhìn thấy trạng thái này ở [UserOrderHistoryPage.tsx](/Users/dank/Documents/GitHub/UngDungGoiXe/frontend/src/pages/UserOrderHistoryPage.tsx)

**Scheduler MoMo**
Bạn còn thêm một phần khá hay ở [MoMoPrepaidBookingExpiryScheduler.java](/Users/dank/Documents/GitHub/UngDungGoiXe/src/main/java/com/example/ungdunggoixe/scheduling/MoMoPrepaidBookingExpiryScheduler.java):
- scan các payment `PREPAID_TOTAL` bị treo quá TTL
- mark payment `FAILED`
- nếu booking vẫn `PENDING` và chưa có khoản `PAID` nào thì hủy booking để trả slot xe về hệ thống

Phần này làm cho luồng `đặt xe rồi không thanh toán` có điểm kết thúc rõ ràng.

**Phần auth/token hiện tại vẫn là xương sống cho hai luồng mới**
Hai luồng mới đang dùng auth hiện tại như sau:
- FE giữ `accessToken` trong localStorage và dùng `authFetch`
- `refreshToken` ở cookie `HttpOnly`
- owner/admin/payment APIs chủ yếu dựa vào `authFetch`
- MoMo `confirm-return` thì không cần JWT, nó dựa vào chữ ký MoMo

**Một vài nhận xét nhanh sau khi đọc lại**
- `architecture.md` hiện mô tả khá sát code thật, nhất là phần owner request và MoMo.
- `owner flow` của bạn đã có đủ các thành phần quan trọng: upload, validate, state machine, history, admin review, create vehicle thật.
- `MoMo flow` cũng đã đi qua đủ 2 đường `IPN` và `confirm-return`, có cả idempotent và TTL cleanup.
- Điểm mình vẫn lưu ý là [SecurityConfiguration.java](/Users/dank/Documents/GitHub/UngDungGoiXe/src/main/java/com/example/ungdunggoixe/configuration/SecurityConfiguration.java) còn đang `permitAll()` khá rộng cho `/stations/**`, `/vehicles/**`, `/users/**`; còn bảo vệ thực tế đang dựa nhiều vào `@PreAuthorize` ở controller/method.

Nếu bạn muốn, bước tiếp theo mình có thể làm 1 trong 2 việc:
1. Vẽ lại cho bạn sơ đồ sequence đầy đủ của 2 luồng `owner` và `MoMo`.
2. Review tiếp theo kiểu “chỗ nào trong 2 luồng này còn dễ lỗi khi demo/bảo vệ đồ án”.
