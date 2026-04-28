package com.example.ungdunggoixe.common;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

public enum VehiclePolicyTerm {
    NO_SMOKING("Không hút thuốc trong xe"),
    LATE_RETURN_SURCHARGE("Trả xe trễ sẽ bị tính phụ phí theo giờ/ngày"),
    EXTENSION_REQUIRES_APPROVAL("Muốn gia hạn phải thông báo trước và được bên cho thuê đồng ý"),
    NO_SUBLEASING("Không cho người khác thuê lại nếu chưa được phép"),
    PET_POLICY("Quy định về thú cưng"),
    HOME_DELIVERY_SURCHARGE("Phụ phí giao xe tận nơi"),
    FREE_CANCELLATION_FEE("Miễn phí phí hủy đặt xe"),
    DEPOSIT_FORFEIT_CANCELLATION_FEE("Mất cọc phí hủy đặt xe"),
    ADDITIONAL_DRIVER_FEE("Tính phí người lái phụ");

    private final String label;

    VehiclePolicyTerm(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    public static Optional<VehiclePolicyTerm> fromInput(String input) {
        if (input == null || input.isBlank()) {
            return Optional.empty();
        }
        String normalized = normalize(input);
        return Arrays.stream(values())
                .filter(v -> normalize(v.name()).equals(normalized) || normalize(v.label).equals(normalized))
                .findFirst();
    }

    private static String normalize(String value) {
        String ascii = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return ascii
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
    }
}