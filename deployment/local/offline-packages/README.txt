# Conda py38环境离线安装包

## 包含内容
1. py38-env.tar.gz - 完整的conda py38环境打包文件
2. py38-environment.yml - 环境配置文件（可选，用于重新创建）
3. py38-env.tar.gz.sha256 - 校验和文件

## 系统要求
- Linux x86_64
- 建议至少2GB磁盘空间

## 安装步骤

### 方法1: 使用打包好的环境（推荐）

1. 验证文件完整性（可选）：
   sha256sum -c py38-env.tar.gz.sha256

2. 创建目标目录：
   mkdir -p ~/conda-envs/py38

3. 解压环境：
   tar -xzf py38-env.tar.gz -C ~/conda-envs/py38

4. 激活环境：
   source ~/conda-envs/py38/bin/activate

5. 清理前缀（重要）：
   conda-unpack

   如果没有conda-unpack，可以手动修复：
   source ~/conda-envs/py38/bin/activate
   conda install conda-pack -y
   conda-unpack

6. 验证安装：
   python --version
   pip list

### 方法2: 从配置文件重新创建（需要网络）

如果打包文件损坏，可以使用配置文件重新创建：

conda env create -f py38-environment.yml

## 使用说明

在项目中使用此环境：

# 激活环境
source ~/conda-envs/py38/bin/activate

# 或者直接使用Python路径
~/conda-envs/py38/bin/python your_script.py

## 注意事项

1. 打包的环境是二进制文件，只能在相同或兼容的Linux系统上使用
2. 解压后第一次使用前必须运行 conda-unpack
3. 如果目标系统的路径不同，conda-unpack会自动修复路径
4. 建议在目标机器上验证Python和所有包都能正常工作

## 故障排除

Q: 解压后运行python报错找不到库？
A: 确保已经运行了 conda-unpack 命令

Q: conda-unpack命令不存在？
A: 激活环境后安装：pip install conda-pack 或 conda install conda-pack

Q: 环境太大无法传输？
A: 可以考虑只传输 py38-environment.yml，在目标机器上重新创建环境（需要网络）
