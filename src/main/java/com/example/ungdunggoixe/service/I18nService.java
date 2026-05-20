package com.example.ungdunggoixe.service;

import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;

public interface I18nService {
    String getMessage(String key, Object... args);
}
