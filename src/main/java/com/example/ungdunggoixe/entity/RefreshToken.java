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

/** Whitelist phiên refresh: jti của refresh JWT sau login. */
@RedisHash("refresh_token")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    private String jti;

    @TimeToLive(unit = TimeUnit.SECONDS)
    private long timeToLiveSeconds;

    private long userId;
}
