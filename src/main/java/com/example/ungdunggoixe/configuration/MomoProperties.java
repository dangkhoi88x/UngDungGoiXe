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
    /** MoMo v2 default when caller does not override: {@code captureWallet} (ví) or set globally. */
    private String requestType = "captureWallet";
    /** Tên đối tác — MoMo yêu cầu khi {@code requestType=payWithATM} (thẻ ATM nội địa). */
    private String partnerName = "UngDungGoiXe";
    /** Mã cửa hàng — dùng cùng luồng {@code payWithATM}. */
    private String storeId = "UngDungGoiXeStore";
    /** Optional language for checkout page: vi/en. */
    private String lang = "vi";
}
