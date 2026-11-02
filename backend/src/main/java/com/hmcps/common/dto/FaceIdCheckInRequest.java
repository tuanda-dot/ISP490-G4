package com.hmcps.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FaceIdCheckInRequest {
    private Long employeeId;
    private LocalDateTime timestamp;
    private String faceSnapshotUrl;
    private Double confidenceScore; // Độ tin cậy nhận diện (ví dụ: >= 0.85)
    private String deviceInfo;      // "Laptop Webcam", "Mobile Camera", "Office Kiosk"
    private Double latitude;        // Tọa độ GPS lấy từ Browser Geolocation API trên Laptop hoặc Mobile
    private Double longitude;       // Tọa độ GPS lấy từ Browser Geolocation API trên Laptop hoặc Mobile
}
