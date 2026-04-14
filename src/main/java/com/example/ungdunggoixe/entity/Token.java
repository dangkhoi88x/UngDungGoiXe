package com.example.ungdunggoixe.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.*;

import java.time.Instant;
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Token {
    @Id
    private String tokenID;
    private Instant issuedAt;
    private Instant expireration;

}
