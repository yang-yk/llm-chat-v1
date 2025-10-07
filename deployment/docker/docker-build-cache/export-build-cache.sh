#!/bin/bash

# Docker 构建缓存导出脚本
# 用于导出 Docker 构建缓存，加速离线环境重新构建

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "  Docker 构建缓存导出工具"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 输出目录
CACHE_DIR="docker-build-cache"
mkdir -p "$CACHE_DIR"

echo -e "${BLUE}[步骤 1/5]${NC} 检查 Docker 环境..."

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    exit 1
fi

docker_version=$(docker --version)
echo "Docker 版本: $docker_version"
echo ""

echo -e "${BLUE}[步骤 2/5]${NC} 导出基础镜像..."

# 导出基础镜像（用于构建的基础镜像）
BASE_IMAGES=(
    "python:3.9-slim"
    "node:18-alpine"
    "nginx:alpine"
)

for image in "${BASE_IMAGES[@]}"; do
    echo "拉取并导出: $image"
    docker pull "$image" 2>/dev/null || echo "  镜像已存在"
done

# 导出基础镜像
echo "正在导出基础镜像..."
docker save "${BASE_IMAGES[@]}" -o "$CACHE_DIR/base-images.tar"
echo -e "${GREEN}✓${NC} 基础镜像导出完成: $CACHE_DIR/base-images.tar"
echo "  大小: $(du -h "$CACHE_DIR/base-images.tar" | cut -f1)"
echo ""

echo -e "${BLUE}[步骤 3/5]${NC} 导出构建缓存..."

# 构建并导出缓存
echo "构建后端镜像并创建缓存..."
docker build --tag llm-chat-backend-cache:latest ./backend

echo "构建前端镜像并创建缓存..."
docker build --tag llm-chat-frontend-cache:latest ./frontend

# 导出构建缓存镜像
echo "正在导出构建缓存镜像..."
docker save \
    llm-chat-backend-cache:latest \
    llm-chat-frontend-cache:latest \
    -o "$CACHE_DIR/build-cache.tar"

echo -e "${GREEN}✓${NC} 构建缓存导出完成: $CACHE_DIR/build-cache.tar"
echo "  大小: $(du -h "$CACHE_DIR/build-cache.tar" | cut -f1)"
echo ""

echo -e "${BLUE}[步骤 4/5]${NC} 导出 Python 依赖缓存..."

# 创建 Python 依赖缓存目录
mkdir -p "$CACHE_DIR/pip-cache"

# 导出 pip 缓存
echo "导出 pip 缓存..."
if [ -d "$HOME/.cache/pip" ]; then
    cp -r "$HOME/.cache/pip"/* "$CACHE_DIR/pip-cache/" 2>/dev/null || true
    echo -e "${GREEN}✓${NC} pip 缓存已复制"
else
    echo -e "${YELLOW}提示: 未找到 pip 缓存${NC}"
fi

# 使用 Docker 导出依赖
echo "使用 Docker 提取 Python 依赖..."
docker run --rm -v "$PWD/$CACHE_DIR/pip-cache:/cache" \
    python:3.9-slim bash -c "
    pip install --download /cache -r /dev/stdin <<'EOF'
fastapi==0.115.5
uvicorn==0.32.1
sqlalchemy==2.0.36
httpx==0.28.1
pydantic==2.10.3
python-dotenv==1.0.1
passlib[bcrypt]==1.7.4
bcrypt==4.0.1
python-jose[cryptography]==3.3.0
python-multipart==0.0.9
EOF
" 2>/dev/null || echo "  使用现有缓存"

pip_cache_size=$(du -sh "$CACHE_DIR/pip-cache" 2>/dev/null | cut -f1 || echo "0")
echo -e "${GREEN}✓${NC} Python 依赖缓存: $pip_cache_size"
echo ""

echo -e "${BLUE}[步骤 5/5]${NC} 导出 Node.js 依赖缓存..."

# 创建 npm 缓存目录
mkdir -p "$CACHE_DIR/npm-cache"

# 导出 npm 缓存
echo "导出 npm 缓存..."
if [ -d "$HOME/.npm" ]; then
    cp -r "$HOME/.npm"/* "$CACHE_DIR/npm-cache/" 2>/dev/null || true
    echo -e "${GREEN}✓${NC} npm 缓存已复制"
fi

# 从前端项目复制 node_modules 作为缓存
if [ -d "frontend/node_modules" ]; then
    echo "打包 node_modules..."
    tar czf "$CACHE_DIR/node_modules.tar.gz" -C frontend node_modules
    echo -e "${GREEN}✓${NC} node_modules 已打包: $(du -h "$CACHE_DIR/node_modules.tar.gz" | cut -f1)"
fi

npm_cache_size=$(du -sh "$CACHE_DIR/npm-cache" 2>/dev/null | cut -f1 || echo "0")
echo -e "${GREEN}✓${NC} npm 缓存: $npm_cache_size"
echo ""

# 生成缓存清单
echo -e "${BLUE}[完成]${NC} 生成缓存清单..."

cat > "$CACHE_DIR/cache-manifest.txt" <<EOF
Docker 构建缓存清单
==================

生成时间: $(date '+%Y-%m-%d %H:%M:%S')
生成位置: $(pwd)

包含文件:
---------
1. base-images.tar          - 基础镜像 (python:3.9-slim, node:18-alpine, nginx:alpine)
2. build-cache.tar          - 构建缓存镜像
3. pip-cache/               - Python pip 依赖缓存
4. npm-cache/               - Node.js npm 依赖缓存
5. node_modules.tar.gz      - 前端依赖包 (可选)

文件大小:
---------
$(ls -lh "$CACHE_DIR" | grep -v "^total" | grep -v "^d")

总大小: $(du -sh "$CACHE_DIR" | cut -f1)

使用方法:
---------
1. 将整个 docker-build-cache 目录复制到目标服务器
2. 在目标服务器上运行: bash import-build-cache.sh
3. 然后正常构建镜像，将使用缓存加速

注意事项:
---------
- 基础镜像缓存可以直接 docker load
- 构建缓存镜像在 docker build 时会自动使用
- pip/npm 缓存需要手动配置环境变量使用
- node_modules 可以直接解压到 frontend/ 目录

EOF

echo -e "${GREEN}✓${NC} 缓存清单已生成: $CACHE_DIR/cache-manifest.txt"
echo ""

# 创建快速导入脚本
cat > "$CACHE_DIR/import-build-cache.sh" <<'IMPORT_SCRIPT'
#!/bin/bash

# Docker 构建缓存导入脚本

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "  导入 Docker 构建缓存"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}[1/4]${NC} 导入基础镜像..."
if [ -f "$SCRIPT_DIR/base-images.tar" ]; then
    docker load -i "$SCRIPT_DIR/base-images.tar"
    echo -e "${GREEN}✓${NC} 基础镜像导入完成"
else
    echo "未找到 base-images.tar"
fi
echo ""

echo -e "${BLUE}[2/4]${NC} 导入构建缓存镜像..."
if [ -f "$SCRIPT_DIR/build-cache.tar" ]; then
    docker load -i "$SCRIPT_DIR/build-cache.tar"
    echo -e "${GREEN}✓${NC} 构建缓存镜像导入完成"
else
    echo "未找到 build-cache.tar"
fi
echo ""

echo -e "${BLUE}[3/4]${NC} 设置 pip 缓存..."
if [ -d "$SCRIPT_DIR/pip-cache" ]; then
    mkdir -p "$HOME/.cache/pip"
    cp -r "$SCRIPT_DIR/pip-cache"/* "$HOME/.cache/pip/" 2>/dev/null || true
    echo -e "${GREEN}✓${NC} pip 缓存已设置"
    echo "  位置: $HOME/.cache/pip"
else
    echo "未找到 pip-cache 目录"
fi
echo ""

echo -e "${BLUE}[4/4]${NC} 设置 npm 缓存..."
if [ -d "$SCRIPT_DIR/npm-cache" ]; then
    mkdir -p "$HOME/.npm"
    cp -r "$SCRIPT_DIR/npm-cache"/* "$HOME/.npm/" 2>/dev/null || true
    echo -e "${GREEN}✓${NC} npm 缓存已设置"
    echo "  位置: $HOME/.npm"
fi

# 解压 node_modules（可选）
if [ -f "$SCRIPT_DIR/node_modules.tar.gz" ]; then
    echo ""
    read -p "是否解压 node_modules 到 frontend 目录? [y/N]: " extract_nm
    if [[ $extract_nm =~ ^[Yy]$ ]]; then
        PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
        if [ -d "$PROJECT_DIR/frontend" ]; then
            tar xzf "$SCRIPT_DIR/node_modules.tar.gz" -C "$PROJECT_DIR/frontend/"
            echo -e "${GREEN}✓${NC} node_modules 已解压"
        else
            echo "未找到 frontend 目录"
        fi
    fi
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  缓存导入完成！${NC}"
echo "=========================================="
echo ""
echo "现在可以使用缓存加速构建："
echo "  docker compose build"
echo ""
IMPORT_SCRIPT

chmod +x "$CACHE_DIR/import-build-cache.sh"

# 显示完成信息
echo "=========================================="
echo -e "${GREEN}  缓存导出完成！${NC}"
echo "=========================================="
echo ""
echo "输出目录: $CACHE_DIR/"
echo "总大小: $(du -sh "$CACHE_DIR" | cut -f1)"
echo ""
echo "包含文件:"
ls -lh "$CACHE_DIR" | grep -v "^total" | grep -v "^d" | awk '{print "  " $9 " (" $5 ")"}'
echo ""
echo "使用方法:"
echo "  1. 复制整个 $CACHE_DIR 目录到目标服务器"
echo "  2. cd $CACHE_DIR && bash import-build-cache.sh"
echo "  3. 返回项目目录进行构建"
echo ""
echo -e "${YELLOW}提示:${NC}"
echo "  - 缓存可以显著加速离线环境的 Docker 构建"
echo "  - 基础镜像和构建缓存会自动使用"
echo "  - pip/npm 缓存需要先导入才能使用"
echo ""
