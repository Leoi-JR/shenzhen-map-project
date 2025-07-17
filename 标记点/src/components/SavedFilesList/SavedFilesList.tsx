import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, message, Popconfirm, Empty, Tag } from 'antd';
import { 
  FolderOutlined, 
  DeleteOutlined, 
  DownloadOutlined, 
  ReloadOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import './SavedFilesList.css';

const { Title, Text } = Typography;

interface SavedFile {
  filename: string;
  size: number;
  createdAt: string;
}

interface SavedFilesListProps {
  visible?: boolean;
}

const SavedFilesList: React.FC<SavedFilesListProps> = ({ visible = true }) => {
  const [files, setFiles] = useState<SavedFile[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取已保存的文件列表
  const fetchSavedFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/saved-files');
      const result = await response.json();
      
      if (result.success) {
        setFiles(result.files);
      } else {
        message.error(result.message || '获取文件列表失败');
      }
    } catch (error) {
      console.error('获取文件列表失败:', error);
      message.error('获取文件列表失败，请确保服务器正在运行');
    } finally {
      setLoading(false);
    }
  };

  // 下载文件
  const handleDownload = async (filename: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/download/${filename}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        message.success('文件下载成功');
      } else {
        message.error('文件下载失败');
      }
    } catch (error) {
      console.error('下载文件失败:', error);
      message.error('下载文件失败');
    }
  };

  // 删除文件
  const handleDelete = async (filename: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/delete/${filename}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        message.success('文件删除成功');
        fetchSavedFiles(); // 重新加载文件列表
      } else {
        message.error(result.message || '删除文件失败');
      }
    } catch (error) {
      console.error('删除文件失败:', error);
      message.error('删除文件失败');
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 组件挂载时获取文件列表
  useEffect(() => {
    if (visible) {
      fetchSavedFiles();
    }
  }, [visible]);

  const columns = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      ellipsis: true,
      render: (filename: string) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <FileTextOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          <Text>{filename}</Text>
        </div>
      ),
    },
    {
      title: '文件大小',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (size: number) => (
        <Tag color="blue">{formatFileSize(size)}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (createdAt: string) => (
        <Text type="secondary">
          {new Date(createdAt).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (record: SavedFile) => (
        <Space size="small">
          <Button
            type="text"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record.filename)}
            size="small"
          >
            下载
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个文件吗？"
            onConfirm={() => handleDelete(record.filename)}
            okText="确定"
            cancelText="取消"
            okType="danger"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!visible) return null;

  return (
    <Card
      title={
        <div className="area-header">
          <FolderOutlined />
          <Title level={4} style={{ margin: 0 }}>已保存的文件</Title>
          <div className="file-count">
            <Tag color="green">{files.length} 个文件</Tag>
          </div>
        </div>
      }
      className="saved-files-list"
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchSavedFiles}
          loading={loading}
          size="small"
        >
          刷新
        </Button>
      }
    >
      <div className="list-container">
        {files.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="empty-description">
                <Text type="secondary">暂无已保存的文件</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  请先保存一些坐标映射数据到服务器
                </Text>
              </div>
            }
          />
        ) : (
          <Table
            columns={columns}
            dataSource={files}
            rowKey="filename"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
            }}
            size="middle"
            className="files-table"
            scroll={{ x: true }}
          />
        )}
      </div>
    </Card>
  );
};

export default SavedFilesList; 