# Flask后端服务 - 深大地图应用

这是一个集成了坐标映射和文件管理功能的Flask后端服务。

## 功能特性

### 1. 坐标映射功能
- 基于三角剖分的坐标映射
- 仿射变换矩阵计算
- 实时坐标转换服务

### 2. 文件管理功能（集成自标记点项目）
- JSON文件保存
- 文件列表查看
- 文件下载
- 文件删除

## 安装依赖

```bash
pip install -r requirements.txt
```

## 启动服务

```bash
python app.py
```

服务将在 `http://localhost:5000` 启动。

## API接口

### 坐标映射相关

#### 1. 坐标映射
- **URL**: `POST /api/coordinate`
- **描述**: 将输入坐标映射到目标坐标系
- **请求体**:
  ```json
  {
    "coordinates": [lng, lat]
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "original_coordinates": [lng, lat],
    "mapped_coordinates": [x, y],
    "triangle_index": 0,
    "message": "坐标映射成功"
  }
  ```

#### 2. 健康检查
- **URL**: `GET /api/health`
- **描述**: 检查服务状态
- **响应**:
  ```json
  {
    "status": "healthy",
    "message": "服务正常运行",
    "mapping_data_loaded": true,
    "triangles_count": 100,
    "matrices_count": 100
  }
  ```

#### 3. 映射信息
- **URL**: `GET /api/mapping-info`
- **描述**: 获取映射系统信息
- **响应**:
  ```json
  {
    "success": true,
    "triangles_count": 100,
    "matrices_count": 100,
    "coords_triangles_sample": [...],
    "xy_triangles_sample": [...]
  }
  ```

### 文件管理相关

#### 1. 保存JSON文件
- **URL**: `POST /api/save-json`
- **描述**: 保存JSON数据到服务器
- **请求体**:
  ```json
  {
    "data": { ... },
    "filename": "example.json"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "文件保存成功",
    "filepath": "/path/to/file",
    "filename": "example.json"
  }
  ```

#### 2. 获取文件列表
- **URL**: `GET /api/saved-files`
- **描述**: 获取已保存的文件列表
- **响应**:
  ```json
  {
    "success": true,
    "files": [
      {
        "filename": "example.json",
        "size": 1024,
        "createdAt": "2024-01-01T12:00:00"
      }
    ]
  }
  ```

#### 3. 下载文件
- **URL**: `GET /api/download/<filename>`
- **描述**: 下载指定文件
- **响应**: 文件下载

#### 4. 删除文件
- **URL**: `DELETE /api/delete/<filename>`
- **描述**: 删除指定文件
- **响应**:
  ```json
  {
    "success": true,
    "message": "文件删除成功"
  }
  ```

## 文件结构

```
backend/
├── app.py                      # 主应用文件
├── utils.py                    # 工具函数
├── requirements.txt            # 依赖文件
├── README.md                  # 说明文档
├── 坐标映射数据_2025-7-13.json  # 映射数据
├── affine_matrices.npy        # 预计算的仿射矩阵
└── affine_matrices.txt        # 仿射矩阵文本格式
```

## 数据存储

- 坐标映射数据存储在 `坐标映射数据_2025-7-13.json`
- 仿射变换矩阵缓存在 `affine_matrices.npy`
- 用户上传的文件存储在 `backend/saved-data/` 目录

## 注意事项

1. 确保坐标映射数据文件存在，否则映射功能将无法正常工作
2. 文件管理功能会自动创建存储目录
3. 服务启动时会自动加载映射数据和预计算矩阵
4. 所有API都支持CORS，允许跨域访问

## 集成说明

此版本已集成了原本独立的Node.js文件管理服务，现在只需要启动一个Flask服务即可提供完整功能。原本的 `标记点/server/` 目录中的Node.js服务已不再需要单独启动。

## 开发和调试

启动服务后，可以通过以下地址进行测试：

- 坐标映射API: `http://localhost:5000/api/coordinate`
- 健康检查: `http://localhost:5000/api/health`
- 映射信息: `http://localhost:5000/api/mapping-info`
- 文件管理API: `http://localhost:5000/api/save-json`
- 文件列表: `http://localhost:5000/api/saved-files`
- 下载文件: `http://localhost:5000/api/download/<filename>`
- 删除文件: `http://localhost:5000/api/delete/<filename>` 