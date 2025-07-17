import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import './App.css';

const App = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [handDrawnMarker, setHandDrawnMarker] = useState(false);
  const [markerPosition, setMarkerPosition] = useState({ top: 50, left: 50 });
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const mapRef = useRef(null);
  const qqMapRef = useRef(null);
  const mapMarkerRef = useRef(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapLoadError, setMapLoadError] = useState(null);

  // 文件上传处理
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors.some(error => error.code === 'file-too-large')) {
        setUploadMessage('图片大小不能超过10MB');
        return;
      }
      if (rejection.errors.some(error => error.code === 'file-invalid-type')) {
        setUploadMessage('只支持图片格式文件');
        return;
      }
    }
    
    const file = acceptedFiles[0];
    if (file) {
      setUploadMessage('');
      setIsImageLoaded(false);
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);
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
  }, []);

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
      const response = await fetch('http://localhost:5000/api/mapping-files');
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
    } finally {
      setFilesLoading(false);
    }
  }, [selectedFile]);

  // 处理地图点击
  const handleMapClick = useCallback(async (latLng) => {
    const coords = {
      lat: latLng.getLat(),
      lng: latLng.getLng()
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
      const response = await fetch('http://localhost:5000/api/coordinate', {
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
    let mapInstance = null;

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
          center: new window.TMap.LatLng(39.908823, 116.397470),
          zoom: 10,
          mapTypeId: 'roadmap'
        });
        
        if (mounted) {
          qqMapRef.current = mapInstance;
          
          // 地图点击事件
          mapInstance.on('click', (event) => {
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

  return (
    <div className="app">
      {/* 导航栏 */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h2 style={{ color: '#fff', margin: 0 }}>深圳地图映射工具</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.85)', margin: 0, fontSize: '14px' }}>
              用于映射手绘地图与实际地图坐标
            </p>
          </div>
          <div className="header-right">
            {/* 这里可以添加其他导航项 */}
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="app-content">
        <div className="content-wrapper">
          {/* 文件选择区域 */}
          <div className="file-selection-section">
            <h3>选择映射文件</h3>
            <div className="file-selection-row">
              <select
                className="file-select"
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
                disabled={filesLoading || availableFiles.length === 0}
              >
                {availableFiles.length === 0 ? (
                  <option value="">无可用文件</option>
                ) : (
                  availableFiles.map(file => (
                    <option key={file.filename} value={file.filename}>
                      {file.filename}
                    </option>
                  ))
                )}
              </select>
              <button
                className="refresh-button"
                onClick={loadAvailableFiles}
                disabled={filesLoading}
              >
                {filesLoading ? '加载中...' : '刷新文件列表'}
              </button>
            </div>
            {selectedFile && (
              <div className="selected-file-info">
                当前选择: {selectedFile}
              </div>
            )}
            {availableFiles.length === 0 && !filesLoading && (
              <div className="no-files-warning">
                未找到可用的映射文件
              </div>
            )}
          </div>

          {/* 地图区域 */}
          <div className="main-container">
            <div className="map-section">
              <div className="section-header">
                <h3>📍 手绘地图区域</h3>
                {uploadedImage && (
                  <button 
                    className="reset-button"
                    onClick={() => {
                      setUploadedImage(null);
                      setHandDrawnMarker(false);
                      setCoordinates(null);
                      setUploadMessage('');
                      setIsImageLoaded(false);
                      if (mapMarkerRef.current) {
                        try {
                          mapMarkerRef.current.setMap(null);
                        } catch (error) {
                          // 忽略清理错误
                        }
                        mapMarkerRef.current = null;
                      }
                    }}
                  >
                    重新上传
                  </button>
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
                      </div>
                    </div>
                    {uploadMessage && (
                      <div className="upload-message error">
                        {uploadMessage}
                      </div>
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
                    <button onClick={() => window.location.reload()}>
                      重新加载
                    </button>
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
                🖱️ 点击地图标记位置，查看手绘地图对应点
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
        </div>
      </div>
    </div>
  );
};

export default App; 