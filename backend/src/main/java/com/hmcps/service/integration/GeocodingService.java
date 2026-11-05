package com.hmcps.service.integration;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Dịch vụ giải mã địa chỉ địa lý (Reverse Geocoding)
 * Sử dụng Nominatim OpenStreetMap API hoàn toàn miễn phí, hỗ trợ tiếng Việt.
 */
@Service
@Slf4j
public class GeocodingService {

    @Value("${hmcps.map.reverse-geocoding-url:https://nominatim.openstreetmap.org/reverse}")
    private String nominatimUrl;

    @Value("${hmcps.map.user-agent:HMCPS-Construction-System/1.0}")
    private String userAgent;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    /**
     * Dịch từ Tọa độ GPS (kinh độ, vĩ độ) sang địa chỉ chi tiết bằng tiếng Việt
     * Ví dụ: (10.771971, 106.704413) -> "Số 2 Hải Triều, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh"
     */
    public String reverseGeocode(double latitude, double longitude) {
        try {
            String url = String.format("%s?lat=%.7f&lon=%.7f&format=json&accept-language=vi",
                    nominatimUrl, latitude, longitude);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", userAgent)
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                // Trích xuất trường display_name đơn giản mà không cần thư viện parser nặng
                String body = response.body();
                int idx = body.indexOf("\"display_name\":\"");
                if (idx != -1) {
                    int start = idx + 16;
                    int end = body.indexOf("\"", start);
                    if (end != -1) {
                        return body.substring(start, end).replace("\\\"", "\"");
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Nominatim reverse geocoding failed: {}", e.getMessage());
        }
        return String.format("Tọa độ GPS: (%.6f, %.6f)", latitude, longitude);
    }
}
