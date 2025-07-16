import React, { useState } from 'react';
import { SavedFilesListProps } from '../../types';
import './SavedFilesList.css';

const SavedFilesList: React.FC<SavedFilesListProps> = ({ 
  files, 
  onLoadFile, 
  onDeleteFile, 
  onDownloadFile, 
  onRefresh 
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLoadFile = async (filename: string) => {
    setLoadingFile(filename);
    try {
      await onLoadFile(filename);
    } finally {
      setLoadingFile(null);
    }
  };

  const handleDeleteFile = async (filename: string) => {
    if (window.confirm(`确定要删除文件 "${filename}" 吗？\n\n此操作不可撤销！`)) {
      try {
        await onDeleteFile(filename);
      } catch (error) {
        console.error('删除文件失败:', error);
      }
    }
  };

  const sortedFiles = [...files].sort((a, b) => {
    // 按创建时间降序排列（最新的在前）
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="saved-files-list card">
      <div className="card-header">
        <div className="header-content">
          <h3 className="card-title">已保存的文件</h3>
          <button 
            className="refresh-btn btn btn-secondary"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="刷新文件列表"
          >
            <span className={`refresh-icon ${isRefreshing ? 'spinning' : ''}`}>
              ↻
            </span>
          </button>
        </div>
        <p className="subtitle">
          共 {files.length} 个文件，
          总大小 {formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}
        </p>
      </div>
      <div className="card-body">
        <div className="files-container">
          {sortedFiles.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <p className="empty-text">暂无已保存的文件</p>
              <p className="empty-hint">请先添加标记点并保存地图数据</p>
            </div>
          ) : (
            <div className="files-list">
              {sortedFiles.map((file) => {
                const isLoading = loadingFile === file.filename;
                
                return (
                  <div key={file.filename} className="file-item">
                    <div className="file-info">
                      <div className="file-name" title={file.filename}>
                        {file.filename}
                      </div>
                      <div className="file-meta">
                        <span className="file-size">{formatFileSize(file.size)}</span>
                        <span className="file-date">{formatDate(file.createdAt)}</span>
                      </div>
                    </div>
                    <div className="file-actions">
                      <button
                        className="action-btn load-btn btn btn-primary"
                        onClick={() => handleLoadFile(file.filename)}
                        disabled={isLoading}
                        title="加载这个文件的数据"
                      >
                        {isLoading ? (
                          <span className="loading-spinner"></span>
                        ) : (
                          '加载'
                        )}
                      </button>
                      <button
                        className="action-btn download-btn btn btn-secondary"
                        onClick={() => onDownloadFile(file.filename)}
                        title="下载这个文件到本地"
                      >
                        下载
                      </button>
                      <button
                        className="action-btn delete-btn btn btn-danger"
                        onClick={() => handleDeleteFile(file.filename)}
                        title="删除这个文件"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedFilesList; 