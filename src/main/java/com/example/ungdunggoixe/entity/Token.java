package com.example.ungdunggoixe.entity;

import jakarta.persistence.Entity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.TimeToLive;

import java.time.Instant;
import java.util.concurrent.TimeUnit;

@RedisHash("token")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Token {
    @Id
    private String tokenID;
    @TimeToLive(unit= TimeUnit.SECONDS)
    private long timeToLive;

}
