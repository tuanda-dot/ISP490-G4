package com.hmcps.common.util;

/**
 * Tiện ích định vị GPS Geofencing cho Kỹ sư công trường
 * Sử dụng công thức Haversine để tính khoảng cách giữa 2 tọa độ (kinh độ, vĩ độ) trên bề mặt Trái Đất.
 */
public final class GpsUtils {

    // Bán kính trung bình Trái Đất (mét)
    private static final double EARTH_RADIUS_METERS = 6371000.0;

    private GpsUtils() {
        // utility class
    }

    /**
     * Tính khoảng cách giữa hai tọa độ GPS theo mét.
     *
     * @param lat1 Vĩ độ điểm 1 (Vị trí nhân viên)
     * @param lon1 Kinh độ điểm 1 (Vị trí nhân viên)
     * @param lat2 Vĩ độ điểm 2 (Tâm công trình / Dự án)
     * @param lon2 Kinh độ điểm 2 (Tâm công trình / Dự án)
     * @return Khoảng cách theo mét
     */
    public static double calculateDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double rLat1 = Math.toRadians(lat1);
        double rLat2 = Math.toRadians(lat2);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_METERS * c;
    }

    /**
     * Kiểm tra xem tọa độ của nhân viên có nằm trong bán kính cho phép của dự án hay không.
     *
     * @param userLat Vĩ độ hiện tại của nhân viên
     * @param userLon Kinh độ hiện tại của nhân viên
     * @param projectLat Vĩ độ tâm dự án
     * @param projectLon Kinh độ tâm dự án
     * @param radiusMeters Bán kính khoanh vùng địa lý cho phép (mét)
     * @return true nếu nằm trong bán kính, ngược lại false
     */
    public static boolean isWithinGeofence(double userLat, double userLon,
                                          double projectLat, double projectLon,
                                          double radiusMeters) {
        double distance = calculateDistanceMeters(userLat, userLon, projectLat, projectLon);
        return distance <= radiusMeters;
    }
}
