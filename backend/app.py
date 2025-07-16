from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import logging
import numpy as np
import json
import os
from datetime import datetime
from utils import (
    get_coordinate_data, 
    triangulate_coords, 
    generate_triangle_lists, 
    calculate_all_affine_matrices, 
    find_triangle_containing_point
)

# 创建Flask应用
app = Flask(__name__)
CORS(app)  # 启用CORS，允许前端跨域请求

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 确保存储目录存在
STORAGE_DIR = os.path.join(os.path.dirname(__file__), 'saved-data')
if not os.path.exists(STORAGE_DIR):
    os.makedirs(STORAGE_DIR, exist_ok=True)

def process_mapping_data(json_file_path):
    """
    处理坐标映射数据，实时计算仿射变换矩阵
    
    Args:
        json_file_path (str): JSON文件路径
        
    Returns:
        tuple: (triangulation, affine_matrices, coords_triangles, xy_triangles) 或 None
    """
    try:
        # 检查数据文件是否存在
        if not os.path.exists(json_file_path):
            logger.warning(f"坐标映射数据文件不存在: {json_file_path}")
            return None
        
        # 获取坐标数据
        coords, xy = get_coordinate_data(json_file_path)
        logger.info(f"加载了 {len(coords)} 个坐标点")
        
        # 进行三角剖分
        triangulation = triangulate_coords(coords)
        logger.info(f"生成了 {len(triangulation.simplices)} 个三角形")
        
        # 生成三角形列表
        coords_triangles, xy_triangles = generate_triangle_lists(coords, xy, triangulation)
        
        # 实时计算仿射变换矩阵
        logger.info("实时计算仿射变换矩阵...")
        affine_matrices = calculate_all_affine_matrices(coords_triangles, xy_triangles)
        
        logger.info(f"成功计算了 {len(affine_matrices)} 个仿射变换矩阵")
        return triangulation, affine_matrices, coords_triangles, xy_triangles
        
    except Exception as e:
        logger.error(f"处理映射数据失败: {str(e)}")
        return None

def apply_affine_transformation(point, affine_matrix):
    """
    应用仿射变换到指定点
    
    Args:
        point (list): 输入点坐标 [x, y]
        affine_matrix (numpy.ndarray): 3x3仿射变换矩阵
        
    Returns:
        list: 变换后的坐标 [x', y']
    """
    # 转换为齐次坐标
    homogeneous_point = np.array([point[0], point[1], 1], dtype=np.float64)
    
    # 应用仿射变换
    transformed_point = np.dot(affine_matrix, homogeneous_point)
    
    # 确保返回的坐标是Python原生类型，避免JSON序列化问题
    x = float(transformed_point[0])
    y = float(transformed_point[1])
    
    return [x, y]

@app.route('/api/mapping-files', methods=['GET'])
def get_mapping_files():
    """
    获取可用的坐标映射JSON文件列表
    """
    try:
        files = []
        
        # 遍历saved-data目录中的JSON文件
        for filename in os.listdir(STORAGE_DIR):
            if filename.endswith('.json'):
                file_path = os.path.join(STORAGE_DIR, filename)
                stats = os.stat(file_path)
                
                files.append({
                    'filename': filename,
                    'size': stats.st_size,
                    'createdAt': datetime.fromtimestamp(stats.st_mtime).isoformat()
                })
        
        # 按创建时间排序（最新的在前）
        files.sort(key=lambda x: x['createdAt'], reverse=True)
        
        return jsonify({
            'success': True,
            'files': files
        })
        
    except Exception as e:
        logger.error(f"获取映射文件列表失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'获取映射文件列表失败：{str(e)}'
        }), 500

@app.route('/api/coordinate', methods=['POST'])
def coordinate_mapping():
    """
    坐标映射API接口
    接收前端发送的坐标和选择的JSON文件名，返回映射后的坐标
    """
    try:
        # 获取请求数据
        data = request.get_json()
        logger.info(f"接收到请求数据: {data}")
        
        if not data or 'coordinates' not in data:
            return jsonify({'error': '缺少坐标数据'}), 400
        
        coordinates = data['coordinates']
        json_filename = data.get('jsonFile', '')
        
        if not json_filename:
            return jsonify({'error': '请选择坐标映射JSON文件'}), 400
        
        logger.info(f"接收到坐标: {coordinates}, 使用文件: {json_filename}")
        
        # 提取经纬度
        if len(coordinates) != 2:
            return jsonify({'error': '坐标格式错误，需要[lng, lat]格式'}), 400
        
        lng, lat = coordinates
        
        # 构建文件路径
        json_file_path = os.path.join(STORAGE_DIR, json_filename)
        
        # 处理映射数据
        mapping_result = process_mapping_data(json_file_path)
        
        if mapping_result is None:
            return jsonify({
                'success': False,
                'error': '映射数据处理失败，请检查选择的JSON文件',
                'mapped_coordinates': [-1, -1]
            }), 500
        
        triangulation, affine_matrices, coords_triangles, xy_triangles = mapping_result
        
        # 查找包含该点的三角形
        triangle_index = find_triangle_containing_point(lng, lat, triangulation)
        
        if triangle_index == -1:
            # 没有找到对应的三角形
            logger.warning(f"坐标 {coordinates} 不在任何三角形内")
            response = {
                'success': False,
                'original_coordinates': coordinates,
                'mapped_coordinates': [-1, -1],
                'message': '坐标超出映射范围',
                'jsonFile': json_filename
            }
        else:
            # 找到对应的三角形，进行仿射变换
            affine_matrix = affine_matrices[triangle_index]
            mapped_coords = apply_affine_transformation(coordinates, affine_matrix)
            
            logger.info(f"坐标 {coordinates} 在第 {triangle_index + 1} 个三角形内")
            logger.info(f"映射结果: {mapped_coords}")
            
            response = {
                'success': True,
                'original_coordinates': coordinates,
                'mapped_coordinates': mapped_coords,
                'triangle_index': int(triangle_index),
                'message': '坐标映射成功',
                'jsonFile': json_filename
            }
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"坐标映射错误: {str(e)}")
        return jsonify({
            'success': False,
            'error': '服务器内部错误',
            'mapped_coordinates': [-1, -1]
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    status = {
        'status': 'healthy',
        'message': '服务正常运行',
        'storage_dir': STORAGE_DIR,
        'storage_dir_exists': os.path.exists(STORAGE_DIR)
    }
    
    return jsonify(status)

@app.route('/api/mapping-info', methods=['POST'])
def mapping_info():
    """
    获取特定JSON文件的映射信息接口
    """
    try:
        data = request.get_json()
        
        if not data or 'jsonFile' not in data:
            return jsonify({
                'success': False,
                'message': '请提供JSON文件名'
            }), 400
        
        json_filename = data['jsonFile']
        json_file_path = os.path.join(STORAGE_DIR, json_filename)
        
        # 处理映射数据
        mapping_result = process_mapping_data(json_file_path)
        
        if mapping_result is None:
            return jsonify({
                'success': False,
                'message': '映射数据处理失败'
            })
        
        triangulation, affine_matrices, coords_triangles, xy_triangles = mapping_result
        
        # 确保返回的数据是JSON可序列化的
        coords_sample = []
        xy_sample = []
        
        if coords_triangles:
            # 转换前2个样本为Python原生类型
            coords_sample = [
                [[float(coord[0]), float(coord[1])] for coord in triangle]
                for triangle in coords_triangles[:2]
            ]
        
        if xy_triangles:
            # 转换前2个样本为Python原生类型
            xy_sample = [
                [[float(coord[0]), float(coord[1])] for coord in triangle]
                for triangle in xy_triangles[:2]
            ]
        
        return jsonify({
            'success': True,
            'triangles_count': int(len(triangulation.simplices)),
            'matrices_count': int(len(affine_matrices)),
            'coords_triangles_sample': coords_sample,
            'xy_triangles_sample': xy_sample,
            'jsonFile': json_filename
        })
        
    except Exception as e:
        logger.error(f"获取映射信息失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'获取映射信息失败：{str(e)}'
        }), 500

# 文件管理相关的API端点
@app.route('/api/save-json', methods=['POST'])
def save_json():
    """
    保存JSON文件的API
    """
    try:
        data = request.get_json()
        
        if not data or 'data' not in data or 'filename' not in data:
            return jsonify({
                'success': False,
                'message': '数据和文件名不能为空'
            }), 400
        
        json_data = data['data']
        filename = data['filename']
        
        # 生成文件路径
        file_path = os.path.join(STORAGE_DIR, filename)
        
        # 写入文件
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"成功保存文件: {filename}")
        
        return jsonify({
            'success': True,
            'message': '文件保存成功',
            'filepath': file_path,
            'filename': filename
        })
        
    except Exception as e:
        logger.error(f"保存文件失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'保存文件失败：{str(e)}'
        }), 500

@app.route('/api/saved-files', methods=['GET'])
def get_saved_files():
    """
    获取已保存的文件列表
    """
    try:
        files = []
        
        for file in os.listdir(STORAGE_DIR):
            if file.endswith('.json'):
                file_path = os.path.join(STORAGE_DIR, file)
                stats = os.stat(file_path)
                
                files.append({
                    'filename': file,
                    'size': stats.st_size,
                    'createdAt': datetime.fromtimestamp(stats.st_mtime).isoformat()
                })
        
        # 按创建时间排序（最新的在前）
        files.sort(key=lambda x: x['createdAt'], reverse=True)
        
        return jsonify({
            'success': True,
            'files': files
        })
        
    except Exception as e:
        logger.error(f"获取文件列表失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'获取文件列表失败：{str(e)}'
        }), 500

@app.route('/api/download/<filename>', methods=['GET'])
def download_file(filename):
    """
    下载已保存的文件
    """
    try:
        file_path = os.path.join(STORAGE_DIR, filename)
        
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'message': '文件不存在'
            }), 404
        
        return send_file(file_path, as_attachment=True, download_name=filename)
        
    except Exception as e:
        logger.error(f"下载文件失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'下载文件失败：{str(e)}'
        }), 500

@app.route('/api/delete/<filename>', methods=['DELETE'])
def delete_file(filename):
    """
    删除已保存的文件
    """
    try:
        file_path = os.path.join(STORAGE_DIR, filename)
        
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'message': '文件不存在'
            }), 404
        
        os.unlink(file_path)
        logger.info(f"成功删除文件: {filename}")
        
        return jsonify({
            'success': True,
            'message': '文件删除成功'
        })
        
    except Exception as e:
        logger.error(f"删除文件失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'删除文件失败：{str(e)}'
        }), 500

if __name__ == '__main__':
    print("🚀 Flask服务器启动中...")
    print("📍 坐标映射API: http://localhost:5000/api/coordinate")
    print("🔍 健康检查: http://localhost:5000/api/health")
    print("📊 映射信息: http://localhost:5000/api/mapping-info")
    print("📁 映射文件列表: http://localhost:5000/api/mapping-files")
    print("💾 文件管理API:")
    print("  - 保存JSON: http://localhost:5000/api/save-json")
    print("  - 获取文件列表: http://localhost:5000/api/saved-files")
    print("  - 下载文件: http://localhost:5000/api/download/<filename>")
    print("  - 删除文件: http://localhost:5000/api/delete/<filename>")
    
    print("✅ 坐标映射服务已启动 (支持动态文件选择)")
    
    app.run(host='0.0.0.0', port=5000, debug=True) 