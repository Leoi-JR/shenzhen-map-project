import React from 'react';
import { CoordinateListProps } from '../../types';
import './CoordinateList.css';

const CoordinateList: React.FC<CoordinateListProps> = ({ 
  mappingPoints, 
  selectedPointId, 
  onSelectPoint, 
  onDeletePoint 
}) => {
  const formatCoordinate = (coord: number) => {
    return coord.toFixed(6);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="coordinate-list card">
      <div className="card-header">
        <h3 className="card-title">坐标列表</h3>
        <p className="subtitle">
          共 {mappingPoints.length} 个标记点，
          其中 {mappingPoints.filter(p => p.tencentCoords).length} 个已完成
        </p>
      </div>
      <div className="card-body">
        <div className="list-container">
          {mappingPoints.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p className="empty-text">暂无标记点</p>
              <p className="empty-hint">请在手绘地图上点击添加标记点</p>
            </div>
          ) : (
            <div className="coordinate-items">
              {mappingPoints.map((point, index) => (
                <div
                  key={point.id}
                  className={`coordinate-item ${
                    selectedPointId === point.id ? 'selected' : ''
                  } ${
                    point.tencentCoords ? 'completed' : 'incomplete'
                  }`}
                  onClick={() => onSelectPoint(point.id)}
                >
                  <div className="item-header">
                    <div className="item-index">
                      {index + 1}
                    </div>
                    <div className="item-status">
                      <span className={`status-dot ${
                        point.tencentCoords ? 'completed' : 'incomplete'
                      }`}></span>
                      <span className="status-text">
                        {point.tencentCoords ? '已完成' : '待完成'}
                      </span>
                    </div>
                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePoint(point.id);
                      }}
                      title="删除此标记点"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="item-content">
                    <div className="coord-section">
                      <h4 className="coord-title">手绘地图坐标</h4>
                      <div className="coord-details">
                        <div className="coord-row">
                          <span className="coord-label">X (归一化):</span>
                          <span className="coord-value">{point.handDrawnCoords.x.toFixed(3)}</span>
                        </div>
                        <div className="coord-row">
                          <span className="coord-label">Y (归一化):</span>
                          <span className="coord-value">{point.handDrawnCoords.y.toFixed(3)}</span>
                        </div>
                        <div className="coord-row">
                          <span className="coord-label">像素坐标:</span>
                          <span className="coord-value">
                            ({point.handDrawnCoords.pixelX}, {point.handDrawnCoords.pixelY})
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="coord-section">
                      <h4 className="coord-title">腾讯地图坐标</h4>
                      <div className="coord-details">
                        {point.tencentCoords ? (
                          <>
                            <div className="coord-row">
                              <span className="coord-label">纬度:</span>
                              <span className="coord-value">{formatCoordinate(point.tencentCoords.lat)}</span>
                            </div>
                            <div className="coord-row">
                              <span className="coord-label">经度:</span>
                              <span className="coord-value">{formatCoordinate(point.tencentCoords.lng)}</span>
                            </div>
                            <div className="coord-row">
                              <span className="coord-label">坐标:</span>
                              <span className="coord-value coord-pair">
                                ({formatCoordinate(point.tencentCoords.lat)}, {formatCoordinate(point.tencentCoords.lng)})
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="coord-empty">
                            <span className="empty-text">请在腾讯地图上点击选择位置</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="item-footer">
                    <div className="item-id">
                      <span className="id-label">ID:</span>
                      <span className="id-value" title={point.id}>
                        {point.id.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="item-timestamp">
                      <span className="time-label">创建时间:</span>
                      <span className="time-value">{formatTimestamp(point.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoordinateList; 