#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Flask服务启动脚本
集成了坐标映射和文件管理功能
支持动态文件选择和实时仿射变换计算
"""

import os
import sys
import json
from app import app, STORAGE_DIR

def check_dependencies():
    """检查必要的依赖和文件"""
    print("🔍 检查依赖和文件...")
    
    # 检查存储目录
    if not os.path.exists(STORAGE_DIR):
        print(f"📁 创建存储目录: {STORAGE_DIR}")
        os.makedirs(STORAGE_DIR, exist_ok=True)
    else:
        print(f"✅ 存储目录已存在: {STORAGE_DIR}")
    
    # 检查存储目录中的JSON文件
    json_files = [f for f in os.listdir(STORAGE_DIR) if f.endswith('.json')]
    if json_files:
        print(f"📄 找到 {len(json_files)} 个映射文件:")
        for file in json_files[:5]:  # 显示前5个文件
            print(f"   - {file}")
        if len(json_files) > 5:
            print(f"   ... 还有 {len(json_files) - 5} 个文件")
    else:
        print("⚠️  存储目录中没有找到映射文件")
        print("   请先在标记点项目中创建并保存坐标映射数据")
    
    # 检查Python依赖
    try:
        import flask
        import flask_cors
        import numpy
        import scipy
        print("✅ 所有Python依赖都已安装")
    except ImportError as e:
        print(f"❌ 缺少依赖: {e}")
        print("   请运行: pip install -r requirements.txt")
        return False
    
    return True

def show_api_endpoints():
    """显示所有API端点"""
    print("\n🌐 API端点列表:")
    print("  坐标映射相关:")
    print("    POST /api/coordinate     - 坐标映射 (需要提供jsonFile参数)")
    print("    GET  /api/health         - 健康检查")
    print("    POST /api/mapping-info   - 映射信息 (需要提供jsonFile参数)")
    print("    GET  /api/mapping-files  - 获取可用映射文件列表")
    print("  文件管理相关:")
    print("    POST /api/save-json      - 保存JSON文件")
    print("    GET  /api/saved-files    - 获取文件列表")
    print("    GET  /api/download/<filename> - 下载文件")
    print("    DELETE /api/delete/<filename> - 删除文件")

def main():
    """主函数"""
    print("🚀 启动Flask集成服务器...")
    print("=" * 50)
    
    # 检查依赖
    if not check_dependencies():
        print("❌ 启动失败，请解决上述问题后重试")
        sys.exit(1)
    
    # 显示API端点
    show_api_endpoints()
    
    print("\n" + "=" * 50)
    print("🎉 服务器即将启动...")
    print("📍 访问地址: http://localhost:5000")
    print("🔗 健康检查: http://localhost:5000/api/health")
    print("📁 映射文件列表: http://localhost:5000/api/mapping-files")
    print("💡 按 Ctrl+C 停止服务")
    print("💡 坐标映射支持动态文件选择，无需重启服务")
    print("=" * 50)
    
    # 启动Flask应用
    try:
        app.run(host='0.0.0.0', port=5200, debug=False)
    except KeyboardInterrupt:
        print("\n👋 服务器已停止")
    except Exception as e:
        print(f"\n❌ 服务器启动失败: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main() 