#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
新的API测试脚本
测试动态文件选择和实时仿射变换计算功能
"""

import requests
import json
import os
import time

BASE_URL = "http://localhost:5000"

def test_health_check():
    """测试健康检查API"""
    print("🔍 测试健康检查API...")
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 健康检查通过: {result}")
            return True
        else:
            print(f"❌ 健康检查失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 健康检查错误: {e}")
        return False

def test_mapping_files():
    """测试获取映射文件列表API"""
    print("\n📁 测试获取映射文件列表API...")
    try:
        response = requests.get(f"{BASE_URL}/api/mapping-files")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 获取文件列表成功: {result}")
            return result.get('files', [])
        else:
            print(f"❌ 获取文件列表失败: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ 获取文件列表错误: {e}")
        return []

def test_save_sample_data():
    """测试保存样本数据"""
    print("\n💾 测试保存样本数据...")
    
    # 创建样本映射数据
    sample_data = {
        "metadata": {
            "createdAt": "2025-01-13T10:00:00Z",
            "version": "1.0",
            "description": "测试样本数据",
            "totalPoints": 4
        },
        "mappings": [
            {
                "腾讯地图坐标": {"经度": 113.936, "纬度": 22.534},
                "手绘地图坐标": {"x": 0.2, "y": 0.3}
            },
            {
                "腾讯地图坐标": {"经度": 113.940, "纬度": 22.530},
                "手绘地图坐标": {"x": 0.8, "y": 0.2}
            },
            {
                "腾讯地图坐标": {"经度": 113.938, "纬度": 22.532},
                "手绘地图坐标": {"x": 0.5, "y": 0.7}
            },
            {
                "腾讯地图坐标": {"经度": 113.942, "纬度": 22.528},
                "手绘地图坐标": {"x": 0.9, "y": 0.8}
            }
        ]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/save-json", json={
            "data": sample_data,
            "filename": "test_sample_data.json"
        })
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 保存样本数据成功: {result}")
            return True
        else:
            print(f"❌ 保存样本数据失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 保存样本数据错误: {e}")
        return False

def test_coordinate_mapping(json_file, test_coordinates):
    """测试坐标映射API"""
    print(f"\n📍 测试坐标映射API (文件: {json_file})...")
    
    for i, coords in enumerate(test_coordinates):
        try:
            response = requests.post(f"{BASE_URL}/api/coordinate", json={
                "coordinates": coords,
                "jsonFile": json_file
            })
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ 测试点{i+1} {coords} 映射成功:")
                print(f"   原始坐标: {result.get('original_coordinates')}")
                print(f"   映射坐标: {result.get('mapped_coordinates')}")
                print(f"   三角形索引: {result.get('triangle_index')}")
                print(f"   状态: {result.get('message')}")
            else:
                print(f"❌ 测试点{i+1} {coords} 映射失败: {response.status_code}")
        except Exception as e:
            print(f"❌ 测试点{i+1} {coords} 映射错误: {e}")

def test_mapping_info(json_file):
    """测试映射信息API"""
    print(f"\n📊 测试映射信息API (文件: {json_file})...")
    
    try:
        response = requests.post(f"{BASE_URL}/api/mapping-info", json={
            "jsonFile": json_file
        })
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 获取映射信息成功:")
            print(f"   三角形数量: {result.get('triangles_count')}")
            print(f"   矩阵数量: {result.get('matrices_count')}")
            print(f"   使用文件: {result.get('jsonFile')}")
            print(f"   样本三角形: {result.get('coords_triangles_sample')}")
        else:
            print(f"❌ 获取映射信息失败: {response.status_code}")
    except Exception as e:
        print(f"❌ 获取映射信息错误: {e}")

def main():
    """主测试函数"""
    print("🚀 开始测试新的API功能...")
    
    # 1. 测试健康检查
    if not test_health_check():
        print("❌ 服务器可能未启动，请先启动Flask服务器")
        return
    
    # 2. 测试保存样本数据
    test_save_sample_data()
    
    # 等待一下让文件系统同步
    time.sleep(1)
    
    # 3. 测试获取文件列表
    files = test_mapping_files()
    
    if not files:
        print("⚠️ 没有找到可用的映射文件")
        return
    
    # 4. 选择第一个文件进行测试
    test_file = files[0]['filename']
    print(f"\n🎯 使用文件 {test_file} 进行测试...")
    
    # 5. 测试映射信息
    test_mapping_info(test_file)
    
    # 6. 测试坐标映射
    test_coordinates = [
        [113.936, 22.534],    # 应该在映射范围内
        [113.940, 22.530],    # 应该在映射范围内
        [113.938, 22.532],    # 应该在映射范围内
        [113.950, 22.520],    # 可能在映射范围外
    ]
    
    test_coordinate_mapping(test_file, test_coordinates)
    
    print("\n✅ 测试完成！")

if __name__ == "__main__":
    main() 