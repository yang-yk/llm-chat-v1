#!/bin/bash

# Conda环境导出脚本
# 用于打包py38环境以便离线部署

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
OFFLINE_DIR="$SCRIPT_DIR/offline-packages"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Conda环境离线包导出工具${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查conda是否可用
if ! command -v conda &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到conda命令${NC}"
    exit 1
fi

# 检查py38环境是否存在
if ! conda env list | grep -q "^py38 "; then
    echo -e "${RED}❌ 错误: py38环境不存在${NC}"
    echo -e "${YELLOW}请先创建py38环境：conda create -n py38 python=3.8${NC}"
    exit 1
fi

# 创建离线包目录
mkdir -p "$OFFLINE_DIR"
echo -e "${GREEN}📁 离线包目录: $OFFLINE_DIR${NC}"
echo ""

# 1. 导出环境配置文件（可选，用于重新创建环境）
echo -e "${YELLOW}📝 步骤1: 导出环境配置文件...${NC}"
conda env export -n py38 --no-builds > "$OFFLINE_DIR/py38-environment.yml"
echo -e "${GREEN}   ✓ 已保存: py38-environment.yml${NC}"

# 2. 使用conda-pack打包环境
echo -e "${YELLOW}📦 步骤2: 打包conda环境（这可能需要几分钟）...${NC}"

# 检查conda-pack是否安装
if ! conda list -n base | grep -q "^conda-pack "; then
    echo -e "${YELLOW}   ⚠️  conda-pack未安装，正在安装...${NC}"
    conda install -n base -c conda-forge conda-pack -y
fi

# 打包环境
conda pack -n py38 -o "$OFFLINE_DIR/py38-env.tar.gz" --compress-level 9

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✓ 环境打包完成: py38-env.tar.gz${NC}"

    # 显示文件大小
    SIZE=$(du -h "$OFFLINE_DIR/py38-env.tar.gz" | cut -f1)
    echo -e "${GREEN}   📦 包大小: $SIZE${NC}"
else
    echo -e "${RED}   ❌ 打包失败${NC}"
    exit 1
fi

# 3. 生成SHA256校验文件
echo -e "${YELLOW}📝 步骤3: 生成校验和...${NC}"
cd "$OFFLINE_DIR"
sha256sum py38-env.tar.gz > py38-env.tar.gz.sha256
echo -e "${GREEN}   ✓ 校验和已生成${NC}"

# 4. 创建README
echo -e "${YELLOW}📝 步骤4: 创建说明文件...${NC}"
cat > "$OFFLINE_DIR/README.txt" << 'EOF'
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
EOF

echo -e "${GREEN}   ✓ README.txt已创建${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 离线包导出完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "📁 离线包位置: ${YELLOW}$OFFLINE_DIR${NC}"
echo ""
echo -e "📦 包含文件："
ls -lh "$OFFLINE_DIR"
echo ""
echo -e "${YELLOW}💡 下一步：${NC}"
echo -e "   1. 将 $OFFLINE_DIR 目录复制到目标机器"
echo -e "   2. 在目标机器上参考 README.txt 进行安装"
echo -e "   3. 或者运行 import-conda-env.sh 自动安装"
echo ""
