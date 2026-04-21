-- =============================================================================
-- UngDungGoiXe — dữ liệu mẫu (MySQL 8+)
-- =============================================================================
-- Điều kiện: schema đã tồn tại (ví dụ chạy app với spring.jpa.hibernate.ddl-auto=update).
-- Nếu entity User có thêm cột (phone, created_at, …) mà trang /account lỗi / trống: chạy
--   migrate_users_profile_columns.sql
-- trước khi dùng API /users/my-info.
-- Chạy: mysql -u root -p UngDungGoiXe < src/main/resources/db/seed.sql
--        hoặc dán vào MySQL Workbench / DataGrip.
--
-- Tài khoản demo (cùng mật khẩu):
--   admin@demo.local  — role ADMIN
--   user@demo.local   — role USER
-- Mật khẩu: Demo@123
-- (Hash BCrypt sinh bằng org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder)
-- =============================================================================

SET NAMES utf8mb4;
USE `UngDungGoiXe`;

SET FOREIGN_KEY_CHECKS = 0;

-- Xóa dữ liệu mẫu cũ nếu chạy lại (bỏ comment nếu cần reset dev)
-- TRUNCATE TABLE `vehicle_photos`;
-- TRUNCATE TABLE `vehicle_policies`;
-- TRUNCATE TABLE bookings;
-- TRUNCATE TABLE vehicles;
-- TRUNCATE TABLE stations;
-- TRUNCATE TABLE `users-roles`;
-- TRUNCATE TABLE users;
-- TRUNCATE TABLE roles;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- roles (name khớp RoleName enum: USER, ADMIN, SUPER_ADMIN)
-- -----------------------------------------------------------------------------
INSERT INTO roles (id, name, description) VALUES
  (1, 'USER', N'Người dùng thường'),
  (2, 'ADMIN', N'Quản trị'),
  (3, 'SUPER_ADMIN', N'Siêu quản trị')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);

-- -----------------------------------------------------------------------------
-- users — password = Demo@123
-- -----------------------------------------------------------------------------
INSERT INTO users (id, email, password, first_name, last_name) VALUES
  (1, 'admin@demo.local', '$2a$10$pOVQma2mI1BA1LmCiNd8UeCfMbLJyPparwoUOb2ZqTAj.eOmMetE2', 'Admin', 'Demo'),
  (2, 'user@demo.local',  '$2a$10$pOVQma2mI1BA1LmCiNd8UeCfMbLJyPparwoUOb2ZqTAj.eOmMetE2', N'Khách', 'Demo')
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name = VALUES(last_name);

-- -----------------------------------------------------------------------------
-- users-roles (tên bảng có dấu gạch — bắt buộc backtick)
-- -----------------------------------------------------------------------------
INSERT INTO `users-roles` (id, user_id, role_id) VALUES
  (1, 1, 2),
  (2, 2, 1)
ON DUPLICATE KEY UPDATE role_id = VALUES(role_id);

-- -----------------------------------------------------------------------------
-- stations (StationStatus: ACTIVE | INACTIVE | MAINTENANCE)
-- -----------------------------------------------------------------------------
INSERT INTO stations (id, name, address, rating, hotline, status, photo, start_time, end_time, latitude, longitude, created_at, updated_at) VALUES
  (1, N'Trạm Quận 1',     N'123 Nguyễn Huệ, P. Bến Nghé, Q.1, TP.HCM',        4.6, '02838123456', 'ACTIVE', NULL, '07:00:00', '22:00:00', 10.7769, 106.7009, NOW(6), NOW(6)),
  (2, N'Trạm Thủ Đức',   N'456 Võ Văn Ngân, TP. Thủ Đức, TP.HCM',            4.4, '02838234567', 'ACTIVE', NULL, '06:30:00', '21:30:00', 10.8501, 106.7717, NOW(6), NOW(6)),
  (3, N'Trạm Tân Bình',  N'789 Hoàng Văn Thụ, P.4, Q.Tân Bình, TP.HCM',      4.5, '02838345678', 'ACTIVE', NULL, '08:00:00', '23:00:00', 10.8016, 106.6669, NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE
  address = VALUES(address),
  rating = VALUES(rating),
  hotline = VALUES(hotline),
  status = VALUES(status),
  latitude = VALUES(latitude),
  longitude = VALUES(longitude);

-- -----------------------------------------------------------------------------
-- vehicles (FuelType: GASOLINE | ELECTRICITY; VehicleStatus: AVAILABLE, …)
-- -----------------------------------------------------------------------------
INSERT INTO vehicles (
  id, station_id, license_plate, name, brand, fuel_type, rating, capacity, rent_count,
  status, hourly_rate, daily_rate, deposit_amount, created_at, updated_at
) VALUES
  (1, 1, '51A-12345', N'Toyota Vios 2023',     'Toyota',  'GASOLINE',    4.7, 5, 18, 'AVAILABLE', 120000.00,  900000.00,  3000000.00, NOW(6), NOW(6)),
  (2, 1, '51B-67890', N'Honda City RS',       'Honda',   'GASOLINE',    4.6, 5, 11, 'AVAILABLE', 130000.00,  950000.00,  3200000.00, NOW(6), NOW(6)),
  (3, 2, '51C-11111', N'VinFast VF e34',      'VinFast', 'ELECTRICITY', 4.8, 5,  6, 'AVAILABLE', 150000.00, 1100000.00, 3500000.00, NOW(6), NOW(6)),
  (4, 3, '51D-22222', N'Hyundai Accent',      'Hyundai', 'GASOLINE',    4.5, 5, 22, 'RENTED',    115000.00,  850000.00,  2800000.00, NOW(6), NOW(6)),
  (5, 2, '51E-33333', N'Mazda CX-5',          'Mazda',   'GASOLINE',    4.9, 5,  9, 'MAINTENANCE', 220000.00, 1600000.00, 5000000.00, NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  status = VALUES(status),
  hourly_rate = VALUES(hourly_rate),
  daily_rate = VALUES(daily_rate);

DELETE FROM vehicle_photos WHERE vehicle_id IN (1, 2, 3);
INSERT INTO vehicle_photos (vehicle_id, photo_url) VALUES
  (1, 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800'),
  (2, 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800'),
  (3, 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800');

DELETE FROM vehicle_policies WHERE vehicle_id IN (1, 2);
INSERT INTO vehicle_policies (vehicle_id, policy_text) VALUES
  (1, N'Không hút thuốc trong xe.'),
  (1, N'Hoàn tiền cọc theo quy định trạm.'),
  (2, N'Đổ xăng đầy bình khi trả xe.');

-- -----------------------------------------------------------------------------
-- bookings (tùy chọn — minh họa luồng đặt xe)
-- -----------------------------------------------------------------------------
INSERT INTO bookings (
  id, booking_code, renter_id, vehicle_id, station_id,
  start_time, expected_end_time, actual_end_time, status,
  checked_out_by, checked_in_by,
  base_price, partially_paid, extra_fee, total_amount,
  pickup_note, return_note, payment_status, created_at, updated_at
) VALUES
  (
    1, 'BK-DEMO-001', 2, 4, 3,
    '2026-04-10 09:00:00', '2026-04-12 09:00:00', NULL,
    'CONFIRMED', NULL, NULL,
    1700000.00, NULL, NULL, 1700000.00,
    N'Nhận xe tại trạm Tân Bình', NULL, 'PENDING', NOW(6), NOW(6)
  ),
  (
    2, 'BK-DEMO-002', 2, 1, 1,
    '2026-04-15 08:00:00', '2026-04-15 18:00:00', NULL,
    'PENDING', NULL, NULL,
    1200000.00, NULL, NULL, 1200000.00,
    NULL, NULL, 'PENDING', NOW(6), NOW(6)
  )
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  total_amount = VALUES(total_amount);

-- -----------------------------------------------------------------------------
-- Giữ AUTO_INCREMENT an toàn sau khi gán id cố định
-- -----------------------------------------------------------------------------
ALTER TABLE roles AUTO_INCREMENT = 100;
ALTER TABLE users AUTO_INCREMENT = 100;
ALTER TABLE `users-roles` AUTO_INCREMENT = 100;
ALTER TABLE stations AUTO_INCREMENT = 100;
ALTER TABLE vehicles AUTO_INCREMENT = 100;
ALTER TABLE bookings AUTO_INCREMENT = 100;
