package com.example.ungdunggoixe.constant;

import java.util.Set;

public final class MomoConstants {
    private MomoConstants() {
    }

    public static final String REQUEST_TYPE_CAPTURE_WALLET = "captureWallet";
    public static final String REQUEST_TYPE_PAY_WITH_ATM = "payWithATM";
    public static final Set<String> CREATE_REQUEST_TYPES =
            Set.of(REQUEST_TYPE_CAPTURE_WALLET, REQUEST_TYPE_PAY_WITH_ATM);
}
