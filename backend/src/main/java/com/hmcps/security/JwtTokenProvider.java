package com.hmcps.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Slf4j
@Component
public class JwtTokenProvider {

    public static final String SCOPE_FULL = "FULL";
    public static final String SCOPE_PRE_AUTH = "PRE_AUTH";

    private final SecretKey secretKey;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;
    private final long preAuthTokenExpirationMs;

    public JwtTokenProvider(
            @Value("${hmcps.jwt.secret:HaiMinhConstructionPayrollSystemSecretKey2026SecureStringWith256BitsMinimumLength!}") String secret,
            @Value("${hmcps.jwt.access-token-expiration-ms:28800000}") long accessTokenExpirationMs, // 8 giờ
            @Value("${hmcps.jwt.refresh-token-expiration-ms:2592000000}") long refreshTokenExpirationMs, // 30 ngày
            @Value("${hmcps.jwt.pre-auth-expiration-ms:900000}") long preAuthTokenExpirationMs // 15 phút
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpirationMs = accessTokenExpirationMs;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
        this.preAuthTokenExpirationMs = preAuthTokenExpirationMs;
    }

    public String generateAccessToken(UserPrincipal principal) {
        return buildToken(principal.getUsername(), principal.getId(), principal.getRole(), SCOPE_FULL, accessTokenExpirationMs);
    }

    public String generateRefreshToken(UserPrincipal principal) {
        return buildToken(principal.getUsername(), principal.getId(), principal.getRole(), SCOPE_FULL, refreshTokenExpirationMs);
    }

    public String generatePreAuthToken(UserPrincipal principal) {
        return buildToken(principal.getUsername(), principal.getId(), principal.getRole(), SCOPE_PRE_AUTH, preAuthTokenExpirationMs);
    }

    private String buildToken(String username, Long employeeId, String role, String scope, long expirationMs) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(username)
                .claim("employeeId", employeeId)
                .claim("role", role)
                .claim("scope", scope)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(secretKey)
                .compact();
    }

    public String getUsernameFromToken(String token) {
        return getClaims(token).getSubject();
    }

    public Long getEmployeeIdFromToken(String token) {
        Number id = getClaims(token).get("employeeId", Number.class);
        return id != null ? id.longValue() : null;
    }

    public String getScopeFromToken(String token) {
        return getClaims(token).get("scope", String.class);
    }

    public Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            log.warn("Invalid JWT token: {}", ex.getMessage());
            return false;
        }
    }
}
