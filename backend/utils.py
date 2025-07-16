import numpy as np
import matplotlib.pyplot as plt
from scipy.spatial import Delaunay
import json


def convert_coordinates(json_file_path):
    """
    将坐标映射JSON文件转换为两个列表格式
    
    Args:
        json_file_path (str): JSON文件路径
        
    Returns:
        dict: 包含coords和xy两个列表的字典
    """
    with open(json_file_path, 'r', encoding='utf-8') as file:
        data = json.load(file)
    
    # 提取坐标数据
    coords = [[mapping['腾讯地图坐标']['经度'], mapping['腾讯地图坐标']['纬度']] 
              for mapping in data['mappings']]
    
    xy = [[mapping['手绘地图坐标']['x'], mapping['手绘地图坐标']['y']] 
          for mapping in data['mappings']]
    
    return {'coords': coords, 'xy': xy}

def get_coordinate_data(json_file_path):
    """
    获取坐标数据
    
    Args:
        json_file_path (str): JSON文件路径
        
    Returns:
        tuple: (coords列表, xy列表)
    """
    result = convert_coordinates(json_file_path)
    return result['coords'], result['xy']

def triangulate_coords(coords):
    """
    对坐标列表进行Delaunay三角剖分
    
    Args:
        coords (list): 坐标列表 [[lng, lat], ...]
        
    Returns:
        Delaunay: 三角剖分对象
    """
    points = np.array(coords)
    return Delaunay(points)

def generate_triangle_lists(coords, xy, triangulation):
    """
    根据三角剖分结果生成两组三角形列表
    
    Args:
        coords (list): 腾讯地图坐标列表
        xy (list): 手绘地图坐标列表
        triangulation (Delaunay): 三角剖分对象
        
    Returns:
        tuple: (coords三角形列表, xy三角形列表)
    """
    coords_triangles = []
    xy_triangles = []
    
    # 遍历每个三角形的顶点索引
    for triangle_indices in triangulation.simplices:
        # 根据索引获取coords中的三角形顶点
        coords_triangle = [coords[i] for i in triangle_indices]
        # 根据索引获取xy中的三角形顶点
        xy_triangle = [xy[i] for i in triangle_indices]
        
        coords_triangles.append(coords_triangle)
        xy_triangles.append(xy_triangle)
    
    return coords_triangles, xy_triangles

def calculate_affine_matrix(src_triangle, dst_triangle):
    """
    计算两个三角形之间的仿射变换矩阵
    
    Args:
        src_triangle (list): 源三角形顶点 [[x1, y1], [x2, y2], [x3, y3]]
        dst_triangle (list): 目标三角形顶点 [[x1, y1], [x2, y2], [x3, y3]]
        
    Returns:
        numpy.ndarray: 3x3仿射变换矩阵，高精度float64类型
    """
    # 转换为numpy数组，使用最高精度
    src = np.array(src_triangle, dtype=np.float64)
    dst = np.array(dst_triangle, dtype=np.float64)
    
    # 构造齐次坐标系的变换矩阵方程
    # 对于仿射变换：[x'] = [a b tx] [x]
    #                [y']   [c d ty] [y]
    #                [1 ]   [0 0 1 ] [1]
    
    # 构造系数矩阵A和结果向量b
    A = np.array([
        [src[0, 0], src[0, 1], 1, 0, 0, 0],
        [0, 0, 0, src[0, 0], src[0, 1], 1],
        [src[1, 0], src[1, 1], 1, 0, 0, 0],
        [0, 0, 0, src[1, 0], src[1, 1], 1],
        [src[2, 0], src[2, 1], 1, 0, 0, 0],
        [0, 0, 0, src[2, 0], src[2, 1], 1]
    ], dtype=np.float64)
    
    b = np.array([
        dst[0, 0], dst[0, 1],
        dst[1, 0], dst[1, 1],
        dst[2, 0], dst[2, 1]
    ], dtype=np.float64)
    
    # 求解线性方程组
    params = np.linalg.solve(A, b)
    
    # 构造3x3仿射变换矩阵
    affine_matrix = np.array([
        [params[0], params[1], params[2]],
        [params[3], params[4], params[5]],
        [0, 0, 1]
    ], dtype=np.float64)
    
    return affine_matrix

def calculate_all_affine_matrices(coords_triangles, xy_triangles):
    """
    计算所有三角形对应的仿射变换矩阵
    
    Args:
        coords_triangles (list): coords坐标系下的三角形列表
        xy_triangles (list): xy坐标系下的三角形列表
        
    Returns:
        list: 仿射变换矩阵列表，每个元素为3x3的numpy数组
    """
    if len(coords_triangles) != len(xy_triangles):
        raise ValueError("两组三角形数量不匹配")
    
    affine_matrices = []
    
    for i, (coords_tri, xy_tri) in enumerate(zip(coords_triangles, xy_triangles)):
        try:
            # 计算从coords坐标系到xy坐标系的仿射变换矩阵
            matrix = calculate_affine_matrix(coords_tri, xy_tri)
            affine_matrices.append(matrix)
        except np.linalg.LinAlgError as e:
            print(f"警告：第{i+1}个三角形的仿射变换矩阵计算失败: {e}")
            # 使用单位矩阵作为备用
            affine_matrices.append(np.eye(3, dtype=np.float64))
    
    return affine_matrices

def find_triangle_containing_point(lng, lat, triangulation):
    """
    查找包含指定经纬度坐标的三角形
    
    Args:
        lng (float): 经度
        lat (float): 纬度
        triangulation (Delaunay): 三角剖分对象
        
    Returns:
        int: 三角形索引（从0开始），如果不在任何三角形内返回-1
    """
    point = np.array([lng, lat])
    triangle_index = triangulation.find_simplex(point)
    print(triangle_index)   
    return triangle_index

def plot_triangulation_with_test_points(coords, triangulation, test_points):
    """
    绘制三角剖分结果和测试点
    
    Args:
        coords (list): 坐标列表
        triangulation (Delaunay): 三角剖分对象
        test_points (list): 测试点列表 [[lng, lat], ...]
    """
    # 设置中文字体
    plt.rcParams['font.sans-serif'] = ['SimHei']
    plt.rcParams['axes.unicode_minus'] = False
    
    # 创建图形
    fig, ax = plt.subplots(figsize=(12, 10))
    
    # 转换为numpy数组
    coords_array = np.array(coords)
    
    # 绘制所有三角形
    ax.triplot(coords_array[:, 0], coords_array[:, 1], triangulation.simplices, 
               'b-', alpha=0.4, linewidth=0.8, label='三角形网格')
    
    # 绘制原始点
    ax.scatter(coords_array[:, 0], coords_array[:, 1], c='blue', s=30, alpha=0.7, label='原始坐标点')
    
    # 测试每个点并绘制
    colors = ['red', 'green', 'orange', 'purple', 'brown']
    for i, (lng, lat) in enumerate(test_points):
        triangle_idx = find_triangle_containing_point(lng, lat, triangulation)
        color = colors[i % len(colors)]
        
        if triangle_idx != -1:
            # 点在三角形内，高亮显示该三角形
            triangle = triangulation.simplices[triangle_idx]
            triangle_coords = coords_array[triangle]
            
            # 绘制高亮三角形
            triangle_x = np.append(triangle_coords[:, 0], triangle_coords[0, 0])
            triangle_y = np.append(triangle_coords[:, 1], triangle_coords[0, 1])
            ax.fill(triangle_x, triangle_y, color=color, alpha=0.3, 
                   label=f'测试点{i+1}所在三角形')
            
            # 绘制测试点
            ax.scatter(lng, lat, c=color, s=100, marker='*', 
                      edgecolor='black', linewidth=1,
                      label=f'测试点{i+1} (在第{triangle_idx+1}个三角形内)')
        else:
            # 点在三角形外
            ax.scatter(lng, lat, c=color, s=100, marker='x', 
                      linewidth=3, label=f'测试点{i+1} (不在任何三角形内)')
    
    # 设置图形属性
    ax.set_xlabel('经度', fontsize=12)
    ax.set_ylabel('纬度', fontsize=12)
    ax.set_title('三角剖分结果与测试点可视化', fontsize=14, fontweight='bold')
    ax.legend(loc='upper right', fontsize=10)
    ax.grid(True, alpha=0.3)
    
    # 调整坐标轴比例
    ax.set_aspect('equal')
    
    plt.tight_layout()
    plt.show()

def main():
    """
    主函数：执行完整的坐标三角剖分流程
    """
    # 1. 获取坐标数据
    coords, xy = get_coordinate_data('坐标映射数据_2025-7-13.json')
    print(f"获取到 {len(coords)} 个坐标点")
    
    # 2. 进行三角剖分
    triangulation = triangulate_coords(coords)
    print(f"生成了 {len(triangulation.simplices)} 个三角形")
    
    # 3. 生成两组三角形列表
    coords_triangles, xy_triangles = generate_triangle_lists(coords, xy, triangulation)
    
    # 4. 计算每组三角形对应的仿射变换矩阵
    print("\n正在计算仿射变换矩阵...")
    affine_matrices = calculate_all_affine_matrices(coords_triangles, xy_triangles)
    print(f"成功计算了 {len(affine_matrices)} 个仿射变换矩阵")
    
    # 5. 输出结果示例
    print("\n前3个三角形示例:")
    for i in range(min(3, len(coords_triangles))):
        print(f"\n三角形 {i+1}:")
        print(f"  Coords坐标: {coords_triangles[i]}")
        print(f"  XY坐标: {xy_triangles[i]}")
        print(f"  仿射变换矩阵:")
        print(f"    {affine_matrices[i]}")
    
    # 6. 测试点查找功能
    print("\n=== 点查找测试 ===")
    test_points = [
        [113.936, 22.534],  # 测试点1
        [113.940, 22.530],  # 测试点2
        [113.920, 22.540],  # 测试点3（可能在边界外）
        [113.93644, 22.5352],  # 测试点4（接近已知点）
    ]
    
    for i, (lng, lat) in enumerate(test_points):
        triangle_idx = find_triangle_containing_point(lng, lat, triangulation)
        if triangle_idx != -1:
            print(f"测试点{i+1} ({lng}, {lat}) 在第 {triangle_idx + 1} 个三角形内")
            print(f"  该三角形的coords坐标: {coords_triangles[triangle_idx]}")
            print(f"  对应的仿射变换矩阵: \n{affine_matrices[triangle_idx]}")
        else:
            print(f"测试点{i+1} ({lng}, {lat}) 不在任何三角形内")
    
    # # 7. 绘制可视化图形
    # print("\n正在生成可视化图形...")
    # plot_triangulation_with_test_points(coords, triangulation, test_points)
    
    return coords_triangles, xy_triangles, triangulation, affine_matrices

if __name__ == "__main__":
    coords_triangles, xy_triangles, triangulation, affine_matrices = main() 