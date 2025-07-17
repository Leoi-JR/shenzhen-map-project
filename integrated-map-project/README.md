# 深圳地图项目合成版

一个集成了坐标标记和地图映射功能的深圳地图项目。

## 项目简介

本项目是将原有的两个独立项目（标记点项目和地图映射项目）合并成一个统一的应用，通过导航栏可以在两个功能模块之间切换：

- **坐标标记工具**：在手绘地图上标记坐标点，并在腾讯地图上标记对应位置，建立坐标映射关系
- **地图映射工具**：基于已有的映射文件，在腾讯地图上点击位置，查看手绘地图上的对应点

## 功能特点

### 坐标标记工具
- 📱 支持手绘地图图片上传（JPG、PNG、GIF等格式）
- 🎯 在手绘地图上点击标记坐标点
- 🗺️ 在腾讯地图上标记对应的真实位置
- 📊 坐标映射数据管理和导出
- 💾 支持将数据保存到服务器
- 📄 查看已保存的映射文件

### 地图映射工具
- 📂 选择已有的映射文件
- 🖱️ 在腾讯地图上点击位置
- 📍 自动显示手绘地图上的对应点
- 🔄 实时坐标映射和状态反馈

## 技术栈

- **前端框架**: React 18 + TypeScript
- **UI组件库**: Ant Design 5.8.0
- **地图服务**: 腾讯地图 API
- **图片处理**: react-zoom-pan-pinch（支持缩放和平移）
- **文件上传**: react-dropzone
- **构建工具**: React Scripts
- **样式**: CSS + Ant Design

## 项目结构

```
integrated-map-project/
├── public/
│   └── index.html           # HTML入口文件
├── src/
│   ├── components/          # 组件目录
│   │   ├── ImageMapArea/    # 手绘地图区域组件
│   │   ├── TencentMapArea/  # 腾讯地图区域组件
│   │   ├── CoordinateList/  # 坐标记录管理组件
│   │   ├── SavedFilesList/  # 已保存文件列表组件
│   │   └── MapMappingTool/  # 地图映射工具组件
│   ├── types/
│   │   └── index.ts         # 类型定义
│   ├── App.tsx              # 主应用组件
│   ├── App.css              # 主应用样式
│   ├── index.tsx            # 应用入口
│   └── index.css            # 全局样式
├── package.json             # 项目依赖配置
├── tsconfig.json            # TypeScript配置
└── README.md               # 项目说明文档
```

## 安装和运行

### 环境要求

- Node.js 16.0+ 
- npm 7.0+

### 安装依赖

```bash
cd integrated-map-project
npm install
```

### 启动开发服务器

```bash
npm start
```

项目将在 `http://localhost:3000` 启动

### 构建生产版本

```bash
npm run build
```

## 使用说明

### 坐标标记工具

1. **上传图片**
   - 点击上传区域或拖拽图片文件
   - 支持JPG、PNG、GIF、WebP等格式
   - 文件大小限制：10MB

2. **标记坐标**
   - 在手绘地图上点击要标记的位置
   - 在腾讯地图上点击对应的真实位置
   - 系统自动创建坐标映射关系

3. **管理数据**
   - 查看已创建的坐标映射列表
   - 删除不需要的映射关系
   - 导出JSON格式的映射数据
   - 保存数据到服务器

### 地图映射工具

1. **选择映射文件**
   - 从下拉列表中选择已有的映射文件
   - 点击"刷新文件列表"更新可用文件

2. **上传手绘地图**
   - 拖拽或点击上传手绘地图图片
   - 支持缩放和平移操作

3. **查看映射结果**
   - 在腾讯地图上点击任意位置
   - 系统自动在手绘地图上显示对应点
   - 查看坐标信息和映射状态

## 后端API依赖

本项目需要配合后端API使用，后端应提供以下接口：

- `GET /api/mapping-files` - 获取可用的映射文件列表
- `POST /api/coordinate` - 坐标映射计算
- `POST /api/save-json` - 保存映射数据到服务器
- `GET /api/saved-files` - 获取已保存的文件列表
- `GET /api/download/:filename` - 下载指定文件
- `DELETE /api/delete/:filename` - 删除指定文件

## 配置说明

### 腾讯地图API配置

项目使用腾讯地图API，需要配置有效的API密钥。在以下文件中修改：

- `src/components/TencentMapArea/TencentMapArea.tsx`
- `src/components/MapMappingTool/MapMappingTool.tsx`

```javascript
script.src = 'https://map.qq.com/api/gljs?v=1.exp&key=YOUR_API_KEY';
```

### 后端服务地址

默认后端服务地址为 `http://106.13.45.251:5200`，如需修改请在相关组件中更新API调用地址。

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 注意事项

1. **网络要求**：需要网络连接以加载腾讯地图API
2. **文件大小**：上传的图片文件大小不应超过10MB
3. **后端服务**：确保后端API服务正常运行
4. **浏览器权限**：某些功能可能需要浏览器的文件访问权限

## 开发指南

### 添加新功能

1. 在 `src/components/` 目录下创建新的组件文件夹
2. 实现组件逻辑和样式
3. 在 `src/types/index.ts` 中添加相关类型定义
4. 在主应用 `App.tsx` 中集成新组件

### 样式自定义

- 全局样式：修改 `src/index.css`
- 组件样式：在各组件目录下的 `.css` 文件中修改
- 主题配置：通过Ant Design的主题定制功能

## 许可证

本项目采用 MIT 许可证。

## 贡献指南

欢迎提交Issue和Pull Request来帮助改进项目。

## 联系方式

如有问题或建议，请通过以下方式联系：

- 创建Issue：在GitHub仓库中创建问题
- 邮件联系：[your-email@example.com]

---

感谢使用深圳地图项目合成版！ 