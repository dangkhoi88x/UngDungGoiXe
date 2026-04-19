package com.example.ungdunggoixe.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.TimeToLive;

import java.util.concurrent.TimeUnit;

/** Access JWT đã logout (blacklist) — chỉ dùng jti access, TTL đến khi access hết hạn. */
@RedisHash("blacklist_token")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlacklistedToken {

    @Id
    private String jti;

    @TimeToLive(unit = TimeUnit.SECONDS)
    private long timeToLiveSeconds;

    private long userId;
}
