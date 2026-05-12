package com.example.ungdunggoixe.configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class RedisConfiguration  {

    @Value("${spring.data.redis.host}")
    private String host;
    @Value("${spring.data.redis.port}")
    private Integer port;
    @Value("${spring.data.redis.password}")
    private String password;

    public static final String USER_INFO_CACHE="userInfo";
    public static final String STATION_INFO_CACHE="stationInfo";
    public static final String VEHICLE_INFO_CACHE="vehicleInfo";
    public static final String BLOG_INFO_CACHE="blogInfo";
    @Bean
    public LettuceConnectionFactory lettuceConnectionFactory() {
            RedisStandaloneConfiguration redisStandaloneConfiguration = new RedisStandaloneConfiguration();
            redisStandaloneConfiguration.setHostName(host);
            redisStandaloneConfiguration.setPort(port);
            redisStandaloneConfiguration.setPassword(password);
            return new LettuceConnectionFactory(redisStandaloneConfiguration);



    }
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory redisConnectionFactory) {
        GenericJacksonJsonRedisSerializer jacksonJsonRedisSerializer = GenericJacksonJsonRedisSerializer.builder()
                .enableDefaultTyping(RedisCachePolymorphicValidatorFactory.create())
                .build();

        RedisCacheConfiguration redisCacheConfiguration = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofDays(1))
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(jacksonJsonRedisSerializer))
                .disableCachingNullValues();

        Map<String, RedisCacheConfiguration> initialCaches = new HashMap<>();
        initialCaches.put(USER_INFO_CACHE, redisCacheConfiguration.entryTtl(Duration.ofMinutes(50)));
        initialCaches.put(STATION_INFO_CACHE, redisCacheConfiguration.entryTtl(Duration.ofDays(2)));
        initialCaches.put(VEHICLE_INFO_CACHE, redisCacheConfiguration.entryTtl(Duration.ofDays(2)));
        initialCaches.put(BLOG_INFO_CACHE, redisCacheConfiguration.entryTtl(Duration.ofDays(2)));


        return RedisCacheManager.builder(redisConnectionFactory)
                .cacheDefaults(redisCacheConfiguration)
                .withInitialCacheConfigurations(initialCaches)

                .build();

    }
}
