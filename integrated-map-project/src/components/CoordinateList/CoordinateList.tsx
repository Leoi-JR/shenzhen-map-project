import React from 'react';
import { Card, Table, Button, Space, Typography, message, Popconfirm, Empty, Tag } from 'antd';
import { 
  UnorderedListOutlined, 
  DeleteOutlined, 
  DownloadOutlined, 
  EyeOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { CoordinateMapping } from '../../types';
import './CoordinateList.css';

const { Title, Text } = Typography;

interface CoordinateListProps {
  mappings: CoordinateMapping[];
  onDeleteMapping: (id: string) => void;
  onExportData: () => void;
}

const CoordinateList: React.FC<CoordinateListProps> = ({
  mappings,
  onDeleteMapping,
  onExportData,
}) => {
  
  // 处理删除操作
  const handleDelete = (id: string) => {
    onDeleteMapping(id);
    message.success('坐标映射已删除');
  };

  // 获取导出数据的格式化函数
  const getExportData = () => {
    return {
      exportTime: new Date().toISOString(),
      totalCount: mappings.length,
      mappings: mappings.map((mapping, index) => ({
        序号: index + 1,
        手绘地图坐标: {
          x: mapping.imagePoint.x,
          y: mapping.imagePoint.y
        },
        腾讯地图坐标: {
          经度: mapping.mapPoint.longitude,
          纬度: mapping.mapPoint.latitude
        },
        创建时间: mapping.createdAt
      }))
    };
  };

  // 处理导出操作（下载到本地）
  const handleExport = () => {
    if (mappings.length === 0) {
      message.warning('没有可导出的数据');
      return;
    }
    
    try {
      const exportData = getExportData();

      // 创建下载链接
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `坐标映射数据_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      message.success('数据导出成功');
      onExportData();
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    }
  };

  // 处理保存到服务器操作
  const handleSaveToServer = async () => {
    if (mappings.length === 0) {
      message.warning('没有可保存的数据');
      return;
    }

    try {
      const exportData = getExportData();
      const filename = `坐标映射数据_${new Date().toLocaleDateString().replace(/\//g, '-')}_${new Date().toLocaleTimeString().replace(/:/g, '-')}.json`;
      
      const response = await fetch('http://106.13.45.251:5200/api/save-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: exportData,
          filename: filename
        })
      });

      const result = await response.json();

      if (result.success) {
        message.success(`数据已保存到服务器: ${result.filename}`);
        onExportData();
      } else {
        message.error(result.message || '保存失败');
      }
    } catch (error) {
      console.error('保存到服务器失败:', error);
      message.error('保存到服务器失败，请确保服务器正在运行');
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <Tag color="blue">{index + 1}</Tag>
      ),
    },
    {
      title: '手绘地图坐标',
      key: 'imagePoint',
      width: 200,
      render: (record: CoordinateMapping) => (
        <div className="coordinate-cell">
          <div className="coordinate-label">X:</div>
          <div className="coordinate-value">{record.imagePoint.x.toFixed(4)}</div>
          <div className="coordinate-label">Y:</div>
          <div className="coordinate-value">{record.imagePoint.y.toFixed(4)}</div>
        </div>
      ),
    },
    {
      title: '腾讯地图坐标',
      key: 'mapPoint',
      width: 250,
      render: (record: CoordinateMapping) => (
        <div className="coordinate-cell">
          <div className="coordinate-label">经度:</div>
          <div className="coordinate-value">{record.mapPoint.longitude.toFixed(6)}</div>
          <div className="coordinate-label">纬度:</div>
          <div className="coordinate-value">{record.mapPoint.latitude.toFixed(6)}</div>
        </div>
      ),
    },
    {
      title: '创建时间',
      key: 'createdAt',
      width: 160,
      render: (record: CoordinateMapping) => (
        <Text type="secondary" className="time-text">
          {new Date(record.createdAt).toLocaleString('zh-CN', {
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
      width: 100,
      align: 'center' as const,
      render: (record: CoordinateMapping) => (
        <Popconfirm
          title="确认删除"
          description="确定要删除这个坐标映射吗？"
          onConfirm={() => handleDelete(record.id)}
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
      ),
    },
  ];

  return (
    <Card
      title={
        <div className="area-header">
          <UnorderedListOutlined />
          <Title level={4} style={{ margin: 0 }}>坐标记录管理</Title>
          <div className="mapping-count">
            <Tag color="green">{mappings.length} 个映射</Tag>
          </div>
        </div>
      }
      className="coordinate-list"
      extra={
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveToServer}
            disabled={mappings.length === 0}
            size="small"
          >
            保存到服务器
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={mappings.length === 0}
            size="small"
          >
            下载JSON
          </Button>
        </Space>
      }
    >
      <div className="list-container">
        {mappings.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="empty-description">
                <Text type="secondary">暂无坐标映射记录</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  请按顺序在手绘地图和腾讯地图上标记对应点位
                </Text>
              </div>
            }
          />
        ) : (
          <>
            <div className="statistics-bar">
              <Space size="large">
                <div className="stat-item">
                  <EyeOutlined />
                  <span>总计: {mappings.length} 个坐标对</span>
                </div>
                <div className="stat-item">
                  <span>最近更新: {new Date(mappings[mappings.length - 1]?.createdAt).toLocaleString('zh-CN')}</span>
                </div>
              </Space>
            </div>
            
            <Table
              columns={columns}
              dataSource={mappings}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
              }}
              size="middle"
              className="coordinate-table"
              scroll={{ x: true }}
            />
          </>
        )}
      </div>
    </Card>
  );
};

export default CoordinateList; 