// 坐标点接口定义
export interface HandDrawnCoords {
  x: number; // 归一化坐标 (0-1)
  y: number; // 归一化坐标 (0-1)
  pixelX: number; // 相对于原始图片的像素坐标
  pixelY: number; // 相对于原始图片的像素坐标
}

export interface TencentCoords {
  lat: number; // 纬度
  lng: number; // 经度
}

export interface MappingPoint {
  id: string; // 唯一标识符
  handDrawnCoords: HandDrawnCoords; // 手绘地图坐标
  tencentCoords: TencentCoords | null; // 腾讯地图坐标
  timestamp: string; // 创建时间
}

// 组件属性接口
export interface ImageMapAreaProps {
  image: string | null;
  mappingPoints: MappingPoint[];
  selectedPointId: string | null;
  onImageClick: (event: React.MouseEvent<HTMLImageElement>) => void;
}

export interface TencentMapAreaProps {
  mappingPoints: MappingPoint[];
  selectedPointId: string | null;
  onMapClick: (lat: number, lng: number) => void;
}

export interface CoordinateListProps {
  mappingPoints: MappingPoint[];
  selectedPointId: string | null;
  onSelectPoint: (id: string) => void;
  onDeletePoint: (id: string) => void;
}

export interface SavedFilesListProps {
  files: Array<{filename: string; size: number; createdAt: string}>;
  onLoadFile: (filename: string) => void;
  onDeleteFile: (filename: string) => void;
  onDownloadFile: (filename: string) => void;
  onRefresh: () => void;
}

// 数据格式接口
export interface MapImageInfo {
  filename?: string;
  size: {
    width: number;
    height: number;
  };
  uploaded: string;
}

export interface MappingDataMetadata {
  createdAt: string;
  version: string;
  description: string;
  totalPoints: number;
  mapImageInfo?: MapImageInfo;
}

export interface MappingDataFormat {
  metadata: MappingDataMetadata;
  mappings: Array<{
    id: string;
    '腾讯地图坐标': {
      '经度': number;
      '纬度': number;
    } | null;
    '手绘地图坐标': {
      x: number;
      y: number;
      pixelX: number;
      pixelY: number;
    };
    timestamp: string;
  }>;
}

// API响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface SavedFile {
  filename: string;
  size: number;
  createdAt: string;
}

export interface SavedFilesResponse extends ApiResponse {
  files: SavedFile[];
}

export interface SaveJsonRequest {
  data: MappingDataFormat;
  filename: string;
}

export interface SaveJsonResponse extends ApiResponse {
  filepath: string;
  filename: string;
}

// 地图相关接口
export interface TencentMapInstance {
  // 腾讯地图实例的方法和属性
  destroy: () => void;
  on: (event: string, callback: Function) => void;
  off: (event: string, callback?: Function) => void;
  setCenter: (position: any) => void;
  setZoom: (zoom: number) => void;
  // 更多方法根据实际需要添加
}

export interface TencentMapMarker {
  // 腾讯地图标记的方法和属性
  destroy: () => void;
  setPosition: (position: any) => void;
  setVisible: (visible: boolean) => void;
  // 更多方法根据实际需要添加
}

// 全局类型声明
declare global {
  interface Window {
    qq: {
      maps: {
        Map: any;
        LatLng: any;
        Marker: any;
        event: any;
        // 更多腾讯地图 API 类型
      };
    };
  }
}

// 导出类型工具函数
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 常用常量
export const DEFAULT_MAP_CENTER = {
  lat: 39.908823,
  lng: 116.397470
};

export const DEFAULT_MAP_ZOOM = 10;

export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/bmp',
  'image/webp'
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const API_BASE_URL = 'http://localhost:5000';

export const API_ENDPOINTS = {
  SAVE_JSON: '/api/save-json',
  SAVED_FILES: '/api/saved-files',
  DOWNLOAD: '/api/download',
  DELETE: '/api/delete',
  HEALTH: '/api/health'
} as const;

// 错误类型
export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ApiError extends AppError {
  constructor(message: string, statusCode: number) {
    super(message, 'API_ERROR', statusCode);
    this.name = 'ApiError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
} 