import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MappingPoint } from './types';
import ImageMapArea from './components/ImageMapArea/ImageMapArea';
import TencentMapArea from './components/TencentMapArea/TencentMapArea';
import CoordinateList from './components/CoordinateList/CoordinateList';
import SavedFilesList from './components/SavedFilesList/SavedFilesList';
import './App.css';

const App: React.FC = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [mappingPoints, setMappingPoints] = useState<MappingPoint[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [savedFiles, setSavedFiles] = useState<Array<{filename: string; size: number; createdAt: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载已保存的文件列表
  const loadSavedFiles = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/saved-files');
      const result = await response.json();
      if (result.success) {
        setSavedFiles(result.files);
      }
    } catch (error) {
      console.error('加载文件列表失败:', error);
    }
  };

  // 组件挂载时加载文件列表
  useEffect(() => {
    loadSavedFiles();
  }, []);

  // 处理图片上传
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 检查文件大小
      if (file.size > 10 * 1024 * 1024) { // 10MB
        alert('图片大小不能超过10MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setImageSize({ width: img.width, height: img.height });
          setUploadedImage(e.target?.result as string);
          // 清空之前的数据
          setMappingPoints([]);
          setSelectedPointId(null);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // 处理图片点击
  const handleImageClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!uploadedImage) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 计算相对于图片的归一化坐标
    const normalizedX = x / rect.width;
    const normalizedY = y / rect.height;
    
    // 计算相对于原始图片的像素坐标
    const pixelX = normalizedX * imageSize.width;
    const pixelY = normalizedY * imageSize.height;
    
    const newPoint: MappingPoint = {
      id: uuidv4(),
      handDrawnCoords: {
        x: normalizedX,
        y: normalizedY,
        pixelX: Math.round(pixelX),
        pixelY: Math.round(pixelY)
      },
      tencentCoords: null,
      timestamp: new Date().toISOString()
    };
    
    setMappingPoints(prev => [...prev, newPoint]);
    setSelectedPointId(newPoint.id);
  };

  // 处理腾讯地图点击
  const handleTencentMapClick = (lat: number, lng: number) => {
    if (selectedPointId) {
      setMappingPoints(prev => 
        prev.map(point => 
          point.id === selectedPointId 
            ? { ...point, tencentCoords: { lat, lng } }
            : point
        )
      );
      setSelectedPointId(null);
    }
  };

  // 删除标记点
  const handleDeletePoint = (id: string) => {
    setMappingPoints(prev => prev.filter(point => point.id !== id));
    if (selectedPointId === id) {
      setSelectedPointId(null);
    }
  };

  // 保存地图数据
  const handleSaveData = async () => {
    if (mappingPoints.length === 0) {
      alert('请先添加至少一个标记点');
      return;
    }

    // 检查是否所有点都有腾讯地图坐标
    const incompletePoints = mappingPoints.filter(point => !point.tencentCoords);
    if (incompletePoints.length > 0) {
      const confirmed = window.confirm(`有 ${incompletePoints.length} 个标记点尚未设置腾讯地图坐标，是否继续保存？`);
      if (!confirmed) return;
    }

    setIsLoading(true);
    
    try {
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `坐标映射数据_${timestamp}.json`;
      
      // 构建保存数据
      const mappingData = {
        metadata: {
          createdAt: now.toISOString(),
          version: '1.0',
          description: '坐标映射数据',
          totalPoints: mappingPoints.length,
          mapImageInfo: {
            size: imageSize,
            uploaded: now.toISOString()
          }
        },
        mappings: mappingPoints.map(point => ({
          id: point.id,
          '腾讯地图坐标': point.tencentCoords ? {
            '经度': point.tencentCoords.lng,
            '纬度': point.tencentCoords.lat
          } : null,
          '手绘地图坐标': {
            x: point.handDrawnCoords.x,
            y: point.handDrawnCoords.y,
            pixelX: point.handDrawnCoords.pixelX,
            pixelY: point.handDrawnCoords.pixelY
          },
          timestamp: point.timestamp
        }))
      };
      
      const response = await fetch('http://localhost:5000/api/save-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: mappingData,
          filename: filename
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('数据保存成功！');
        await loadSavedFiles(); // 重新加载文件列表
      } else {
        alert('保存失败：' + result.message);
      }
    } catch (error) {
      console.error('保存数据失败:', error);
      alert('保存失败，请检查网络连接和后端服务');
    } finally {
      setIsLoading(false);
    }
  };

  // 加载已保存的数据
  const handleLoadData = async (filename: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/download/${filename}`);
      const data = await response.json();
      
      if (data.mappings && Array.isArray(data.mappings)) {
        const loadedPoints: MappingPoint[] = data.mappings.map((mapping: any) => ({
          id: mapping.id || uuidv4(),
          handDrawnCoords: {
            x: mapping['手绘地图坐标'].x,
            y: mapping['手绘地图坐标'].y,
            pixelX: mapping['手绘地图坐标'].pixelX,
            pixelY: mapping['手绘地图坐标'].pixelY
          },
          tencentCoords: mapping['腾讯地图坐标'] ? {
            lat: mapping['腾讯地图坐标']['纬度'],
            lng: mapping['腾讯地图坐标']['经度']
          } : null,
          timestamp: mapping.timestamp
        }));
        
        setMappingPoints(loadedPoints);
        setSelectedPointId(null);
        
        // 如果数据中包含图片尺寸信息，则更新
        if (data.metadata && data.metadata.mapImageInfo && data.metadata.mapImageInfo.size) {
          setImageSize(data.metadata.mapImageInfo.size);
        }
        
        alert('数据加载成功！');
      } else {
        alert('无法解析数据文件格式');
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      alert('加载数据失败，请检查文件格式');
    }
  };

  // 删除文件
  const handleDeleteFile = async (filename: string) => {
    if (!window.confirm('确定要删除这个文件吗？')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:5000/api/delete/${filename}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('文件删除成功！');
        await loadSavedFiles(); // 重新加载文件列表
      } else {
        alert('删除失败：' + result.message);
      }
    } catch (error) {
      console.error('删除文件失败:', error);
      alert('删除文件失败，请检查网络连接');
    }
  };

  // 下载文件
  const handleDownloadFile = (filename: string) => {
    const link = document.createElement('a');
    link.href = `http://localhost:5000/api/download/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 触发文件选择
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="app">
      <div className="header">
        <h1>标记点应用</h1>
        <p>在手绘地图上标记点并与腾讯地图对应</p>
      </div>
      
      <div className="upload-section">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          style={{ display: 'none' }}
        />
        <button onClick={triggerFileInput} className="upload-button">
          上传手绘地图
        </button>
      </div>
      
      <div className="main-content">
        <div className="map-areas">
          <ImageMapArea 
            image={uploadedImage}
            mappingPoints={mappingPoints}
            selectedPointId={selectedPointId}
            onImageClick={handleImageClick}
          />
          
          <TencentMapArea 
            mappingPoints={mappingPoints}
            selectedPointId={selectedPointId}
            onMapClick={handleTencentMapClick}
          />
        </div>
        
        <div className="data-section">
          <CoordinateList 
            mappingPoints={mappingPoints}
            selectedPointId={selectedPointId}
            onSelectPoint={setSelectedPointId}
            onDeletePoint={handleDeletePoint}
          />
          
          <div className="save-section">
            <button 
              onClick={handleSaveData} 
              className="save-button"
              disabled={isLoading || mappingPoints.length === 0}
            >
              {isLoading ? '保存中...' : '保存地图数据'}
            </button>
          </div>
          
          <SavedFilesList 
            files={savedFiles}
            onLoadFile={handleLoadData}
            onDeleteFile={handleDeleteFile}
            onDownloadFile={handleDownloadFile}
            onRefresh={loadSavedFiles}
          />
        </div>
      </div>
    </div>
  );
};

export default App; 