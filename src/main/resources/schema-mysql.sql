-- Đồng bộ cột bảng users với entity User (chạy sau Hibernate nhờ defer-datasource-initialization).
-- Cột đã tồn tại → lỗi duplicate, bỏ qua nhờ spring.sql.init.continue-on-error=true.

ALTER TABLE users ADD COLUMN phone VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN identity_number VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN license_number VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN is_license_verified TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN license_card_front_image_url VARCHAR(2048) NULL;
ALTER TABLE users ADD COLUMN license_card_back_image_url VARCHAR(2048) NULL;
ALTER TABLE users ADD COLUMN updated_at DATETIME(6) NULL DEFAULT (CURRENT_TIMESTAMP(6)) ON UPDATE CURRENT_TIMESTAMP(6);
ALTER TABLE users ADD COLUMN verified_at DATETIME(6) NULL;
