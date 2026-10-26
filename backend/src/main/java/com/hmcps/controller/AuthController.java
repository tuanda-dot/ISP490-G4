package com.hmcps.controller;

import com.hmcps.common.dto.ApiResponse;
import com.hmcps.common.dto.ForceChangePasswordRequest;
import com.hmcps.common.dto.LoginRequest;
import com.hmcps.common.dto.LoginResponse;
import com.hmcps.security.UserPrincipal;
import com.hmcps.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success(response.getMessage(), response));
    }

    @PostMapping("/force-change-password")
    public ResponseEntity<ApiResponse<LoginResponse>> forceChangePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ForceChangePasswordRequest request
    ) {
        LoginResponse response = authService.forceChangePassword(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(response.getMessage(), response));
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponse<LoginResponse>> refreshToken(@RequestParam String refreshToken) {
        LoginResponse response = authService.refreshToken(refreshToken);
        return ResponseEntity.ok(ApiResponse.success(response.getMessage(), response));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserPrincipal>> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin người dùng thành công", principal));
    }
}
