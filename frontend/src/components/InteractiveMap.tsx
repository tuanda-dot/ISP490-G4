import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export interface InteractiveMapProps {
  userLocation: { lat: number; lng: number; accuracy?: number } | null;
  targetLocation: { lat: number; lng: number; name: string; radiusMeters: number };
  distanceMeters: number;
  isInGeofence: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  height?: string;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  userLocation,
  targetLocation,
  distanceMeters,
  isInGeofence,
  onMapClick,
  height = '340px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const targetMarkerRef = useRef<L.Marker | null>(null);
  const geofenceCircleRef = useRef<L.Circle | null>(null);
  const distanceLineRef = useRef<L.Polyline | null>(null);

  // Khởi tạo bản đồ 1 lần duy nhất
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = userLocation?.lat ?? targetLocation.lat;
      const initialLng = userLocation?.lng ?? targetLocation.lng;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 16,
        zoomControl: true,
      });

      // Lớp bản đồ nền OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> đóng góp',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Xử lý sự kiện click trên bản đồ để hỗ trợ kiểm thử tọa độ
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (onMapClick) {
          onMapClick(e.latlng.lat, e.latlng.lng);
        }
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Cập nhật Marker và Vùng Geofence khi tọa độ thay đổi
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Target Location (Tâm Công Trình / Trụ Sở)
    const targetIcon = L.divIcon({
      className: 'target-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="background-color: #dc2626; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(220,38,38,0.5); border: 2px solid #ffffff; font-size: 14px;">
            🏢
          </div>
          <div style="position: absolute; bottom: -20px; white-space: nowrap; background: rgba(15,23,42,0.85); color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">
            ${targetLocation.name}
          </div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    if (targetMarkerRef.current) {
      targetMarkerRef.current.setLatLng([targetLocation.lat, targetLocation.lng]);
    } else {
      targetMarkerRef.current = L.marker([targetLocation.lat, targetLocation.lng], {
        icon: targetIcon,
      }).addTo(map);
    }

    // Vòng tròn Geofence bán kính quy định (xanh lục nếu hợp lệ, đỏ nếu ngoài vùng)
    const geofenceColor = isInGeofence ? '#059669' : '#dc2626';
    if (geofenceCircleRef.current) {
      geofenceCircleRef.current.setLatLng([targetLocation.lat, targetLocation.lng]);
      geofenceCircleRef.current.setRadius(targetLocation.radiusMeters);
      geofenceCircleRef.current.setStyle({
        color: geofenceColor,
        fillColor: geofenceColor,
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '4, 4',
      });
    } else {
      geofenceCircleRef.current = L.circle([targetLocation.lat, targetLocation.lng], {
        radius: targetLocation.radiusMeters,
        color: geofenceColor,
        fillColor: geofenceColor,
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '4, 4',
      }).addTo(map);
    }

    // 2. User Location (Vị Trí Thiết Bị Thật Của Người Dùng)
    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'user-pin',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="background-color: #2563eb; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(37,99,235,0.6); border: 2.5px solid #ffffff; font-size: 13px;">
              📍
            </div>
            <div style="position: absolute; bottom: -20px; white-space: nowrap; background: #1e3a8a; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">
              Thiết bị của bạn
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      } else {
        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
          icon: userIcon,
        }).addTo(map);
      }

      // Vòng tròn sai số GPS
      if (userLocation.accuracy && userLocation.accuracy > 0) {
        if (accuracyCircleRef.current) {
          accuracyCircleRef.current.setLatLng([userLocation.lat, userLocation.lng]);
          accuracyCircleRef.current.setRadius(userLocation.accuracy);
        } else {
          accuracyCircleRef.current = L.circle([userLocation.lat, userLocation.lng], {
            radius: userLocation.accuracy,
            color: '#3b82f6',
            fillColor: '#93c5fd',
            fillOpacity: 0.12,
            weight: 1,
          }).addTo(map);
        }
      }

      // 3. Đường thẳng nối khoảng cách (Polyline)
      const latLngs: L.LatLngExpression[] = [
        [userLocation.lat, userLocation.lng],
        [targetLocation.lat, targetLocation.lng],
      ];

      if (distanceLineRef.current) {
        distanceLineRef.current.setLatLngs(latLngs);
        distanceLineRef.current.setStyle({
          color: isInGeofence ? '#059669' : '#dc2626',
        });
      } else {
        distanceLineRef.current = L.polyline(latLngs, {
          color: isInGeofence ? '#059669' : '#dc2626',
          weight: 2.5,
          dashArray: '6, 6',
        }).addTo(map);
      }

      // Fit bounds để thấy cả 2 điểm
      const bounds = L.latLngBounds([
        [userLocation.lat, userLocation.lng],
        [targetLocation.lat, targetLocation.lng],
      ]);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 17 });
    }
  }, [userLocation, targetLocation, distanceMeters, isInGeofence]);

  const handlePanToUser = () => {
    if (mapInstanceRef.current && userLocation) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 17);
    }
  };

  const handlePanToTarget = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([targetLocation.lat, targetLocation.lng], 17);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height }} />

      {/* Control Buttons Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <button
          type="button"
          onClick={handlePanToUser}
          className="btn btn-sm btn-secondary"
          style={{ backgroundColor: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', fontSize: '0.6875rem', padding: '0.35rem 0.6rem' }}
          title="Di chuyển tới vị trí thiết bị của bạn"
        >
          📍 Vị trí của tôi
        </button>
        <button
          type="button"
          onClick={handlePanToTarget}
          className="btn btn-sm btn-secondary"
          style={{ backgroundColor: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', fontSize: '0.6875rem', padding: '0.35rem 0.6rem' }}
          title="Di chuyển tới tâm công trình"
        >
          🏢 Tâm công trình
        </button>
      </div>

      {/* Distance Legend Overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          zIndex: 1000,
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          color: '#ffffff',
          padding: '0.35rem 0.65rem',
          borderRadius: '4px',
          fontSize: '0.6875rem',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        }}
      >
        <span>Khoảng cách: <strong className="tabular-nums" style={{ color: isInGeofence ? '#34d399' : '#f87171' }}>{distanceMeters} m</strong></span>
        <span>•</span>
        <span>Bán kính: <strong className="tabular-nums">{targetLocation.radiusMeters} m</strong></span>
      </div>
    </div>
  );
};
