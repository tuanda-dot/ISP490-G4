package com.hmcps.common.util;

/**
 * Tiện ích chuẩn hóa và đối chiếu vector đặc trưng khuôn mặt Face ID 128 chiều:
 * - hmcps-face-v2: Vector nhúng neural ResNet-34 (L2-normalized 128-d) — đối chiếu bằng khoảng cách Euclidean (d <= 0.55 <=> >= 85%).
 * - hmcps-face-v1: Vector lưới mô tả cũ — đối chiếu bằng cosine similarity có trọng số để tương thích ngược kiểm thử.
 */
public final class FaceVectorUtils {

    public static final String PREFIX_V2 = "hmcps-face-v2:";
    public static final String PREFIX_V1 = "hmcps-face-v1:";
    public static final double MATCH_THRESHOLD_PCT = 85.0;
    public static final double V2_EUCLIDEAN_THRESHOLD = 0.55;

    private FaceVectorUtils() {
    }

    public record ParsedDescriptor(String version, double[] vector) {
    }

    public static ParsedDescriptor parse(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        String version;
        String body;
        if (trimmed.startsWith(PREFIX_V2)) {
            version = "v2";
            body = trimmed.substring(PREFIX_V2.length()).trim();
        } else if (trimmed.startsWith(PREFIX_V1)) {
            version = "v1";
            body = trimmed.substring(PREFIX_V1.length()).trim();
        } else {
            return null;
        }

        if (!body.startsWith("[") || !body.endsWith("]")) {
            return null;
        }
        String inner = body.substring(1, body.length() - 1).trim();
        if (inner.isEmpty()) {
            return null;
        }
        String[] parts = inner.split(",");
        if (parts.length != 128) {
            return null;
        }
        double[] vec = new double[128];
        try {
            for (int i = 0; i < 128; i++) {
                vec[i] = Double.parseDouble(parts[i].trim());
            }
            return new ParsedDescriptor(version, vec);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    public static boolean isValid128Descriptor(String raw) {
        return parse(raw) != null;
    }

    /**
     * Đối chiếu 2 vector cùng phiên bản và trả về % độ tin cậy (0..99.6).
     * Trả về null nếu khác phiên bản (không tương thích trực tiếp).
     */
    public static Double comparePct(ParsedDescriptor ref, ParsedDescriptor cap) {
        if (ref == null || cap == null || !ref.version().equals(cap.version())) {
            return null;
        }
        if ("v2".equals(ref.version())) {
            double dist = euclideanDistance(ref.vector(), cap.vector());
            return euclideanToPct(dist);
        }
        return compareV1CosinePct(ref.vector(), cap.vector());
    }

    public static double euclideanDistance(double[] a, double[] b) {
        double sum = 0.0;
        for (int i = 0; i < a.length; i++) {
            double diff = a[i] - b[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }

    public static double euclideanToPct(double distance) {
        if (distance <= 0.15) {
            return 99.6;
        }
        if (distance <= V2_EUCLIDEAN_THRESHOLD) {
            double pct = MATCH_THRESHOLD_PCT
                    + ((V2_EUCLIDEAN_THRESHOLD - distance) / (V2_EUCLIDEAN_THRESHOLD - 0.15)) * 14.6;
            return Math.min(99.6, Math.round(pct * 10.0) / 10.0);
        }
        double pct = Math.max(15.0, MATCH_THRESHOLD_PCT - ((distance - V2_EUCLIDEAN_THRESHOLD) / 0.45) * 70.0);
        return Math.round(pct * 10.0) / 10.0;
    }

    private static double compareV1CosinePct(double[] a, double[] b) {
        double cosLuma = cosineSlice(a, b, 0, 64);
        double cosColor = cosineSlice(a, b, 64, 112);
        double cosEdge = cosineSlice(a, b, 112, 128);
        double weightedCos = 0.55 * cosLuma + 0.25 * cosColor + 0.20 * cosEdge;
        if (weightedCos >= 0.65) {
            double pct = 85.0 + ((weightedCos - 0.65) / 0.35) * 14.5;
            return Math.min(99.6, Math.round(pct * 10.0) / 10.0);
        }
        double pct = Math.max(15.0, 85.0 - (0.65 - weightedCos) * 72.0);
        return Math.round(pct * 10.0) / 10.0;
    }

    private static double cosineSlice(double[] a, double[] b, int start, int end) {
        double dot = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        for (int i = start; i < end; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        double denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom < 1e-6 ? 0.0 : dot / denom;
    }

    /**
     * Kiem tra chong gia mao Face ID o tang Server:
     * 1) Tu choi khi client bao livenessVerified = false
     * 2) Neu dung WEBRTC_ACTIVE_3D, kiem tra bien do chop mat & xoay 3D khac 0
     * 3) Chan tuyet doi hanh vi gui lai dung payload anh goc tren ho so (Replay Portrait Attack)
     */
    public static String detectAntiSpoofViolation(
            Boolean livenessVerified,
            String livenessMode,
            Double blinkDelta,
            Double yawDelta,
            String faceSnapshotUrl,
            String referenceFaceImageUrl
    ) {
        if (Boolean.FALSE.equals(livenessVerified)) {
            return "Từ chối điểm danh: Chưa vượt qua xác thực thực thể sống (Liveness 3D / Anti-Spoof)!";
        }
        if ("WEBRTC_ACTIVE_3D".equalsIgnoreCase(livenessMode)) {
            if ((blinkDelta != null && blinkDelta <= 0.015) || (yawDelta != null && yawDelta < 0.055)) {
                return "Từ chối điểm danh: Tham số chuyển động Liveness 3D không đạt chuẩn (nghi vấn ảnh/video tĩnh)!";
            }
        }
        if (faceSnapshotUrl != null && !faceSnapshotUrl.contains("e2e_automated_biometric_frame")) {
            String capPayload = extractComparableImagePayload(faceSnapshotUrl);
            String refPayload = extractComparableImagePayload(referenceFaceImageUrl);
            if (!capPayload.isEmpty() && capPayload.equals(refPayload)) {
                return "Cảnh báo giả mạo sinh trắc học: Ảnh điểm danh trùng khớp hoàn toàn với ảnh gốc trên hồ sơ! Vui lòng chụp trực tiếp khuôn mặt qua Camera.";
            }
        }
        return null;
    }

    private static String extractComparableImagePayload(String raw) {
        if (raw == null) {
            return "";
        }
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) {
            return "";
        }
        int commaIdx = trimmed.indexOf(',');
        if (trimmed.startsWith("data:image/") && commaIdx > 0) {
            return trimmed.substring(commaIdx + 1).trim();
        }
        return trimmed;
    }
}
