package com.example.ungdunggoixe.configuration;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.data.domain.AuditorAware;
import org.springframework.stereotype.Component;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

@Component("springSecurityAuditorAware")
public class SpringSecurityAuditorAware implements AuditorAware<Long> {

    @Override
    public Optional<Long> getCurrentAuditor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return Optional.empty();
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof Number number) {
            return Optional.of(number.longValue());
        }

        if (principal instanceof String principalString) {
            try {
                return Optional.of(Long.parseLong(principalString));
            } catch (NumberFormatException ignored) {
                // Fall through to authentication name parsing below.
            }
        }

        String name = authentication.getName();
        if (name == null || name.isBlank()) {
            return Optional.empty();
        }

        try {
            return Optional.of(Long.parseLong(name));
        } catch (NumberFormatException ex) {
            return Optional.empty();
        }
    }
}
