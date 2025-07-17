import React, { useEffect, useRef, useState } from 'react';
import { Card, Typography, Button, message, Spin, Alert } from 'antd';
import { EnvironmentOutlined, DeleteOutlined } from '@ant-design/icons';
import { MapPoint, OperationStep, CoordinateMapping } from '../../types';
import './TencentMapArea.css';

const { Title, Text } = Typography;

interface TencentMapAreaProps {
  currentStep: OperationStep;
  currentMapPoint: MapPoint | null;
  mappings: CoordinateMapping[];
  onMapPointSelect: (point: MapPoint) => void;
  onClearMapPoint: () => void;
}

const TencentMapArea: React.FC<TencentMapAreaProps> = ({
  currentStep,
  currentMapPoint,
  mappings,
  onMapPointSelect,
  onClearMapPoint,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentMarker, setCurrentMarker] = useState<any>(null);
  const [completedMarkers, setCompletedMarkers] = useState<any>(null);

  // 初始化腾讯地图 - 只初始化一次
  useEffect(() => {
    let mounted = true;

    const initMap = () => {
      if (!mounted || !mapRef.current) return;
      
      if (!window.TMap) {
        setLoadError('腾讯地图API加载失败，请检查网络连接');
        setIsLoading(false);
        return;
      }

      try {
        // 确保容器清空
        if (mapRef.current) {
          mapRef.current.innerHTML = '';
        }

        const mapInstance = new window.TMap.Map(mapRef.current, {
          center: new window.TMap.LatLng(39.984120, 116.307484),
          zoom: 10,
          mapTypeId: 'roadmap'
        });

        mapInstanceRef.current = mapInstance;
        setIsLoading(false);

      } catch (error) {
        console.error('地图初始化失败:', error);
        setLoadError('地图初始化失败');
        setIsLoading(false);
      }
    };

    if (window.TMap) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://map.qq.com/api/gljs?v=1.exp&key=LQPBZ-S3ZK7-BWSXJ-PDZ5L-ZURM5-LQBUB';
      script.async = true;
      script.onload = initMap;
      script.onerror = () => {
        if (mounted) {
          setLoadError('腾讯地图API加载失败');
          setIsLoading(false);
        }
      };
      document.head.appendChild(script);
    }

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy();
        } catch (error) {
          console.warn('地图销毁失败:', error);
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 处理地图点击事件
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (evt: any) => {
      if (currentStep !== OperationStep.MARK_MAP) {
        message.warning('请先在手绘地图上标记坐标点');
        return;
      }

      const lat = evt.latLng.getLat();
      const lng = evt.latLng.getLng();
      
      onMapPointSelect({
        latitude: lat,
        longitude: lng
      });
    };

    map.on('click', handleMapClick);

    return () => {
      if (map && map.off) {
        map.off('click', handleMapClick);
      }
    };
  }, [currentStep, onMapPointSelect]);

  // 更新当前标记点
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.TMap) return;

    // 清除现有当前标记
    if (currentMarker) {
      currentMarker.setMap(null);
    }

    // 添加新的当前标记
    if (currentMapPoint) {
      const newMarker = new window.TMap.MultiMarker({
        map: map,
        styles: {
          'current': new window.TMap.MarkerStyle({
            width: 28,
            height: 38,
            anchor: { x: 14, y: 38 },
            src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
              <svg width="28" height="38" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 3C8.48 3 4 7.48 4 13c0 7.5 10 20 10 20s10-12.5 10-20c0-5.52-4.48-10-10-10z" fill="#ff4d4f" stroke="#fff" stroke-width="2"/>
                <circle cx="14" cy="13" r="5" fill="#fff"/>
                <circle cx="14" cy="13" r="3" fill="#ff4d4f"/>
              </svg>
            `)
          })
        },
        geometries: [{
          id: 'current-marker',
          styleId: 'current',
          position: new window.TMap.LatLng(currentMapPoint.latitude, currentMapPoint.longitude)
        }]
      });

      setCurrentMarker(newMarker);
      map.setCenter(new window.TMap.LatLng(currentMapPoint.latitude, currentMapPoint.longitude));
    } else {
      setCurrentMarker(null);
    }
  }, [currentMapPoint]);

  // 更新已完成的标记点
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.TMap) return;

    // 清除现有的已完成标记
    if (completedMarkers) {
      completedMarkers.setMap(null);
    }

    // 添加已完成的标记点
    if (mappings.length > 0) {
      const geometries = mappings.map((mapping) => ({
        id: `completed-${mapping.id}`,
        styleId: 'completed',
        position: new window.TMap.LatLng(mapping.mapPoint.latitude, mapping.mapPoint.longitude)
      }));

      const newCompletedMarkers = new window.TMap.MultiMarker({
        map: map,
        styles: {
          'completed': new window.TMap.MarkerStyle({
            width: 22,
            height: 30,
            anchor: { x: 11, y: 30 },
            src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
              <svg width="22" height="30" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 2C7.13 2 4 5.13 4 9c0 5.25 7 18 7 18s7-12.75 7-18c0-3.87-3.13-7-7-7z" fill="#1890ff" stroke="#fff" stroke-width="2"/>
                <circle cx="11" cy="9" r="3" fill="#fff"/>
              </svg>
            `)
          })
        },
        geometries: geometries
      });

      setCompletedMarkers(newCompletedMarkers);
    } else {
      setCompletedMarkers(null);
    }
  }, [mappings]);

  const isMarkStep = currentStep === OperationStep.MARK_MAP;

  if (loadError) {
    return (
      <Card 
        title={
          <div className="area-header">
            <EnvironmentOutlined />
            <Title level={4} style={{ margin: 0 }}>腾讯地图区域</Title>
          </div>
        }
        className="tencent-map-area"
      >
        <Alert
          message="地图加载失败"
          description={
            <div>
              <p>{loadError}</p>
              <p>请确保：</p>
              <ul>
                <li>网络连接正常</li>
                <li>已配置有效的腾讯地图API密钥</li>
                <li>浏览器支持WebGL</li>
              </ul>
              <Button 
                type="primary" 
                onClick={() => window.location.reload()}
              >
                重新加载
              </Button>
            </div>
          }
          type="error"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card 
      title={
        <div className="area-header">
          <EnvironmentOutlined />
          <Title level={4} style={{ margin: 0 }}>腾讯地图区域</Title>
        </div>
      }
      className={`tencent-map-area ${isMarkStep ? 'active' : ''}`}
      extra={
        currentMapPoint && (
          <Button 
            icon={<DeleteOutlined />} 
            onClick={onClearMapPoint}
            size="small"
          >
            清除标记
          </Button>
        )
      }
    >
      <div className="map-container">
        <div className="operation-hint">
          {isMarkStep ? (
            <Text type="success">🗺️ 请在地图上点击标记经纬度坐标</Text>
          ) : currentStep === OperationStep.UPLOAD_IMAGE ? (
            <Text type="secondary">请先上传手绘地图...</Text>
          ) : (
            <Text type="secondary">请先在手绘地图上标记坐标点...</Text>
          )}
        </div>

        <div className="map-wrapper">
          {isLoading && (
            <div className="map-loading">
              <Spin size="large" />
              <Text style={{ marginTop: 16, display: 'block' }}>地图加载中...</Text>
            </div>
          )}
          
          <div 
            ref={mapRef} 
            className={`map-container-inner ${isMarkStep && !isLoading && !loadError ? 'clickable' : ''}`}
            style={{ 
              height: '100%', 
              width: '100%',
              opacity: isLoading ? 0 : 1,
              transition: 'opacity 0.3s ease'
            }}
          />
        </div>

        {currentMapPoint && (
          <div className="coordinate-display">
            <Text type="secondary">
              经纬度: ({currentMapPoint.longitude.toFixed(6)}, {currentMapPoint.latitude.toFixed(6)})
            </Text>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TencentMapArea; 