# 手绘地图坐标映射工具

一个用于建立手绘地图与腾讯地图坐标对应关系的Web应用程序。

## 🎯 项目概述

本项目提供了一个直观易用的界面，帮助用户在手绘地图和真实地理坐标之间建立精确的映射关系。通过三个主要功能区域的协同工作，用户可以轻松完成坐标标定任务。

## ⚠️ 重要更新说明

后端服务已经从Node.js集成到了Flask应用中。现在您需要：

1. 启动Flask后端服务：
   ```bash
   cd backend
   python start_server.py
   # 或双击 backend/启动服务.bat
   ```

2. 启动React前端服务：
   ```bash
   cd 标记点
   npm start
   # 或双击 标记点/启动项目.bat
   ```

所有文件现在保存在 `backend/saved-data/` 目录中，更便于集中管理。

## ✨ 主要功能

### 📸 手绘地图区域 (Part 1)
- **图片上传**：支持拖拽或点击上传本地图片文件（JPG、PNG、GIF等格式）
- **智能显示**：自动保持图片原始宽高比，自适应容器大小
- **交互操作**：
  - 鼠标滚轮或触摸手势缩放
  - 拖拽平移浏览
  - 点击标记坐标点（归一化至0-1范围）
- **视觉反馈**：清晰的标记点显示和坐标信息

### 🗺️ 腾讯地图区域 (Part 2)
- **地图集成**：完整集成腾讯地图JavaScript API
- **标准操作**：支持地图缩放、平移等常用功能
- **智能标记**：点击地图记录精确的经纬度坐标
- **流程控制**：仅在Part 1完成标记后才允许操作

### 📊 坐标记录管理区域 (Part 3)
- **数据展示**：表格形式显示所有坐标映射关系
- **信息完整**：包含序号、手绘地图坐标、地理坐标、创建时间
- **管理功能**：
  - 删除指定的坐标对应关系
  - 导出JSON格式的映射数据
  - 实时统计显示

## 🔄 操作流程

1. **上传图片** → 选择手绘地图图片文件
2. **标记图片** → 在手绘地图上点击目标位置
3. **标记地图** → 在腾讯地图上点击对应的真实位置
4. **重复操作** → 建立多个坐标对应关系
5. **导出数据** → 获取完整的映射数据

## 🛠️ 技术架构

### 前端技术栈
- **React 18** - 现代化前端框架
- **TypeScript** - 类型安全的JavaScript
- **Ant Design** - 企业级UI组件库
- **CSS3** - 现代CSS特性和动画

### 核心依赖库
- **react-zoom-pan-pinch** - 图片缩放平移功能
- **react-dropzone** - 文件拖拽上传
- **腾讯地图JavaScript API** - 地图服务集成

### 项目结构
```
src/
├── components/           # 组件目录
│   ├── ImageMapArea/    # 手绘地图组件
│   ├── TencentMapArea/  # 腾讯地图组件
│   └── CoordinateList/  # 坐标管理组件
├── types/               # TypeScript类型定义
├── App.tsx             # 主应用组件
├── App.css             # 主应用样式
├── index.tsx           # 应用入口
└── index.css           # 全局样式
```

## 🚀 快速开始

### 前置要求
- Node.js 16.0+
- npm 或 yarn 包管理器
- 腾讯地图API密钥

### 安装步骤

1. **克隆项目**
```bash
git clone [项目地址]
cd map-coordinate-mapper
```

2. **安装依赖**
```bash
npm install
# 或
yarn install

# 安装Python依赖
cd backend
pip install -r requirements.txt
```

3. **配置API密钥**
编辑 `public/index.html` 文件，替换 `YOUR_TENCENT_MAP_KEY` 为实际的腾讯地图API密钥：
```html
<script src="https://map.qq.com/api/gljs?v=1.exp&key=你的API密钥"></script>
```

4. **启动后端服务**
```bash
cd backend
python start_server.py
# 或双击 backend/启动服务.bat
```

5. **启动前端开发服务器**
```bash
cd 标记点
npm start
# 或
yarn start
# 或双击 标记点/启动项目.bat
```

6. **打开浏览器**
访问 `http://localhost:3000` 查看应用

### 生产构建
```bash
npm run build
# 或
yarn build
```

## 📖 API密钥获取

1. 访问 [腾讯位置服务控制台](https://lbs.qq.com/console/)
2. 注册并登录账号
3. 创建新应用，获取API密钥
4. 在应用设置中启用JavaScript API服务
5. 配置域名白名单（开发时可设置为localhost）

## 🎨 设计特色

### UI/UX设计
- **Apple风格设计语言**：简洁现代的界面风格
- **直观的操作流程**：清晰的步骤指示和状态反馈
- **响应式布局**：支持桌面和平板设备
- **无障碍访问**：符合可访问性标准

### 交互体验
- **流程引导**：智能的操作步骤提示
- **实时反馈**：即时的视觉和文字反馈
- **错误处理**：友好的错误提示和恢复机制
- **性能优化**：流畅的动画和快速响应

## 📱 响应式设计

- **桌面端**：完整功能体验，大屏幕优化布局
- **平板端**：调整布局比例，保持操作便利性
- **移动端**：简化界面元素，触摸友好的交互

## 📦 导出数据格式

```json
{
  "exportTime": "2024-01-01T12:00:00.000Z",
  "totalCount": 3,
  "mappings": [
    {
      "序号": 1,
      "手绘地图坐标": {
        "x": 0.3456,
        "y": 0.7890
      },
      "腾讯地图坐标": {
        "经度": 116.397428,
        "纬度": 39.90923
      },
      "创建时间": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

## 🔧 自定义配置

### 主题定制
修改 `src/index.tsx` 中的主题配置：
```typescript
const theme = {
  token: {
    colorPrimary: '#1890ff',  // 主色调
    borderRadius: 6,          // 圆角大小
  }
};
```

### 地图配置
修改 `src/components/TencentMapArea/TencentMapArea.tsx` 中的地图初始化参数：
```typescript
const mapInstance = new window.TMap.Map(mapRef.current, {
  center: new window.TMap.LatLng(39.984120, 116.307484), // 初始中心点
  zoom: 10,                                               // 初始缩放级别
  mapTypeId: 'roadmap'                                   // 地图类型
});
```

## 🤝 贡献指南

欢迎贡献代码或提出建议！

### 开发流程
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范
- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 和 Prettier 配置
- 组件和函数需要添加适当的注释
- 提交信息应清晰描述更改内容

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [React](https://reactjs.org/) - 前端框架
- [Ant Design](https://ant.design/) - UI组件库
- [腾讯地图](https://lbs.qq.com/) - 地图服务提供商
- [react-zoom-pan-pinch](https://github.com/BetterTyped/react-zoom-pan-pinch) - 图片缩放组件

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 [Issue](链接)
- 发送邮件至：[邮箱地址]

---

**开始您的坐标映射之旅吧！** 🚀 