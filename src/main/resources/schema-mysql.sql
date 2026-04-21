-- Đồng bộ cột bảng users với entity User (chạy sau Hibernate nhờ defer-datasource-initialization).
-- Cột đã tồn tại → lỗi duplicate, bỏ qua nhờ spring.sql.init.continue-on-error=true.

ALTER TABLE users ADD COLUMN phone VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN identity_number VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN license_number VARCHAR(255) NULL;
-- Không thêm is_license_verified nữa: entity dùng license_verification_status; thêm lại cột cũ sẽ gây lỗi INSERT sau khi DROP.
ALTER TABLE users ADD COLUMN license_card_front_image_url VARCHAR(2048) NULL;
ALTER TABLE users ADD COLUMN license_card_back_image_url VARCHAR(2048) NULL;
ALTER TABLE users ADD COLUMN updated_at DATETIME(6) NULL DEFAULT (CURRENT_TIMESTAMP(6)) ON UPDATE CURRENT_TIMESTAMP(6);
ALTER TABLE users ADD COLUMN verified_at DATETIME(6) NULL;

-- Đổi GPLX: boolean is_license_verified → enum license_verification_status (chạy lại an toàn nhờ continue-on-error).
ALTER TABLE users ADD COLUMN license_verification_status VARCHAR(32) NOT NULL DEFAULT 'NOT_SUBMITTED';
UPDATE users SET license_verification_status = 'APPROVED' WHERE is_license_verified = 1;
UPDATE users SET license_verification_status = CASE
    WHEN license_number IS NOT NULL OR license_card_front_image_url IS NOT NULL OR identity_number IS NOT NULL
        THEN 'PENDING'
    ELSE 'NOT_SUBMITTED'
END WHERE is_license_verified = 0 OR is_license_verified IS NULL;
-- Cột cũ NOT NULL không DEFAULT → JPA không gửi giá trị sẽ lỗi; sửa tạm rồi xóa hẳn (lệnh bỏ qua nếu cột đã không tồn tại).
ALTER TABLE users MODIFY COLUMN is_license_verified TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE users DROP COLUMN is_license_verified;

-- Tọa độ trạm (bản đồ). Nullable để tương thích dữ liệu cũ.
ALTER TABLE stations ADD COLUMN latitude DOUBLE NULL;
ALTER TABLE stations ADD COLUMN longitude DOUBLE NULL;
