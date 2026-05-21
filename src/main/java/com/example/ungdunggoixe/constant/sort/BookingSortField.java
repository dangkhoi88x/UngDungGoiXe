package com.example.ungdunggoixe.constant.sort;

public enum BookingSortField {
    ID("id", "id"),
    START_TIME("startTime", "startTime"),
    EXPECTED_END_TIME("expectedEndTime", "expectedEndTime"),
    CREATED_AT("createdAt", "createdAt"),
    BOOKING_CODE("bookingCode", "bookingCode"),
    TOTAL_AMOUNT("totalAmount", "totalAmount"),
    STATUS("status", "status"),
    PAYMENT_STATUS("paymentStatus", "paymentStatus"),
    RENTER_ID("renterId", "renter.id"),
    STATION_ID("stationId", "station.id"),
    VEHICLE_ID("vehicleId", "vehicle.id");

    private final String requestField;
    private final String entityPath;

    BookingSortField(String requestField, String entityPath) {
        this.requestField = requestField;
        this.entityPath = entityPath;
    }

    public static String toEntityPath(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return ID.entityPath;
        }
        for (BookingSortField field : values()) {
            if (field.requestField.equals(sortBy)) {
                return field.entityPath;
            }
        }
        return ID.entityPath;
    }
}
