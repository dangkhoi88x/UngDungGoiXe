package com.example.ungdunggoixe.configuration;

import com.example.ungdunggoixe.dto.response.BlogPostPublicResponse;
import com.example.ungdunggoixe.dto.response.CreateVehicleResponse;
import com.example.ungdunggoixe.dto.response.StationResponse;
import com.example.ungdunggoixe.dto.response.UserResponse;
import tools.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import tools.jackson.databind.jsontype.PolymorphicTypeValidator;

import java.math.BigDecimal;
import java.util.ArrayList;

/**
 * Giới hạn class được phép khi Redis cache dùng Jackson default typing
 * ({@link org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer}).
 * Khi thêm DTO mới vào cache, cập nhật allowlist tại đây.
 */
public final class RedisCachePolymorphicValidatorFactory {

    private RedisCachePolymorphicValidatorFactory() {}

    public static PolymorphicTypeValidator create() {
        return BasicPolymorphicTypeValidator.builder()
                .allowIfSubType(UserResponse.class)
                .allowIfSubType(StationResponse.class)
                .allowIfSubType(CreateVehicleResponse.class)
                .allowIfSubType(BlogPostPublicResponse.class)
                .allowIfSubType(BigDecimal.class)
                .allowIfSubType(ArrayList.class)
                // Backward-compatible with values cached before DTO mappers normalized List fields.
                .allowIfSubType("java.util.ImmutableCollections$")
                .build();
    }
}
