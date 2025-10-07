#!/bin/bash

# Conda环境离线导入脚本
# 用于在离线环境中安装py38环境

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
echo -e "${GREEN}  Conda环境离线安装工具${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查离线包目录是否存在
if [ ! -d "$OFFLINE_DIR" ]; then
    echo -e "${RED}❌ 错误: 离线包目录不存在: $OFFLINE_DIR${NC}"
    echo -e "${YELLOW}请先运行 export-conda-env.sh 导出环境包${NC}"
    exit 1
fi

# 检查环境包是否存在
if [ ! -f "$OFFLINE_DIR/py38-env.tar.gz" ]; then
    echo -e "${RED}❌ 错误: 环境包不存在: py38-env.tar.gz${NC}"
    exit 1
fi

# 设置默认安装路径
DEFAULT_INSTALL_PATH="$HOME/conda-envs/py38"
echo -e "${YELLOW}默认安装路径: $DEFAULT_INSTALL_PATH${NC}"
echo -e "${YELLOW}如需更改，请输入新路径（直接回车使用默认）：${NC}"
read -r CUSTOM_PATH

if [ -n "$CUSTOM_PATH" ]; then
    INSTALL_PATH="$CUSTOM_PATH"
else
    INSTALL_PATH="$DEFAULT_INSTALL_PATH"
fi

echo -e "${GREEN}📁 安装路径: $INSTALL_PATH${NC}"
echo ""

# 如果目录已存在，询问是否覆盖
if [ -d "$INSTALL_PATH" ]; then
    echo -e "${YELLOW}⚠️  目录已存在: $INSTALL_PATH${NC}"
    echo -e "${YELLOW}是否删除并重新安装？(y/N)${NC}"
    read -r CONFIRM
    if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
        rm -rf "$INSTALL_PATH"
        echo -e "${GREEN}   ✓ 已删除旧环境${NC}"
    else
        echo -e "${RED}❌ 安装已取消${NC}"
        exit 1
    fi
fi

# 1. 验证文件完整性（如果存在校验和文件）
if [ -f "$OFFLINE_DIR/py38-env.tar.gz.sha256" ]; then
    echo -e "${YELLOW}🔍 步骤1: 验证文件完整性...${NC}"
    cd "$OFFLINE_DIR"
    if sha256sum -c py38-env.tar.gz.sha256 &> /dev/null; then
        echo -e "${GREEN}   ✓ 文件完整性验证通过${NC}"
    else
        echo -e "${RED}   ❌ 文件完整性验证失败！${NC}"
        echo -e "${YELLOW}   ⚠️  文件可能已损坏，但继续安装...${NC}"
    fi
    cd - > /dev/null
else
    echo -e "${YELLOW}⚠️  未找到校验和文件，跳过完整性验证${NC}"
fi

# 2. 创建目标目录
echo -e "${YELLOW}📁 步骤2: 创建安装目录...${NC}"
mkdir -p "$INSTALL_PATH"
echo -e "${GREEN}   ✓ 目录已创建${NC}"

# 3. 解压环境
echo -e "${YELLOW}📦 步骤3: 解压环境（这可能需要几分钟）...${NC}"
tar -xzf "$OFFLINE_DIR/py38-env.tar.gz" -C "$INSTALL_PATH"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✓ 环境解压完成${NC}"
else
    echo -e "${RED}   ❌ 解压失败${NC}"
    exit 1
fi

# 4. 运行conda-unpack（修复路径）
echo -e "${YELLOW}🔧 步骤4: 修复环境路径...${NC}"

# 激活环境
source "$INSTALL_PATH/bin/activate"

# 检查conda-unpack是否可用
if command -v conda-unpack &> /dev/null; then
    conda-unpack
    echo -e "${GREEN}   ✓ 路径修复完成${NC}"
else
    echo -e "${YELLOW}   ⚠️  conda-unpack命令不可用${NC}"
    echo -e "${YELLOW}   尝试安装conda-pack...${NC}"

    # 尝试使用pip安装
    if "$INSTALL_PATH/bin/pip" install conda-pack &> /dev/null; then
        conda-unpack
        echo -e "${GREEN}   ✓ 路径修复完成${NC}"
    else
        echo -e "${YELLOW}   ⚠️  无法自动修复路径${NC}"
        echo -e "${YELLOW}   请在联网后手动运行: conda install conda-pack && conda-unpack${NC}"
    fi
fi

# 5. 验证安装
echo -e "${YELLOW}✅ 步骤5: 验证安装...${NC}"
PYTHON_VERSION=$("$INSTALL_PATH/bin/python" --version 2>&1)
echo -e "${GREEN}   ✓ Python版本: $PYTHON_VERSION${NC}"

# 6. 创建激活脚本
echo -e "${YELLOW}📝 步骤6: 创建激活脚本...${NC}"
ACTIVATE_SCRIPT="$SCRIPT_DIR/activate-py38.sh"
cat > "$ACTIVATE_SCRIPT" << EOF
#!/bin/bash
# 激活py38环境的快捷脚本

export PATH="$INSTALL_PATH/bin:\$PATH"
export CONDA_PREFIX="$INSTALL_PATH"
export CONDA_DEFAULT_ENV="py38"

echo "✅ py38环境已激活"
echo "Python: \$(python --version)"
echo ""
echo "使用方法："
echo "  source $ACTIVATE_SCRIPT  # 激活环境"
echo "  python your_script.py    # 运行Python脚本"
echo ""
EOF

chmod +x "$ACTIVATE_SCRIPT"
echo -e "${GREEN}   ✓ 激活脚本已创建: $ACTIVATE_SCRIPT${NC}"

# 7. 更新start.sh的引用路径
echo -e "${YELLOW}🔧 步骤7: 更新部署脚本...${NC}"
if [ -f "$SCRIPT_DIR/start.sh" ]; then
    # 在start.sh中添加离线环境检测
    echo -e "${GREEN}   ℹ️  start.sh会自动检测离线环境${NC}"
    echo -e "${GREEN}   ℹ️  如需使用，设置环境变量: export OFFLINE_CONDA_PATH=$INSTALL_PATH${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Conda环境安装完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "📁 安装位置: ${YELLOW}$INSTALL_PATH${NC}"
echo -e "🐍 Python版本: ${YELLOW}$PYTHON_VERSION${NC}"
echo ""
echo -e "${YELLOW}💡 使用方法：${NC}"
echo ""
echo -e "方法1: 使用激活脚本（推荐）"
echo -e "  ${GREEN}source $ACTIVATE_SCRIPT${NC}"
echo ""
echo -e "方法2: 直接使用Python路径"
echo -e "  ${GREEN}$INSTALL_PATH/bin/python your_script.py${NC}"
echo ""
echo -e "方法3: 在start.sh中使用"
echo -e "  ${GREEN}export OFFLINE_CONDA_PATH=$INSTALL_PATH${NC}"
echo -e "  ${GREEN}bash start.sh${NC}"
echo ""
echo -e "${YELLOW}📝 测试环境：${NC}"
echo -e "  ${GREEN}$INSTALL_PATH/bin/python --version${NC}"
echo -e "  ${GREEN}$INSTALL_PATH/bin/pip list${NC}"
echo ""
