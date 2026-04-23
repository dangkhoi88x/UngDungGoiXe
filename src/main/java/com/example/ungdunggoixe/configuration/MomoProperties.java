package com.example.ungdunggoixe.configuration;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "momo")
public class MomoProperties {
    private String partnerCode;
    private String returnUrl;
    private String endpoint;
    private String ipnUrl;
    private String accessKey;
    private String secretKey;
    /** MoMo v2 all-in-one usually uses captureWallet. */
    private String requestType = "captureWallet";
    /** Optional language for checkout page: vi/en. */
    private String lang = "vi";
}
