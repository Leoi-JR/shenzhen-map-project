import React, { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, Typography, Button, message } from 'antd';
import { UploadOutlined, AimOutlined, DeleteOutlined } from '@ant-design/icons';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ImagePoint, OperationStep, CoordinateMapping } from '../../types';
import './ImageMapArea.css';

const { Title, Text } = Typography;

interface ImageMapAreaProps {
  currentStep: OperationStep;
  uploadedImage: string | null;
  currentImagePoint: ImagePoint | null;
  mappings: CoordinateMapping[];
  onImageUpload: (imageUrl: string) => void;
  onImagePointSelect: (point: ImagePoint) => void;
  onClearImagePoint: () => void;
}

const ImageMapArea: React.FC<ImageMapAreaProps> = ({
  currentStep,
  uploadedImage,
  currentImagePoint,
  mappings,
  onImageUpload,
  onImagePointSelect,
  onClearImagePoint,
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 文件上传处理
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        message.error('图片大小不能超过10MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        onImageUpload(imageUrl);
        setIsImageLoaded(false);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    multiple: false,
  });

  // 处理图片容器点击标记
  const handleContainerClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (currentStep !== OperationStep.MARK_IMAGE || !isImageLoaded || !imageRef.current || !containerRef.current) {
      return;
    }

    // 获取图片的实际显示尺寸和位置
    const imageElement = imageRef.current;
    const containerElement = containerRef.current;
    
    const imageRect = imageElement.getBoundingClientRect();
    const containerRect = containerElement.getBoundingClientRect();
    
    // 计算点击位置相对于图片的坐标
    const x = (event.clientX - imageRect.left) / imageRect.width;
    const y = (event.clientY - imageRect.top) / imageRect.height;

    // 确保点击在图片范围内
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      onImagePointSelect({ x, y });
    }
  }, [currentStep, isImageLoaded, onImagePointSelect]);

  const isUploadStep = currentStep === OperationStep.UPLOAD_IMAGE;
  const isMarkStep = currentStep === OperationStep.MARK_IMAGE;

  return (
    <Card 
      title={
        <div className="area-header">
          <AimOutlined />
          <Title level={4} style={{ margin: 0 }}>手绘地图区域</Title>
        </div>
      }
      className={`image-map-area ${isUploadStep ? 'active' : ''}`}
      extra={
        uploadedImage && (
          <Button 
            icon={<DeleteOutlined />} 
            onClick={() => {
              onImageUpload('');
              onClearImagePoint();
              setIsImageLoaded(false);
            }}
            size="small"
          >
            重新上传
          </Button>
        )
      }
    >
      {!uploadedImage ? (
        <div className="upload-area">
          <div 
            {...getRootProps()} 
            className={`upload-dropzone ${isDragActive ? 'drag-active' : ''} ${isUploadStep ? 'highlight' : ''}`}
          >
            <input {...getInputProps()} />
            <UploadOutlined className="upload-icon" />
            <div className="upload-text">
              <Text strong>点击上传或拖拽图片到此处</Text>
              <br />
              <Text type="secondary">支持 JPG、PNG、GIF 等格式，最大10MB</Text>
            </div>
          </div>
        </div>
      ) : (
        <div className="image-container">
          <div className="operation-hint">
            {isMarkStep ? (
              <Text type="success">📍 请在图片上点击标记坐标点 (滚轮缩放，拖拽平移)</Text>
            ) : (
              <Text type="secondary">等待腾讯地图标记完成...</Text>
            )}
          </div>
          
          <div 
            ref={containerRef}
            className="image-wrapper"
            onClick={isMarkStep ? handleContainerClick : undefined}
            style={{
              cursor: isMarkStep && isImageLoaded ? 'crosshair' : 'default'
            }}
          >
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
                <div className="image-content">
                  <img
                    ref={imageRef}
                    src={uploadedImage}
                    alt="手绘地图"
                    className="uploaded-image"
                    onLoad={() => setIsImageLoaded(true)}
                    draggable={false}
                    style={{ 
                      userSelect: 'none',
                      display: 'block',
                      pointerEvents: 'none'
                    }}
                  />
                  
                  {/* 已完成的映射点 */}
                  {isImageLoaded && mappings.map((mapping) => (
                    <div
                      key={mapping.id}
                      className="image-marker completed"
                      style={{
                        position: 'absolute',
                        left: `${mapping.imagePoint.x * 100}%`,
                        top: `${mapping.imagePoint.y * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none',
                        zIndex: 3
                      }}
                    >
                      <div className="marker-dot completed" />
                    </div>
                  ))}
                  
                  {/* 当前标记点 */}
                  {currentImagePoint && isImageLoaded && (
                    <div
                      className="image-marker current"
                      style={{
                        position: 'absolute',
                        left: `${currentImagePoint.x * 100}%`,
                        top: `${currentImagePoint.y * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none',
                        zIndex: 4
                      }}
                    >
                      <div className="marker-dot current" />
                      <div className="marker-pulse" />
                    </div>
                  )}
                </div>
              </TransformComponent>
            </TransformWrapper>
          </div>
          
          {currentImagePoint && (
            <div className="coordinate-display">
              <Text type="secondary">
                坐标: ({currentImagePoint.x.toFixed(4)}, {currentImagePoint.y.toFixed(4)})
              </Text>
              <Button 
                size="small" 
                type="link" 
                onClick={onClearImagePoint}
                icon={<DeleteOutlined />}
              >
                清除
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default ImageMapArea; 