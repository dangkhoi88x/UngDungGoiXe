package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.constant.SecurityConstants;
import com.example.ungdunggoixe.exception.ErrorCode;
import com.example.ungdunggoixe.entity.User;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Tiện ích chung để truy vấn thông tin user từ SecurityContext.
 * Thay thế các phương thức {@code resolveCurrentUser() / currentUserId()} bị copy-paste
 * ở BookingService, PaymentService, OwnerVehicleRequestService, UserService, …
 */
@Component
@RequiredArgsConstructor
public class SecurityContextHelper {

    private final UserRepository userRepository;

    /**
     * Lấy user ID từ JWT subject. Ném {@link AppException} nếu chưa đăng nhập.
     */
    public Long requireCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        try {
            return Long.parseLong(auth.getName());
        } catch (NumberFormatException e) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }

    /**
     * Lấy user ID nếu đã đăng nhập, trả về empty nếu anonymous.
     */
    public Optional<Long> currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return Optional.empty();
        }
        try {
            return Optional.of(Long.parseLong(auth.getName()));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    /**
     * Lấy entity User hiện tại. Ném exception nếu chưa đăng nhập hoặc không tìm thấy.
     */
    public User requireCurrentUser() {
        return userRepository.findById(requireCurrentUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    /**
     * Lấy entity User nếu đã đăng nhập.
     */
    public Optional<User> resolveCurrentUser() {
        return currentUserId().flatMap(userRepository::findById);
    }

    /**
     * Kiểm tra user hiện tại có authority admin/staff hay không.
     */
    public boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        for (GrantedAuthority ga : auth.getAuthorities()) {
            if (SecurityConstants.ADMIN_AUTHORITIES.contains(ga.getAuthority())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Ném FORBIDDEN nếu user hiện tại không phải admin/staff.
     */
    public void assertAdmin() {
        if (!isAdmin()) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
    }
}
