import React, { useEffect, useRef, useState } from 'react';
import { TencentMapAreaProps } from '../../types';
import './TencentMapArea.css';

const TencentMapArea: React.FC<TencentMapAreaProps> = ({ 
  mappingPoints, 
  selectedPointId, 
  onMapClick 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // 初始化地图
  useEffect(() => {
    let mounted = true;

    const initializeMap = () => {
      if (!mapRef.current) return;
      
      try {
        // 检查腾讯地图API是否加载
        if (!window.qq || !window.qq.maps) {
          throw new Error('腾讯地图API未加载');
        }

        // 创建地图实例
        const map = new window.qq.maps.Map(mapRef.current, {
          center: new window.qq.maps.LatLng(39.908823, 116.397470),
          zoom: 10,
          mapTypeId: window.qq.maps.MapTypeId.ROADMAP
        });

        mapInstanceRef.current = map;

        // 添加地图点击事件
        window.qq.maps.event.addListener(map, 'click', (event: any) => {
          const lat = event.latLng.getLat();
          const lng = event.latLng.getLng();
          onMapClick(lat, lng);
        });

        if (mounted) {
          setIsMapLoaded(true);
          setMapError(null);
        }
      } catch (error) {
        console.error('地图初始化失败:', error);
        if (mounted) {
          setMapError(error instanceof Error ? error.message : '地图初始化失败');
          setIsMapLoaded(false);
        }
      }
    };

    // 如果腾讯地图API已经加载，直接初始化
    if (window.qq && window.qq.maps) {
      initializeMap();
    } else {
      // 否则等待API加载
      const checkApiLoaded = () => {
        if (window.qq && window.qq.maps) {
          initializeMap();
        } else {
          setTimeout(checkApiLoaded, 100);
        }
      };
      checkApiLoaded();
    }

    return () => {
      mounted = false;
      // 清理标记
      markersRef.current.forEach(marker => {
        try {
          marker.setMap(null);
        } catch (error) {
          console.warn('清理标记失败:', error);
        }
      });
      markersRef.current.clear();
    };
  }, [onMapClick]);

  // 更新地图标记
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current) return;

    try {
      // 清理旧标记
      markersRef.current.forEach(marker => {
        try {
          marker.setMap(null);
        } catch (error) {
          console.warn('清理旧标记失败:', error);
        }
      });
      markersRef.current.clear();

      // 添加新标记
      mappingPoints.forEach(point => {
        if (point.tencentCoords) {
          const marker = new window.qq.maps.Marker({
            position: new window.qq.maps.LatLng(
              point.tencentCoords.lat,
              point.tencentCoords.lng
            ),
            map: mapInstanceRef.current,
            title: `标记点 ${point.id.slice(0, 8)}...\n经度: ${point.tencentCoords.lng.toFixed(6)}\n纬度: ${point.tencentCoords.lat.toFixed(6)}`
          });

          // 如果是选中的点，设置不同样式
          if (selectedPointId === point.id) {
            // 可以在这里设置选中状态的样式
            marker.setAnimation(window.qq.maps.MarkerAnimation.BOUNCE);
            setTimeout(() => {
              try {
                marker.setAnimation(null);
              } catch (error) {
                console.warn('停止动画失败:', error);
              }
            }, 1000);
          }

          markersRef.current.set(point.id, marker);
        }
      });
    } catch (error) {
      console.error('更新地图标记失败:', error);
    }
  }, [mappingPoints, selectedPointId, isMapLoaded]);

  // 重新加载地图
  const handleReloadMap = () => {
    setIsMapLoaded(false);
    setMapError(null);
    
    // 清理当前地图实例
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current = null;
      } catch (error) {
        console.warn('清理地图实例失败:', error);
      }
    }
    
    // 重新加载页面
    window.location.reload();
  };

  return (
    <div className="tencent-map-area card">
      <div className="card-header">
        <h3 className="card-title">腾讯地图</h3>
        <p className="subtitle">
          {selectedPointId 
            ? '点击地图选择对应的地理位置' 
            : '请先在手绘地图上添加标记点'
          }
        </p>
      </div>
      <div className="card-body">
        <div className="map-container">
          {mapError ? (
            <div className="map-error">
              <div className="error-icon">⚠️</div>
              <h4>地图加载失败</h4>
              <p>{mapError}</p>
              <button onClick={handleReloadMap} className="btn btn-primary">
                重新加载
              </button>
            </div>
          ) : !isMapLoaded ? (
            <div className="map-loading">
              <div className="loading-spinner"></div>
              <p>地图加载中...</p>
            </div>
          ) : (
            <div
              ref={mapRef}
              className="map-instance"
              style={{ opacity: isMapLoaded ? 1 : 0 }}
            />
          )}
        </div>
      </div>
      <div className="map-status">
        <div className="status-item">
          <span className="status-label">地图状态:</span>
          <span className={`status-value ${isMapLoaded ? 'online' : 'offline'}`}>
            {isMapLoaded ? '已加载' : '未加载'}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">标记数量:</span>
          <span className="status-value">
            {markersRef.current.size}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">选中点:</span>
          <span className="status-value">
            {selectedPointId ? selectedPointId.slice(0, 8) + '...' : '无'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TencentMapArea; 