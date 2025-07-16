#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
API测试脚本
测试集成后的Flask服务的所有API端点
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:5000"

def test_health():
    """测试健康检查API"""
    print("🔍 测试健康检查API...")
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 健康检查成功: {data.get('message', '')}")
            if data.get('mapping_data_loaded'):
                print(f"   📊 映射数据已加载: {data.get('triangles_count', 0)} 个三角形")
            else:
                print("   ⚠️  映射数据未加载")
            return True
        else:
            print(f"❌ 健康检查失败: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 健康检查失败: {e}")
        return False

def test_coordinate_mapping():
    """测试坐标映射API"""
    print("\n🗺️  测试坐标映射API...")
    try:
        # 测试坐标（深圳大学附近）
        test_coords = [113.93644, 22.5352]
        
        data = {
            "coordinates": test_coords
        }
        
        response = requests.post(f"{BASE_URL}/api/coordinate", json=data)
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print(f"✅ 坐标映射成功:")
                print(f"   输入坐标: {result.get('original_coordinates')}")
                print(f"   映射坐标: {result.get('mapped_coordinates')}")
                print(f"   三角形索引: {result.get('triangle_index')}")
            else:
                print(f"⚠️  坐标映射失败: {result.get('message')}")
            return True
        else:
            print(f"❌ 坐标映射失败: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 坐标映射失败: {e}")
        return False

def test_file_management():
    """测试文件管理API"""
    print("\n📁 测试文件管理API...")
    
    # 生成测试文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    test_filename = f"test_file_{timestamp}.json"
    
    # 测试数据
    test_data = {
        "description": "API测试文件",
        "timestamp": timestamp,
        "data": {
            "coordinates": [113.93644, 22.5352],
            "mapped": [0.5, 0.5]
        }
    }
    
    try:
        # 1. 测试保存JSON文件
        print("   💾 测试保存JSON文件...")
        save_data = {
            "data": test_data,
            "filename": test_filename
        }
        
        response = requests.post(f"{BASE_URL}/api/save-json", json=save_data)
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print(f"   ✅ 文件保存成功: {result.get('filename')}")
            else:
                print(f"   ❌ 文件保存失败: {result.get('message')}")
                return False
        else:
            print(f"   ❌ 文件保存失败: HTTP {response.status_code}")
            return False
        
        # 2. 测试获取文件列表
        print("   📋 测试获取文件列表...")
        response = requests.get(f"{BASE_URL}/api/saved-files")
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                files = result.get('files', [])
                print(f"   ✅ 获取文件列表成功: {len(files)} 个文件")
                # 查找刚才创建的文件
                test_file_found = any(f['filename'] == test_filename for f in files)
                if test_file_found:
                    print(f"   ✅ 找到测试文件: {test_filename}")
                else:
                    print(f"   ⚠️  未找到测试文件: {test_filename}")
            else:
                print(f"   ❌ 获取文件列表失败: {result.get('message')}")
                return False
        else:
            print(f"   ❌ 获取文件列表失败: HTTP {response.status_code}")
            return False
        
        # 3. 测试下载文件
        print("   📥 测试下载文件...")
        response = requests.get(f"{BASE_URL}/api/download/{test_filename}")
        if response.status_code == 200:
            print(f"   ✅ 文件下载成功: {len(response.content)} 字节")
        else:
            print(f"   ❌ 文件下载失败: HTTP {response.status_code}")
            return False
        
        # 4. 测试删除文件
        print("   🗦️  测试删除文件...")
        response = requests.delete(f"{BASE_URL}/api/delete/{test_filename}")
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print(f"   ✅ 文件删除成功: {result.get('message')}")
            else:
                print(f"   ❌ 文件删除失败: {result.get('message')}")
                return False
        else:
            print(f"   ❌ 文件删除失败: HTTP {response.status_code}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ 文件管理测试失败: {e}")
        return False

def test_mapping_info():
    """测试映射信息API"""
    print("\n📊 测试映射信息API...")
    try:
        response = requests.get(f"{BASE_URL}/api/mapping-info")
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print(f"✅ 映射信息获取成功:")
                print(f"   三角形数量: {result.get('triangles_count', 0)}")
                print(f"   矩阵数量: {result.get('matrices_count', 0)}")
            else:
                print(f"⚠️  映射信息获取失败: {result.get('message')}")
            return True
        else:
            print(f"❌ 映射信息获取失败: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 映射信息获取失败: {e}")
        return False

def main():
    """主函数"""
    print("🧪 开始API测试...")
    print("=" * 50)
    
    # 等待服务器启动
    print("⏳ 等待服务器启动...")
    time.sleep(2)
    
    # 测试计数
    total_tests = 4
    passed_tests = 0
    
    # 运行测试
    if test_health():
        passed_tests += 1
    
    if test_coordinate_mapping():
        passed_tests += 1
    
    if test_file_management():
        passed_tests += 1
    
    if test_mapping_info():
        passed_tests += 1
    
    # 显示测试结果
    print("\n" + "=" * 50)
    print(f"🎯 测试结果: {passed_tests}/{total_tests} 个测试通过")
    
    if passed_tests == total_tests:
        print("🎉 所有测试通过！集成成功！")
    else:
        print("⚠️  部分测试失败，请检查服务器状态")
    
    print("=" * 50)

if __name__ == '__main__':
    main() 