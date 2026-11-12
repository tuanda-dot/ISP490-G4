package com.hmcps.repository;

import com.hmcps.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findTopByEmailIgnoreCaseAndOtpCodeAndUsedFalseOrderByCreatedAtDesc(
            String email,
            String otpCode
    );

    List<PasswordResetToken> findByEmailIgnoreCaseAndUsedFalse(String email);
}

