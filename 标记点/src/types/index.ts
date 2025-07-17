// 手绘地图上的点坐标（归一化坐标，0-1范围）
export interface ImagePoint {
  x: number; // 相对于图片宽度的比例
  y: number; // 相对于图片高度的比例
}

// 腾讯地图上的经纬度坐标
export interface MapPoint {
  longitude: number; // 经度
  latitude: number;  // 纬度
}

// 坐标映射关系
export interface CoordinateMapping {
  id: string;
  imagePoint: ImagePoint;
  mapPoint: MapPoint;
  createdAt: Date;
}

// 操作步骤枚举
export enum OperationStep {
  UPLOAD_IMAGE = 'upload_image',     // 上传图片
  MARK_IMAGE = 'mark_image',         // 在手绘地图上标记点
  MARK_MAP = 'mark_map',             // 在腾讯地图上标记点
}

// 应用状态
export interface AppState {
  currentStep: OperationStep;
  uploadedImage: string | null;
  currentImagePoint: ImagePoint | null;
  currentMapPoint: MapPoint | null;
  mappings: CoordinateMapping[];
}

// 腾讯地图相关类型声明
declare global {
  interface Window {
    qq: any;
    TMap: any;
  }
}

export interface TencentMapMarker {
  id: string;
  position: MapPoint;
  map: any;
} 