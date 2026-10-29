package com.hmcps.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {

    private String accessToken;
    private String refreshToken;
    private String tokenType; // "Bearer" or "PreAuth"
    private boolean mustChangePassword;
    private Long employeeId;
    private String employeeCode;
    private String fullName;
    private String email;
    private String role;
    private String message;
}
