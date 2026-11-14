package com.hmcps.common.util;

import com.hmcps.common.exception.BusinessException;

import java.util.Base64;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Chuẩn hóa và kiểm tra định dạng ảnh Face ID tải lên hoặc chụp từ camera/trình duyệt.
 */
public final class FaceImageValidator {

    private static final int MAX_IMAGE_PAYLOAD_LENGTH = 3_000_000;
    private static final Pattern DATA_IMAGE_PATTERN = Pattern.compile(
            "^data:image/(jpeg|jpg|png|webp|bmp);base64,([A-Za-z0-9+/=\\r\\n]+)$",
            Pattern.CASE_INSENSITIVE
    );

    private FaceImageValidator() {
    }

    public static String normalizeAndValidate(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            return null;
        }
        String trimmed = rawUrl.trim();
        if (trimmed.length() > MAX_IMAGE_PAYLOAD_LENGTH) {
            throw new BusinessException("Dung lượng ảnh Face ID quá lớn (vượt quá 2MB sau nén). Vui lòng chọn ảnh chân dung dung lượng nhỏ hơn.");
        }

        if (trimmed.regionMatches(true, 0, "data:", 0, 5)) {
            Matcher matcher = DATA_IMAGE_PATTERN.matcher(trimmed);
            if (!matcher.matches()) {
                throw new BusinessException("Định dạng ảnh Face ID không hợp lệ. Hệ thống chỉ chấp nhận ảnh JPG, JPEG, PNG, WEBP hoặc BMP.");
            }
            String mimeSubtype = matcher.group(1).toLowerCase(Locale.ROOT);
            if ("jpg".equals(mimeSubtype)) {
                mimeSubtype = "jpeg";
            }
            String base64Payload = matcher.group(2).replaceAll("\\s+", "");
            if (base64Payload.length() < 4) {
                throw new BusinessException("Dữ liệu ảnh Face ID bị lỗi hoặc rỗng. Vui lòng chụp lại hoặc chọn ảnh khác.");
            }
            try {
                byte[] decoded = Base64.getDecoder().decode(base64Payload);
                if (decoded.length == 0) {
                    throw new BusinessException("Dữ liệu ảnh Face ID không hợp lệ.");
                }
            } catch (IllegalArgumentException ex) {
                throw new BusinessException("Chuỗi mã hóa ảnh Face ID không hợp lệ. Vui lòng tải lại ảnh JPG/PNG chuẩn.");
            }
            return "data:image/" + mimeSubtype + ";base64," + base64Payload;
        }

        String lower = trimmed.toLowerCase(Locale.ROOT);
        if (lower.startsWith("http://") || lower.startsWith("https://") || trimmed.startsWith("/")) {
            return trimmed;
        }

        throw new BusinessException("Định dạng đường dẫn ảnh Face ID không hợp lệ. Vui lòng chọn tệp ảnh JPG, PNG hoặc WEBP.");
    }
}
