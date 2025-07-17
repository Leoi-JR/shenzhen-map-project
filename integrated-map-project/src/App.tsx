import React, { useState, useCallback } from 'react';
import { Layout, Menu, Typography, Space, Button, Row, Col, Steps, Alert } from 'antd';
import { 
  UploadOutlined, 
  AimOutlined, 
  EnvironmentOutlined,
  InfoCircleOutlined,
  GithubOutlined,
  HomeOutlined,
  ToolOutlined
} from '@ant-design/icons';
import ImageMapArea from './components/ImageMapArea/ImageMapArea';
import TencentMapArea from './components/TencentMapArea/TencentMapArea';
import CoordinateList from './components/CoordinateList/CoordinateList';
import SavedFilesList from './components/SavedFilesList/SavedFilesList';
import MapMappingTool from './components/MapMappingTool/MapMappingTool';
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
  // 导航状态
  const [activeTab, setActiveTab] = useState<'marking' | 'mapping'>('marking');
  
  // 标记点功能的状态
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

  // 导航菜单配置
  const menuItems = [
    {
      key: 'marking',
      icon: <HomeOutlined />,
      label: '坐标标记工具',
    },
    {
      key: 'mapping',
      icon: <ToolOutlined />,
      label: '地图映射工具',
    }
  ];

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <Title level={3} style={{ color: 'white', margin: 0 }}>
              深圳地图项目合成版
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
              集成了坐标标记和地图映射功能
            </Text>
          </div>

        </div>
      </Header>

      {/* 导航栏 */}
      <div className="nav-bar">
        <Menu
          mode="horizontal"
          selectedKeys={[activeTab]}
          items={menuItems}
          onClick={({ key }) => setActiveTab(key as 'marking' | 'mapping')}
          style={{ 
            justifyContent: 'center', 
            border: 'none',
            background: 'transparent'
          }}
        />
      </div>

      <Content className="app-content">
        <div className="content-wrapper">
          {activeTab === 'marking' && (
            <>
              {/* 操作步骤和使用提示 */}
              <div className="steps-and-hints-container">
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
            </>
          )}

          {activeTab === 'mapping' && (
            <MapMappingTool 
              sharedImage={uploadedImage}
              onImageUpdate={setUploadedImage}
            />
          )}
        </div>
      </Content>
    </Layout>
  );
}

export default App; 