import React, { useState, useCallback } from 'react';
import { Layout, Row, Col, Steps, Typography, Space, Alert, Button } from 'antd';
import { 
  UploadOutlined, 
  AimOutlined, 
  EnvironmentOutlined,
  InfoCircleOutlined,
  GithubOutlined
} from '@ant-design/icons';
import ImageMapArea from './components/ImageMapArea/ImageMapArea';
import TencentMapArea from './components/TencentMapArea/TencentMapArea';
import CoordinateList from './components/CoordinateList/CoordinateList';
import SavedFilesList from './components/SavedFilesList/SavedFilesList';
import { 
  ImagePoint, 
  MapPoint, 
  CoordinateMapping, 
  OperationStep 
} from './types';
import './App.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

function App() {
  // 应用状态
  const [currentStep, setCurrentStep] = useState<OperationStep>(OperationStep.UPLOAD_IMAGE);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [currentImagePoint, setCurrentImagePoint] = useState<ImagePoint | null>(null);
  const [currentMapPoint, setCurrentMapPoint] = useState<MapPoint | null>(null);
  const [mappings, setMappings] = useState<CoordinateMapping[]>([]);

  // 生成唯一ID
  const generateId = () => `mapping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 处理图片上传
  const handleImageUpload = useCallback((imageUrl: string) => {
    if (imageUrl) {
      setUploadedImage(imageUrl);
      setCurrentStep(OperationStep.MARK_IMAGE);
    } else {
      setUploadedImage(null);
      setCurrentStep(OperationStep.UPLOAD_IMAGE);
      setCurrentImagePoint(null);
      setCurrentMapPoint(null);
    }
  }, []);

  // 处理手绘地图点标记
  const handleImagePointSelect = useCallback((point: ImagePoint) => {
    setCurrentImagePoint(point);
    setCurrentStep(OperationStep.MARK_MAP);
  }, []);

  // 处理腾讯地图点标记
  const handleMapPointSelect = useCallback((point: MapPoint) => {
    setCurrentMapPoint(point);
    
    // 创建新的坐标映射
    if (currentImagePoint) {
      const newMapping: CoordinateMapping = {
        id: generateId(),
        imagePoint: currentImagePoint,
        mapPoint: point,
        createdAt: new Date(),
      };
      
      setMappings(prev => [...prev, newMapping]);
      
      // 重置当前点，准备下一轮标记
      setCurrentImagePoint(null);
      setCurrentMapPoint(null);
      setCurrentStep(OperationStep.MARK_IMAGE);
    }
  }, [currentImagePoint]);

  // 清除手绘地图标记点
  const handleClearImagePoint = useCallback(() => {
    setCurrentImagePoint(null);
    if (uploadedImage) {
      setCurrentStep(OperationStep.MARK_IMAGE);
    }
  }, [uploadedImage]);

  // 清除腾讯地图标记点
  const handleClearMapPoint = useCallback(() => {
    setCurrentMapPoint(null);
    if (currentImagePoint) {
      setCurrentStep(OperationStep.MARK_MAP);
    }
  }, [currentImagePoint]);

  // 删除坐标映射
  const handleDeleteMapping = useCallback((id: string) => {
    setMappings(prev => prev.filter(mapping => mapping.id !== id));
  }, []);

  // 导出数据
  const handleExportData = useCallback(() => {
    // 导出后的额外处理（如果需要）
    console.log('数据导出完成');
  }, []);

  // 步骤配置
  const steps = [
    {
      title: '上传图片',
      icon: <UploadOutlined />,
      description: '上传手绘地图图片'
    },
    {
      title: '标记图片',
      icon: <AimOutlined />,
      description: '在图片上点击标记坐标'
    },
    {
      title: '标记地图',
      icon: <EnvironmentOutlined />,
      description: '在腾讯地图上标记对应位置'
    }
  ];

  // 获取当前步骤索引
  const getCurrentStepIndex = () => {
    switch (currentStep) {
      case OperationStep.UPLOAD_IMAGE:
        return 0;
      case OperationStep.MARK_IMAGE:
        return 1;
      case OperationStep.MARK_MAP:
        return 2;
      default:
        return 0;
    }
  };

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <Title level={3} style={{ color: 'white', margin: 0 }}>
              手绘地图坐标映射工具
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
              建立手绘地图与腾讯地图的坐标对应关系
            </Text>
          </div>
          <div className="header-right">
            <Space>
              <Button 
                type="text" 
                icon={<InfoCircleOutlined />} 
                style={{ color: 'white' }}
              >
                使用帮助
              </Button>
              <Button 
                type="text" 
                icon={<GithubOutlined />} 
                style={{ color: 'white' }}
              >
                源码
              </Button>
            </Space>
          </div>
        </div>
      </Header>

      <Content className="app-content">
        <div className="content-wrapper">
          {/* 操作步骤和使用提示 - 水平布局 */}
          <div className="steps-and-hints-container">
            {/* 操作步骤指示器 - 左侧 */}
            <div className="steps-section">
              <div className="steps-wrapper">
                <div className="steps-header">
                  <InfoCircleOutlined className="steps-icon" />
                  <span className="steps-title">操作步骤</span>
                </div>
                <Steps
                  current={getCurrentStepIndex()}
                  items={steps}
                  size="small"
                  className="operation-steps"
                />
              </div>
            </div>

            {/* 使用提示 - 右侧 */}
            <div className="hints-section">
              <Alert
                message="操作提示"
                description={
                  <div>
                    <p>1. 首先上传手绘地图图片</p>
                    <p>2. 在手绘地图上点击标记坐标点</p>
                    <p>3. 在腾讯地图上点击对应的真实位置</p>
                    <p>4. 重复步骤2-3建立多个坐标对应关系</p>
                    <p>5. 完成后可导出JSON格式的映射数据</p>
                  </div>
                }
                type="info"
                showIcon
                className="usage-hint"
              />
            </div>
          </div>

          {/* 主要工作区域 */}
          <Row gutter={[16, 16]} className="main-workspace">
            {/* 手绘地图区域 */}
            <Col xs={24} lg={12}>
              <ImageMapArea
                currentStep={currentStep}
                uploadedImage={uploadedImage}
                currentImagePoint={currentImagePoint}
                mappings={mappings}
                onImageUpload={handleImageUpload}
                onImagePointSelect={handleImagePointSelect}
                onClearImagePoint={handleClearImagePoint}
              />
            </Col>

            {/* 腾讯地图区域 */}
            <Col xs={24} lg={12}>
              <TencentMapArea
                currentStep={currentStep}
                currentMapPoint={currentMapPoint}
                mappings={mappings}
                onMapPointSelect={handleMapPointSelect}
                onClearMapPoint={handleClearMapPoint}
              />
            </Col>
          </Row>

          {/* 坐标记录管理区域 */}
          <Row className="coordinate-section">
            <Col span={24}>
              <CoordinateList
                mappings={mappings}
                onDeleteMapping={handleDeleteMapping}
                onExportData={handleExportData}
              />
            </Col>
          </Row>

          {/* 已保存文件管理区域 */}
          <Row className="saved-files-section">
            <Col span={24}>
              <SavedFilesList />
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
  );
}

export default App; 