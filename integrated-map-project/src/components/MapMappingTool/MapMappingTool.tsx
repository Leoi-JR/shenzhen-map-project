import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Card, Select, Button, message, Typography, Alert, Input } from 'antd';
import { ReloadOutlined, UndoOutlined, SearchOutlined } from '@ant-design/icons';
import { MapMappingCoordinates } from '../../types';
import './MapMappingTool.css';

const { Text, Title } = Typography;
const { Option } = Select;
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

interface MapMappingToolProps {
  sharedImage?: string | null;
  onImageUpdate?: (imageUrl: string | null) => void;
}

const MapMappingTool: React.FC<MapMappingToolProps> = ({ 
  sharedImage, 
  onImageUpdate 
}) => {
  // 使用外部传入的图片状态，如果没有则使用内部状态
  const [internalImage, setInternalImage] = useState<string | null>(null);
  const uploadedImage = sharedImage !== undefined ? sharedImage : internalImage;
  
  // 图片更新函数
  const updateImage = useCallback((imageUrl: string | null) => {
    if (onImageUpdate) {
      onImageUpdate(imageUrl);
    } else {
      setInternalImage(imageUrl);
    }
  }, [onImageUpdate]);

  const [coordinates, setCoordinates] = useState<MapMappingCoordinates | null>(null);
  const [handDrawnMarker, setHandDrawnMarker] = useState(false);
  const [markerPosition, setMarkerPosition] = useState({ top: 50, left: 50 });
  const [availableFiles, setAvailableFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const qqMapRef = useRef<any>(null);
  const mapMarkerRef = useRef<any>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  
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
  const handleSearchResultClick = async (result: SearchResult) => {
    if (!qqMapRef.current) return;

    // 跳转到搜索结果位置
    const center = new window.TMap.LatLng(result.location.lat, result.location.lng);
    qqMapRef.current.setCenter(center);
    qqMapRef.current.setZoom(16);

    // 隐藏搜索结果
    setShowSearchResults(false);

    // 设置坐标信息但不显示marker
    const coords = {
      lat: result.location.lat,
      lng: result.location.lng
    };
    
    setCoordinates(coords);

    // 检查是否选择了映射文件
    if (!selectedFile) {
      setHandDrawnMarker(false);
      message.success(`已跳转到 ${result.title}`);
      return;
    }
    
    // 发送坐标到服务器进行映射
    try {
      const response = await fetch('http://106.13.45.251:5200/api/coordinate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: [coords.lng, coords.lat],
          jsonFile: selectedFile
        })
      });
      
      const result_mapping = await response.json();
      
      // 根据服务器返回的映射坐标设置手绘地图标记位置
      if (result_mapping.success && result_mapping.mapped_coordinates && result_mapping.mapped_coordinates[0] !== -1) {
        const [mappedX, mappedY] = result_mapping.mapped_coordinates;
        const markerTop = Math.max(0, Math.min(100, mappedY * 100));
        const markerLeft = Math.max(0, Math.min(100, mappedX * 100));
        setMarkerPosition({ top: markerTop, left: markerLeft });
        setHandDrawnMarker(true);
      } else {
        setHandDrawnMarker(false);
      }
    } catch (error) {
      console.error('发送坐标到服务器失败:', error);
      setHandDrawnMarker(false);
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

  // 文件上传处理
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors.some((error: any) => error.code === 'file-too-large')) {
        setUploadMessage('图片大小不能超过10MB');
        return;
      }
      if (rejection.errors.some((error: any) => error.code === 'file-invalid-type')) {
        setUploadMessage('只支持图片格式文件');
        return;
      }
    }
    
    const file = acceptedFiles[0];
    if (file) {
      setUploadMessage('');
      setIsImageLoaded(false);
      const imageUrl = URL.createObjectURL(file);
      updateImage(imageUrl);
      setHandDrawnMarker(false);
      setCoordinates(null);
      
      // 清除地图标记
      if (mapMarkerRef.current) {
        try {
          mapMarkerRef.current.setMap(null);
        } catch (error) {
          // 忽略清理错误
        }
        mapMarkerRef.current = null;
      }
    }
  }, [updateImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  // 加载可用的映射文件
  const loadAvailableFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      const response = await fetch('http://106.13.45.251:5200/api/mapping-files');
      const result = await response.json();
      
      if (result.success) {
        setAvailableFiles(result.files);
        if (result.files.length > 0 && !selectedFile) {
          setSelectedFile(result.files[0].filename);
        }
      } else {
        console.error('加载文件列表失败:', result.message);
      }
    } catch (error) {
      console.error('加载文件列表失败:', error);
      message.error('加载文件列表失败，请确保服务器正在运行');
    } finally {
      setFilesLoading(false);
    }
  }, [selectedFile]);

  // 处理地图点击 - 重构为可复用函数
  const handleMapClick = useCallback(async (latLng: any) => {
    const coords = {
      lat: latLng.lat || latLng.getLat(),
      lng: latLng.lng || latLng.getLng()
    };
    
    setCoordinates(coords);
    
    // 清除之前的标记
    if (mapMarkerRef.current) {
      try {
        mapMarkerRef.current.setMap(null);
      } catch (error) {
        // 忽略清理错误
      }
      mapMarkerRef.current = null;
    }
    
    // 在腾讯地图上添加标记
    if (qqMapRef.current && window.TMap) {
      try {
        const marker = new window.TMap.MultiMarker({
          map: qqMapRef.current,
          styles: {
            'marker': new window.TMap.MarkerStyle({
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
            styleId: 'marker',
            position: new window.TMap.LatLng(coords.lat, coords.lng)
          }]
        });
        
        mapMarkerRef.current = marker;
        
      } catch (error) {
        console.error('创建标记时出错:', error);
      }
    }
    
    // 检查是否选择了映射文件
    if (!selectedFile) {
      setHandDrawnMarker(false);
      return;
    }
    
    // 发送坐标到服务器进行映射
    try {
      const response = await fetch('http://106.13.45.251:5200/api/coordinate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: [coords.lng, coords.lat],
          jsonFile: selectedFile
        })
      });
      
      const result = await response.json();
      
      // 根据服务器返回的映射坐标设置手绘地图标记位置
      if (result.success && result.mapped_coordinates && result.mapped_coordinates[0] !== -1) {
        const [mappedX, mappedY] = result.mapped_coordinates;
        const markerTop = Math.max(0, Math.min(100, mappedY * 100));
        const markerLeft = Math.max(0, Math.min(100, mappedX * 100));
        setMarkerPosition({ top: markerTop, left: markerLeft });
        setHandDrawnMarker(true);
      } else {
        setHandDrawnMarker(false);
      }
    } catch (error) {
      console.error('发送坐标到服务器失败:', error);
      setHandDrawnMarker(false);
    }
  }, [selectedFile]);

  // 组件挂载时加载文件列表
  useEffect(() => {
    loadAvailableFiles();
  }, [loadAvailableFiles]);

  // 初始化腾讯地图
  useEffect(() => {
    let mounted = true;
    let mapInstance: any = null;

    const initMap = () => {
      if (!mounted || !mapRef.current) return;
      
      if (!window.TMap) {
        if (mounted) {
          setMapLoadError('腾讯地图API加载失败，请检查网络连接');
          setIsMapLoading(false);
        }
        return;
      }

      try {
        mapInstance = new window.TMap.Map(mapRef.current, {
          center: new window.TMap.LatLng(22.5390, 113.9324), // 深圳市中心
          zoom: 12,
          mapTypeId: 'roadmap'
        });
        
        if (mounted) {
          qqMapRef.current = mapInstance;
          
          // 地图点击事件
          mapInstance.on('click', (event: any) => {
            handleMapClick(event.latLng);
          });
          
          setIsMapLoading(false);
        }

      } catch (error) {
        console.error('地图初始化失败:', error);
        if (mounted) {
          setMapLoadError('地图初始化失败');
          setIsMapLoading(false);
        }
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
          setMapLoadError('腾讯地图API加载失败');
          setIsMapLoading(false);
        }
      };
      document.head.appendChild(script);
    }

    return () => {
      mounted = false;
      
      // 清理标记
      if (mapMarkerRef.current) {
        try {
          mapMarkerRef.current.setMap(null);
        } catch (error) {
          // 忽略清理错误
        }
        mapMarkerRef.current = null;
      }
      
      // 清理地图
      if (mapInstance) {
        try {
          mapInstance.destroy();
        } catch (error) {
          // 忽略清理错误
        }
      }
      
      qqMapRef.current = null;
    };
  }, [handleMapClick]);

  // 重置功能
  const handleReset = () => {
    updateImage(null);
    setHandDrawnMarker(false);
    setCoordinates(null);
    setUploadMessage('');
    setIsImageLoaded(false);
    clearSearch(); // 清理搜索状态
    if (mapMarkerRef.current) {
      try {
        mapMarkerRef.current.setMap(null);
      } catch (error) {
        // 忽略清理错误
      }
      mapMarkerRef.current = null;
    }
  };

  return (
    <div className="map-mapping-tool">
      <Card 
        title={<Title level={3}>地图映射工具</Title>} 
        className="tool-card"
        extra={
          <Button
            icon={<UndoOutlined />}
            onClick={handleReset}
            size="small"
          >
            重置
          </Button>
        }
      >
        {/* 文件选择区域 */}
        <div className="file-selection-section">
          <h3>选择映射文件</h3>
          <div className="file-selection-row">
            <Select
              value={selectedFile}
              onChange={(value) => setSelectedFile(value)}
              loading={filesLoading}
              disabled={availableFiles.length === 0}
              style={{ width: 300 }}
              placeholder="请选择映射文件"
            >
              {availableFiles.map(file => (
                <Option key={file.filename} value={file.filename}>
                  {file.filename}
                </Option>
              ))}
            </Select>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadAvailableFiles}
              loading={filesLoading}
              size="small"
            >
              刷新文件列表
            </Button>
          </div>
          {selectedFile && (
            <div className="selected-file-info">
              当前选择: {selectedFile}
            </div>
          )}
          {availableFiles.length === 0 && !filesLoading && (
            <Alert
              message="未找到可用的映射文件"
              type="warning"
              showIcon
              style={{ marginTop: 8 }}
            />
          )}
        </div>

        {/* 地图区域 */}
        <div className="main-container">
          <div className="map-section">
            <div className="section-header">
              <h3>📍 手绘地图区域</h3>
              {uploadedImage && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {sharedImage && (
                    <Button 
                      size="small"
                      type="default"
                      style={{ color: '#52c41a' }}
                      disabled
                    >
                      ✓ 已使用坐标标记工具中的地图
                    </Button>
                  )}
                  <Button 
                    onClick={handleReset}
                    size="small"
                    type="default"
                  >
                    重新上传
                  </Button>
                </div>
              )}
            </div>
            
            <div className="hand-drawn-map">
              {!uploadedImage ? (
                <div className="upload-area">
                  <div 
                    {...getRootProps()} 
                    className={`upload-dropzone ${isDragActive ? 'drag-active' : ''}`}
                  >
                    <input {...getInputProps()} />
                    <div className="upload-icon">📁</div>
                    <div className="upload-text">
                      <p className="upload-title">
                        {isDragActive ? '拖放图片到此处' : '点击上传或拖拽图片到此处'}
                      </p>
                      <p className="upload-subtitle">
                        支持 JPG、PNG、GIF、WebP 等格式，最大10MB
                      </p>
                      {sharedImage === null && (
                        <p className="upload-hint">
                          💡 提示：您可以先在"坐标标记工具"中上传地图，然后切换到此页面直接使用
                        </p>
                      )}
                    </div>
                  </div>
                  {uploadMessage && (
                    <Alert
                      message={uploadMessage}
                      type="error"
                      showIcon
                      style={{ marginTop: 8 }}
                    />
                  )}
                </div>
              ) : (
                <div className="image-content">
                  <TransformWrapper
                    initialScale={1}
                    minScale={0.5}
                    maxScale={5}
                    limitToBounds={false}
                    centerOnInit={true}
                    wheel={{ step: 0.1 }}
                    doubleClick={{ disabled: true }}
                  >
                    <TransformComponent>
                      <div className="image-wrapper">
                        <img
                          src={uploadedImage}
                          alt="手绘地图"
                          onLoad={() => setIsImageLoaded(true)}
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '100%',
                            display: 'block',
                            userSelect: 'none'
                          }}
                        />
                        {handDrawnMarker && isImageLoaded && (
                          <div
                            className="image-marker"
                            style={{
                              position: 'absolute',
                              top: `${markerPosition.top}%`,
                              left: `${markerPosition.left}%`,
                              transform: 'translate(-50%, -50%)',
                              fontSize: '28px',
                              zIndex: 1000,
                              color: '#ff4444',
                              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
                              animation: 'bounce 0.5s ease-in-out',
                              pointerEvents: 'none'
                            }}
                          >
                            📍
                          </div>
                        )}
                      </div>
                    </TransformComponent>
                  </TransformWrapper>
                  <div className="image-hint">
                    💡 提示：滚轮缩放，拖拽平移
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="map-section">
            <div className="section-header">
              <h3>🗺️ 腾讯地图区域</h3>
            </div>
            
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

            <div className="tencent-map-wrapper">
              {isMapLoading && (
                <div className="map-loading">
                  <div className="loading-spinner"></div>
                  <p>地图加载中...</p>
                </div>
              )}
              {mapLoadError && (
                <div className="map-error">
                  <p>{mapLoadError}</p>
                  <Button onClick={() => window.location.reload()}>
                    重新加载
                  </Button>
                </div>
              )}
              <div 
                ref={mapRef} 
                className="tencent-map"
                style={{ 
                  width: '100%', 
                  height: '100%',
                  opacity: isMapLoading || mapLoadError ? 0 : 1,
                  transition: 'opacity 0.3s ease'
                }}
              />
            </div>
            <div className="map-hint">
              🖱️ 点击地图标记位置，或使用搜索快速定位
            </div>
          </div>
        </div>

        {/* 坐标输出区域 */}
        {coordinates && (
          <div className="output-section">
            <h3>📊 当前坐标信息</h3>
            <div className="coordinates-output">
              <div className="coord-row">
                <span className="coord-label">经度:</span>
                <span className="coord-value">{coordinates.lng.toFixed(6)}</span>
              </div>
              <div className="coord-row">
                <span className="coord-label">纬度:</span>
                <span className="coord-value">{coordinates.lat.toFixed(6)}</span>
              </div>
              <div className="coord-row">
                <span className="coord-label">映射文件:</span>
                <span className="coord-value">{selectedFile || '未选择'}</span>
              </div>
              <div className="coord-row">
                <span className="coord-label">映射状态:</span>
                <span className={`coord-value ${handDrawnMarker ? 'success' : 'error'}`}>
                  {handDrawnMarker ? '✅ 映射成功' : '❌ 映射失败'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default MapMappingTool; 