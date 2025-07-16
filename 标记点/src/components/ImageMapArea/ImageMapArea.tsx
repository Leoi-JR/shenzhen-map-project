import React from 'react';
import { ImageMapAreaProps } from '../../types';
import './ImageMapArea.css';

const ImageMapArea: React.FC<ImageMapAreaProps> = ({ 
  image, 
  mappingPoints, 
  selectedPointId, 
  onImageClick 
}) => {
  return (
    <div className="image-map-area card">
      <div className="card-header">
        <h3 className="card-title">手绘地图</h3>
        <p className="subtitle">点击地图上的位置添加标记点</p>
      </div>
      <div className="card-body">
        <div className="image-container">
          {image ? (
            <div className="image-wrapper">
              <img
                src={image}
                alt="手绘地图"
                className="map-image"
                onClick={onImageClick}
              />
              {/* 渲染所有标记点 */}
              {mappingPoints.map((point) => (
                <div
                  key={point.id}
                  className={`marker-point ${
                    selectedPointId === point.id ? 'selected' : ''
                  } ${
                    point.tencentCoords ? 'completed' : 'incomplete'
                  }`}
                  style={{
                    left: `${point.handDrawnCoords.x * 100}%`,
                    top: `${point.handDrawnCoords.y * 100}%`
                  }}
                  title={`点 ${point.id.slice(0, 8)}...
像素坐标: (${point.handDrawnCoords.pixelX}, ${point.handDrawnCoords.pixelY})
归一化坐标: (${point.handDrawnCoords.x.toFixed(3)}, ${point.handDrawnCoords.y.toFixed(3)})
状态: ${point.tencentCoords ? '已完成' : '待完成'}`}
                >
                  <div className="marker-inner">
                    {point.tencentCoords ? '✓' : '?'}
                  </div>
                  <div className="marker-label">
                    {point.id.slice(0, 6)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🗺️</div>
              <p className="empty-text">请先上传手绘地图</p>
              <p className="empty-hint">支持 JPG、PNG、GIF 等格式</p>
            </div>
          )}
        </div>
      </div>
      {image && (
        <div className="map-info">
          <div className="info-item">
            <span className="info-label">标记点数量:</span>
            <span className="info-value">{mappingPoints.length}</span>
          </div>
          <div className="info-item">
            <span className="info-label">已完成:</span>
            <span className="info-value">
              {mappingPoints.filter(p => p.tencentCoords).length}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">待完成:</span>
            <span className="info-value">
              {mappingPoints.filter(p => !p.tencentCoords).length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageMapArea; 