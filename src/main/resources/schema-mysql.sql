-- Đồng bộ cột bảng users với entity User (chạy sau Hibernate nhờ defer-datasource-initialization).
-- Cột đã tồn tại → lỗi duplicate, bỏ qua nhờ spring.sql.init.continue-on-error=true.

ALTER TABLE users ADD COLUMN phone VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN identity_number VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN license_number VARCHAR(255) NULL;
-- Không thêm is_license_verified nữa: entity dùng license_verification_status; thêm lại cột cũ sẽ gây lỗi INSERT sau khi DROP.
ALTER TABLE users ADD COLUMN license_card_front_image_url VARCHAR(2048) NULL;
ALTER TABLE users ADD COLUMN license_card_back_image_url VARCHAR(2048) NULL;
ALTER TABLE users ADD COLUMN updated_at DATETIME(6) NULL DEFAULT (CURRENT_TIMESTAMP(6)) ON UPDATE CURRENT_TIMESTAMP(6);
ALTER TABLE users ADD COLUMN created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6);
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

-- Owner gửi request đăng xe cho thuê (P2P listing flow).
CREATE TABLE IF NOT EXISTS owner_vehicle_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    owner_id BIGINT NOT NULL,
    station_id BIGINT NOT NULL,
    license_plate VARCHAR(20) NOT NULL,
    name VARCHAR(255) NULL,
    brand VARCHAR(255) NULL,
    fuel_type VARCHAR(20) NULL,
    capacity INT NULL,
    hourly_rate DECIMAL(38,2) NULL,
    daily_rate DECIMAL(38,2) NULL,
    deposit_amount DECIMAL(38,2) NULL,
    description TEXT NULL,
    address VARCHAR(255) NULL,
    latitude DOUBLE NULL,
    longitude DOUBLE NULL,
    registration_doc_url VARCHAR(2048) NULL,
    insurance_doc_url VARCHAR(2048) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    admin_note TEXT NULL,
    approved_vehicle_id BIGINT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_ovr_owner FOREIGN KEY (owner_id) REFERENCES users(id),
    CONSTRAINT fk_ovr_station FOREIGN KEY (station_id) REFERENCES stations(id),
    CONSTRAINT fk_ovr_approved_vehicle FOREIGN KEY (approved_vehicle_id) REFERENCES vehicles(id)
);

CREATE TABLE IF NOT EXISTS owner_vehicle_request_photos (
    request_id BIGINT NOT NULL,
    photo_url VARCHAR(2048) NULL,
    CONSTRAINT fk_ovr_photo_request FOREIGN KEY (request_id) REFERENCES owner_vehicle_requests(id)
);

CREATE TABLE IF NOT EXISTS owner_vehicle_request_policies (
    request_id BIGINT NOT NULL,
    policy_text TEXT NULL,
    CONSTRAINT fk_ovr_policy_request FOREIGN KEY (request_id) REFERENCES owner_vehicle_requests(id)
);

CREATE TABLE IF NOT EXISTS owner_vehicle_request_history (
    request_id BIGINT NOT NULL,
    event_type VARCHAR(64) NULL,
    status VARCHAR(32) NULL,
    actor_role VARCHAR(32) NULL,
    actor_id BIGINT NULL,
    actor_email VARCHAR(255) NULL,
    note TEXT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_ovr_history_request FOREIGN KEY (request_id) REFERENCES owner_vehicle_requests(id)
);

ALTER TABLE owner_vehicle_request_history ADD COLUMN actor_id BIGINT NULL;
ALTER TABLE owner_vehicle_request_history ADD COLUMN actor_email VARCHAR(255) NULL;
