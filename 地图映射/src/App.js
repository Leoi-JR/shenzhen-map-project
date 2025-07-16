import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useDropzone } from 'react-dropzone';
import './App.css';

const App = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [handDrawnMarker, setHandDrawnMarker] = useState(false);
  const [markerPosition, setMarkerPosition] = useState({ top: 50, left: 50 }); // 随机位置百分比
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [filesLoading, setFilesLoading] = useState(false);
  const mapRef = useRef(null);
  const qqMapRef = useRef(null);
  const mapMarkerRef = useRef(null);
  const handleMapClickRef = useRef(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapLoadError, setMapLoadError] = useState(null);

  // 加载可用的映射文件
  const loadAvailableFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/mapping-files');
      const result = await response.json();
      
      if (result.success) {
        setAvailableFiles(result.files);
        // 如果有文件且没有选择文件，默认选择第一个
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
    console.log('地图点击事件触发', latLng);
    console.log('qqMapRef.current:', qqMapRef.current);
    
    const coords = {
      lat: latLng.getLat(),
      lng: latLng.getLng()
    };
    
    setCoordinates(coords);
    
    // 清除之前的标记
    if (mapMarkerRef.current) {
      console.log('清除之前的标记');
      try {
        mapMarkerRef.current.destroy();
        console.log('标记已成功清除');
      } catch (error) {
        console.warn('清除标记时出现警告:', error);
      }
      mapMarkerRef.current = null;
    }
    
    // 在腾讯地图上添加标记 (使用新版TMap API)
    if (qqMapRef.current && window.TMap) {
      try {
        console.log('创建新标记，坐标:', coords);
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
        console.log('腾讯地图标记创建成功', marker);
        
      } catch (error) {
        console.error('创建标记时出错:', error);
      }
    } else {
      console.error('无法创建标记，检查条件：', {
        'qqMapRef.current': !!qqMapRef.current,
        'window.TMap': !!window.TMap
      });
    }
    
    // 检查是否选择了映射文件
    if (!selectedFile) {
      console.warn('请先选择坐标映射文件');
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
      console.log('坐标映射结果:', result);
      
      // 根据服务器返回的映射坐标设置手绘地图标记位置
      if (result.success && result.mapped_coordinates && result.mapped_coordinates[0] !== -1) {
        const [mappedX, mappedY] = result.mapped_coordinates;
        // 服务器返回的是0-1的值，转换为CSS百分比
        const markerTop = Math.max(0, Math.min(100, mappedY * 100));
        const markerLeft = Math.max(0, Math.min(100, mappedX * 100));
        setMarkerPosition({ top: markerTop, left: markerLeft });
        setHandDrawnMarker(true);
      } else {
        console.warn('坐标映射失败或超出范围，不显示手绘地图标记');
        setHandDrawnMarker(false);
      }
    } catch (error) {
      console.error('发送坐标到服务器失败:', error);
      setHandDrawnMarker(false);
    }
  }, [selectedFile]);

  // 更新ref以供事件监听器使用
  useEffect(() => {
    handleMapClickRef.current = handleMapClick;
  }, [handleMapClick]);

  // 组件挂载时加载文件列表
  useEffect(() => {
    loadAvailableFiles();
  }, [loadAvailableFiles]);

  // 初始化腾讯地图 (使用新版TMap API)
  useEffect(() => {
    let mounted = true;

    const initMap = () => {
      if (!mounted || !mapRef.current) return;
      
      if (!window.TMap) {
        setMapLoadError('腾讯地图API加载失败，请检查网络连接');
        setIsMapLoading(false);
        return;
      }

      try {
        console.log('地图初始化开始');
        console.log('window.TMap:', window.TMap);
        console.log('mapRef.current:', mapRef.current);
        
        // 确保容器清空
        if (mapRef.current) {
          mapRef.current.innerHTML = '';
        }

        const map = new window.TMap.Map(mapRef.current, {
          center: new window.TMap.LatLng(39.908823, 116.397470),
          zoom: 10,
          mapTypeId: 'roadmap'
        });
        
        qqMapRef.current = map;
        console.log('腾讯地图创建成功', map);

        // 地图点击事件 - 使用ref调用最新的handleMapClick
        map.on('click', (event) => {
          if (handleMapClickRef.current) {
            handleMapClickRef.current(event.latLng);
          }
        });
        console.log('地图点击事件监听器添加成功');
        
        setIsMapLoading(false);

      } catch (error) {
        console.error('地图初始化失败:', error);
        setMapLoadError('地图初始化失败');
        setIsMapLoading(false);
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
          mapMarkerRef.current.destroy();
          console.log('组件卸载：标记已清理');
        } catch (error) {
          console.warn('组件卸载：标记清理失败:', error);
        }
        mapMarkerRef.current = null;
      }
      
      // 清理地图
      if (qqMapRef.current) {
        try {
          qqMapRef.current.destroy();
          console.log('组件卸载：地图已销毁');
        } catch (error) {
          console.warn('组件卸载：地图销毁失败:', error);
        }
        qqMapRef.current = null;
      }
    };
  }, []);

  // 处理图片上传 - 使用拖拽上传
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('图片大小不能超过10MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
        setHandDrawnMarker(false);
        setMarkerPosition({ top: 50, left: 50 }); // 重置标记位置
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    multiple: false,
  });

  return (
    <div className="app">
      {/* 文件选择区域 */}
      <div className="file-selection-section">
        <div className="file-selection-container">
          <h3>选择坐标映射文件</h3>
          <div className="file-selection-row">
            <select 
              value={selectedFile} 
              onChange={(e) => setSelectedFile(e.target.value)}
              className="file-select"
              disabled={filesLoading}
            >
              <option value="">请选择映射文件</option>
              {availableFiles.map(file => (
                <option key={file.filename} value={file.filename}>
                  {file.filename} ({(file.size / 1024).toFixed(1)}KB)
                </option>
              ))}
            </select>
            <button 
              onClick={loadAvailableFiles}
              className="refresh-button"
              disabled={filesLoading}
            >
              {filesLoading ? '加载中...' : '刷新'}
            </button>
          </div>
          {selectedFile && (
            <div className="selected-file-info">
              当前选择: {selectedFile}
            </div>
          )}
          {!selectedFile && availableFiles.length === 0 && !filesLoading && (
            <div className="no-files-warning">
              暂无可用的映射文件，请先在标记点项目中创建并保存映射数据
            </div>
          )}
        </div>
      </div>

      <div className="main-container">
        {/* 手绘地图区域 */}
        <div className="map-section">
          <h3>手绘地图</h3>
          <div className="upload-area">
            <div className="hand-drawn-map">
              {uploadedImage ? (
                <TransformWrapper
                  initialScale={1}
                  minScale={0.5}
                  maxScale={4}
                  doubleClick={{ disabled: false, mode: 'reset' }}
                  wheel={{ disabled: false }}
                  pan={{ disabled: false }}
                  centerOnInit={false}
                  limitToBounds={false}
                  centerZoomedOut={false}
                  disablePadding={true}
                  smooth={false}
                >
                  <TransformComponent
                    wrapperStyle={{ width: '100%', height: '100%' }}
                    contentStyle={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div className="image-wrapper">
                      <img 
                        src={uploadedImage} 
                        alt="手绘地图" 
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          borderRadius: '4px'
                        }}
                      />
                      {/* 标记点随机位置定位 */}
                      {handDrawnMarker && (
                        <div 
                          className="image-random-marker"
                          style={{
                            top: `${markerPosition.top}%`,
                            left: `${markerPosition.left}%`
                          }}
                        >📍</div>
                      )}
                    </div>
                  </TransformComponent>
                </TransformWrapper>
              ) : (
                <div 
                  {...getRootProps()} 
                  className={`upload-dropzone ${isDragActive ? 'drag-active' : ''}`}
                  style={{
                    border: '2px dashed #d9d9d9',
                    borderRadius: '8px',
                    padding: '40px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'border-color 0.3s ease',
                    backgroundColor: isDragActive ? '#f0f8ff' : '#fafafa',
                    borderColor: isDragActive ? '#1890ff' : '#d9d9d9'
                  }}
                >
                  <input {...getInputProps()} />
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
                  <p style={{ fontSize: '16px', margin: '0 0 8px 0', color: '#333' }}>
                    {isDragActive ? '松开鼠标上传图片' : '点击上传或拖拽图片到此处'}
                  </p>
                  <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
                    支持 JPG、PNG、GIF 等格式，最大10MB
                  </p>
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                    上传后支持拖拽、缩放、平移操作
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 腾讯地图区域 */}
        <div className="map-section">
          <h3>腾讯地图</h3>
          <div className="tencent-map-wrapper">
            {isMapLoading && (
              <div className="map-loading">
                <div className="loading-spinner"></div>
                <p>地图加载中...</p>
              </div>
            )}
            {mapLoadError && (
              <div className="map-error">
                <p style={{ color: '#ff4d4f' }}>❌ {mapLoadError}</p>
                <button onClick={() => window.location.reload()}>重新加载</button>
              </div>
            )}
            <div 
              id="tencent-map" 
              ref={mapRef}
              className="tencent-map"
              style={{ 
                opacity: isMapLoading || mapLoadError ? 0 : 1,
                transition: 'opacity 0.3s ease'
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* 输出区域 */}
      <div className="output-section">
        <h3>坐标输出</h3>
        <div className="coordinates-output">
          {coordinates ? (
            <div>
              <p>纬度: {coordinates.lat.toFixed(6)}</p>
              <p>经度: {coordinates.lng.toFixed(6)}</p>
              <p>坐标: ({coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)})</p>
              {selectedFile && (
                <p>使用映射文件: {selectedFile}</p>
              )}
            </div>
          ) : (
            <div>
              <p>在腾讯地图上点击以获取坐标</p>
              {!selectedFile && (
                <p style={{ color: '#ff4d4f' }}>⚠️ 请先选择坐标映射文件</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App; 