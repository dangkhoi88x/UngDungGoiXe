package com.example.ungdunggoixe.configuration;

import com.cloudinary.Cloudinary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CloudinaryConfiguration {
    @Value("${cloudinary.cloud-name}")
    private String cloudName;
    @Value("${cloudinary.api-key}")
    private String apiKey;
    @Value("${cloudinary.api-secret}")
    private String apiSecret;

    private String buildcloudinaryUrl(){
        return "cloudinary://" + apiKey + ":" + apiSecret + "@" + cloudName ;
    }
    @Bean
    public Cloudinary cloudinary() {
        return new Cloudinary(buildcloudinaryUrl());
    }
}
