import React, { useEffect, useRef, useState } from 'react';
import { Card, Typography, Button, message, Spin, Alert, Input, List, Divider } from 'antd';
import { EnvironmentOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { MapPoint, OperationStep, CoordinateMapping } from '../../types';
import './TencentMapArea.css';

const { Title, Text } = Typography;
const { Search } = Input;

interface SearchResult {
  id: string;
  title: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  category: string;
  distance?: number;
}

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
  
  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // 腾讯地图API Key
  const TENCENT_MAP_KEY = 'LQPBZ-S3ZK7-BWSXJ-PDZ5L-ZURM5-LQBUB';

  // 处理点击外部隐藏搜索结果
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 清理搜索状态
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // 地点搜索API调用
  const searchPlace = async (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    try {
      // 使用JSONP调用腾讯地图API以避免跨域问题
      const callbackName = `search_callback_${Date.now()}`;
      const script = document.createElement('script');
      
      // 创建全局回调函数
      (window as any)[callbackName] = (data: any) => {
        try {
          if (data.status === 0 && data.data && data.data.length > 0) {
            const results: SearchResult[] = data.data.map((item: any) => ({
              id: item.id || '',
              title: item.title || '',
              address: item.address || '',
              location: {
                lat: item.location.lat,
                lng: item.location.lng,
              },
              category: item.category || '',
              distance: item._distance && item._distance > 0 ? item._distance : undefined,
            }));
            
            setSearchResults(results);
            setShowSearchResults(true);
          } else {
            setSearchResults([]);
            setShowSearchResults(false);
            message.warning('未找到相关地点');
          }
        } catch (error) {
          console.error('搜索结果解析失败:', error);
          message.error('搜索失败，请重试');
          setSearchResults([]);
          setShowSearchResults(false);
        } finally {
          setSearchLoading(false);
          // 清理脚本和回调函数
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
          delete (window as any)[callbackName];
        }
      };

      // 构建请求URL
      const apiUrl = `https://apis.map.qq.com/ws/place/v1/search?` +
        `boundary=region(深圳, 0)&` +
        `keyword=${encodeURIComponent(keyword)}&` +
        `page_size=10&` +
        `page_index=1&` +
        `orderby=_distance&` +
        `output=jsonp&` +
        `callback=${callbackName}&` +
        `key=${TENCENT_MAP_KEY}`;

      script.src = apiUrl;
      script.onerror = () => {
        console.error('搜索API调用失败');
        message.error('搜索失败，请检查网络连接');
        setSearchResults([]);
        setShowSearchResults(false);
        setSearchLoading(false);
        // 清理
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        delete (window as any)[callbackName];
      };

      document.head.appendChild(script);

      // 设置超时处理
      setTimeout(() => {
        if ((window as any)[callbackName]) {
          console.error('搜索请求超时');
          message.error('搜索超时，请重试');
          setSearchResults([]);
          setShowSearchResults(false);
          setSearchLoading(false);
          // 清理
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
          delete (window as any)[callbackName];
        }
      }, 10000); // 10秒超时

    } catch (error) {
      console.error('搜索失败:', error);
      message.error('搜索失败，请重试');
      setSearchResults([]);
      setShowSearchResults(false);
      setSearchLoading(false);
    }
  };

  // 处理搜索结果点击
  const handleSearchResultClick = (result: SearchResult) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 跳转到搜索结果位置
    const center = new window.TMap.LatLng(result.location.lat, result.location.lng);
    map.setCenter(center);
    map.setZoom(16);

    // 隐藏搜索结果并清空搜索框
    setShowSearchResults(false);
    
    // 如果在标记状态，自动选择该点
    if (currentStep === OperationStep.MARK_MAP) {
      onMapPointSelect({
        latitude: result.location.lat,
        longitude: result.location.lng
      });
    }

    message.success(`已跳转到 ${result.title}`);
  };

  // 处理搜索结果区域的滚动事件，阻止事件冒泡到地图
  const handleSearchResultsWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  // 处理搜索结果区域的鼠标事件，阻止事件冒泡到地图
  const handleSearchResultsMouseEvents = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 处理搜索框焦点事件
  const handleSearchFocus = () => {
    if (searchResults.length > 0) {
      setShowSearchResults(true);
    }
  };

  // 处理搜索框变化事件
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // 如果输入为空，隐藏搜索结果
    if (!value.trim()) {
      setShowSearchResults(false);
      setSearchResults([]);
    }
  };

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
          center: new window.TMap.LatLng(22.5390, 113.9324), // 深圳市中心
          zoom: 12,
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
        {/* 搜索框 */}
        <div className="search-container" ref={searchContainerRef}>
          <Search
            placeholder="搜索地点，如：深圳大学"
            value={searchQuery}
            onChange={handleSearchChange}
            onSearch={searchPlace}
            loading={searchLoading}
            onFocus={handleSearchFocus}
            enterButton={<SearchOutlined />}
            style={{ marginBottom: 12 }}
          />
          
          {/* 搜索结果 */}
          {showSearchResults && searchResults.length > 0 && (
            <div 
              className="search-results"
              onWheel={handleSearchResultsWheel}
              onMouseDown={handleSearchResultsMouseEvents}
              onMouseMove={handleSearchResultsMouseEvents}
              onClick={handleSearchResultsMouseEvents}
            >
              <div className="search-results-list">
                {searchResults.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="search-result-item"
                    onClick={() => handleSearchResultClick(item)}
                  >
                    <div className="search-result-content">
                      <div className="search-result-title">{item.title}</div>
                      <div className="search-result-address">{item.address}</div>
                      {item.distance && (
                        <div className="search-result-distance">
                          距离约 {Math.round(item.distance)}米
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="operation-hint">
          {isMarkStep ? (
            <Text type="success">🗺️ 请在地图上点击标记经纬度坐标，或搜索地点快速定位</Text>
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