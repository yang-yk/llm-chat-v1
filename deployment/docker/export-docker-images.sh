#!/bin/bash

# Docker镜像和构建缓存导出脚本
# 用于创建离线部署包

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OFFLINE_DIR="$SCRIPT_DIR/offline-packages"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Docker离线部署包导出工具${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查Docker是否可用
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到docker命令${NC}"
    exit 1
fi

# 检查docker compose是否可用
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到docker compose命令${NC}"
    exit 1
fi

# 创建离线包目录
mkdir -p "$OFFLINE_DIR"
echo -e "${GREEN}📁 离线包目录: $OFFLINE_DIR${NC}"
echo ""

# 定义镜像名称
BACKEND_IMAGE="llm-chat-backend"
FRONTEND_IMAGE="llm-chat-frontend"
NGINX_IMAGE="nginx:alpine"

# 1. 构建项目镜像
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}🔨 步骤1: 构建项目镜像${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

cd "$SCRIPT_DIR"

echo -e "${YELLOW}📦 构建后端镜像...${NC}"
docker compose build backend
echo -e "${GREEN}   ✓ 后端镜像构建完成${NC}"

echo -e "${YELLOW}📦 构建前端镜像...${NC}"
docker compose build frontend
echo -e "${GREEN}   ✓ 前端镜像构建完成${NC}"

echo -e "${YELLOW}📦 拉取Nginx基础镜像...${NC}"
docker pull $NGINX_IMAGE
echo -e "${GREEN}   ✓ Nginx镜像拉取完成${NC}"

# 2. 导出镜像
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}💾 步骤2: 导出Docker镜像${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 获取实际的镜像名称（可能带有docker-前缀）
BACKEND_IMAGE_FULL=$(docker images | grep "llm-chat-backend\|docker-backend" | awk '{print $1":"$2}' | head -1)
FRONTEND_IMAGE_FULL=$(docker images | grep "llm-chat-frontend\|docker-frontend" | awk '{print $1":"$2}' | head -1)

if [ -z "$BACKEND_IMAGE_FULL" ]; then
    echo -e "${RED}❌ 未找到后端镜像${NC}"
    exit 1
fi

if [ -z "$FRONTEND_IMAGE_FULL" ]; then
    echo -e "${RED}❌ 未找到前端镜像${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 导出后端镜像: $BACKEND_IMAGE_FULL${NC}"
docker save -o "$OFFLINE_DIR/backend-image.tar" "$BACKEND_IMAGE_FULL"
echo -e "${GREEN}   ✓ 后端镜像已导出: backend-image.tar${NC}"
SIZE=$(du -h "$OFFLINE_DIR/backend-image.tar" | cut -f1)
echo -e "${GREEN}   📦 大小: $SIZE${NC}"

echo -e "${YELLOW}📦 导出前端镜像: $FRONTEND_IMAGE_FULL${NC}"
docker save -o "$OFFLINE_DIR/frontend-image.tar" "$FRONTEND_IMAGE_FULL"
echo -e "${GREEN}   ✓ 前端镜像已导出: frontend-image.tar${NC}"
SIZE=$(du -h "$OFFLINE_DIR/frontend-image.tar" | cut -f1)
echo -e "${GREEN}   📦 大小: $SIZE${NC}"

echo -e "${YELLOW}📦 导出Nginx镜像: $NGINX_IMAGE${NC}"
docker save -o "$OFFLINE_DIR/nginx-image.tar" "$NGINX_IMAGE"
echo -e "${GREEN}   ✓ Nginx镜像已导出: nginx-image.tar${NC}"
SIZE=$(du -h "$OFFLINE_DIR/nginx-image.tar" | cut -f1)
echo -e "${GREEN}   📦 大小: $SIZE${NC}"

# 3. 保存构建缓存（可选，用于快速重新构建）
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}🗄️  步骤3: 保存构建缓存（可选）${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

echo -e "${YELLOW}这将保存Docker构建缓存，用于在目标机器上快速重新构建${NC}"
echo -e "${YELLOW}缓存文件可能会很大（1-3GB），是否保存构建缓存？(y/N)${NC}"
read -r SAVE_CACHE

if [[ "$SAVE_CACHE" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}📦 导出构建缓存...${NC}"

    # 创建临时构建器（支持缓存导出）
    BUILDER_NAME="llm-chat-cache-builder"

    # 检查构建器是否存在
    if docker buildx inspect $BUILDER_NAME &> /dev/null; then
        docker buildx rm $BUILDER_NAME || true
    fi

    docker buildx create --name $BUILDER_NAME --driver docker-container --use

    # 构建并导出缓存
    echo -e "${YELLOW}   - 后端构建缓存...${NC}"
    docker buildx build \
        --builder $BUILDER_NAME \
        --cache-to=type=local,dest="$OFFLINE_DIR/backend-cache" \
        --platform linux/amd64 \
        "$PROJECT_ROOT/backend" || true

    echo -e "${YELLOW}   - 前端构建缓存...${NC}"
    docker buildx build \
        --builder $BUILDER_NAME \
        --cache-to=type=local,dest="$OFFLINE_DIR/frontend-cache" \
        --platform linux/amd64 \
        --build-arg NEXT_PUBLIC_API_URL=http://127.0.0.1 \
        "$PROJECT_ROOT/frontend" || true

    # 删除临时构建器
    docker buildx rm $BUILDER_NAME

    # 压缩缓存
    if [ -d "$OFFLINE_DIR/backend-cache" ]; then
        echo -e "${YELLOW}   - 压缩后端缓存...${NC}"
        tar -czf "$OFFLINE_DIR/backend-cache.tar.gz" -C "$OFFLINE_DIR" backend-cache
        rm -rf "$OFFLINE_DIR/backend-cache"
        SIZE=$(du -h "$OFFLINE_DIR/backend-cache.tar.gz" | cut -f1)
        echo -e "${GREEN}   ✓ 后端缓存已保存: $SIZE${NC}"
    fi

    if [ -d "$OFFLINE_DIR/frontend-cache" ]; then
        echo -e "${YELLOW}   - 压缩前端缓存...${NC}"
        tar -czf "$OFFLINE_DIR/frontend-cache.tar.gz" -C "$OFFLINE_DIR" frontend-cache
        rm -rf "$OFFLINE_DIR/frontend-cache"
        SIZE=$(du -h "$OFFLINE_DIR/frontend-cache.tar.gz" | cut -f1)
        echo -e "${GREEN}   ✓ 前端缓存已保存: $SIZE${NC}"
    fi

    echo -e "${GREEN}✅ 构建缓存已保存${NC}"
else
    echo -e "${YELLOW}⊘ 跳过构建缓存保存${NC}"
fi

# 4. 保存镜像信息
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}📝 步骤4: 保存镜像信息${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

cat > "$OFFLINE_DIR/images-info.txt" << EOF
# Docker镜像信息
导出时间: $(date)
导出机器: $(uname -a)

## 镜像列表
1. 后端镜像: $BACKEND_IMAGE_FULL
   文件: backend-image.tar

2. 前端镜像: $FRONTEND_IMAGE_FULL
   文件: frontend-image.tar

3. Nginx镜像: $NGINX_IMAGE
   文件: nginx-image.tar

## 构建缓存（如果有）
- backend-cache.tar.gz: 后端构建缓存
- frontend-cache.tar.gz: 前端构建缓存

## 文件清单
EOF

ls -lh "$OFFLINE_DIR" >> "$OFFLINE_DIR/images-info.txt"

echo -e "${GREEN}   ✓ 镜像信息已保存: images-info.txt${NC}"

# 5. 生成SHA256校验文件
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}🔍 步骤5: 生成校验和${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

cd "$OFFLINE_DIR"
sha256sum *.tar > checksums.sha256 2>/dev/null || true
if [ -f "backend-cache.tar.gz" ]; then
    sha256sum backend-cache.tar.gz >> checksums.sha256
fi
if [ -f "frontend-cache.tar.gz" ]; then
    sha256sum frontend-cache.tar.gz >> checksums.sha256
fi

echo -e "${GREEN}   ✓ 校验和已生成: checksums.sha256${NC}"

# 6. 复制必要的配置文件
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}📋 步骤6: 复制配置文件${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 复制docker-compose.yml
cp "$SCRIPT_DIR/docker-compose.yml" "$OFFLINE_DIR/docker-compose.yml"
echo -e "${GREEN}   ✓ docker-compose.yml${NC}"

# 复制.env示例（如果存在）
if [ -f "$SCRIPT_DIR/.env" ]; then
    cp "$SCRIPT_DIR/.env" "$OFFLINE_DIR/env.example"
    echo -e "${GREEN}   ✓ env.example${NC}"
fi

# 复制nginx配置
if [ -f "$PROJECT_ROOT/nginx/default.conf" ]; then
    mkdir -p "$OFFLINE_DIR/nginx"
    cp "$PROJECT_ROOT/nginx/default.conf" "$OFFLINE_DIR/nginx/default.conf"
    echo -e "${GREEN}   ✓ nginx/default.conf${NC}"
fi

# 7. 创建README
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}📝 步骤7: 创建说明文档${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

cat > "$OFFLINE_DIR/README.txt" << 'EOF'
# Docker离线部署包

## 包含内容
1. backend-image.tar - 后端Docker镜像
2. frontend-image.tar - 前端Docker镜像
3. nginx-image.tar - Nginx镜像
4. backend-cache.tar.gz - 后端构建缓存（可选）
5. frontend-cache.tar.gz - 前端构建缓存（可选）
6. docker-compose.yml - Docker编排文件
7. nginx/default.conf - Nginx配置文件
8. checksums.sha256 - 文件校验和
9. images-info.txt - 镜像详细信息

## 系统要求
- Docker 20.10+
- Docker Compose v2+
- Linux x86_64
- 至少4GB磁盘空间

## 离线安装步骤

### 1. 验证文件完整性（可选）
cd offline-packages
sha256sum -c checksums.sha256

### 2. 导入Docker镜像
docker load -i backend-image.tar
docker load -i frontend-image.tar
docker load -i nginx-image.tar

验证镜像已导入：
docker images

### 3. 准备配置文件

复制nginx配置（如果还没有）：
mkdir -p ../../nginx
cp nginx/default.conf ../../nginx/

准备.env文件（如果需要）：
cp env.example .env
# 编辑.env文件，设置必要的环境变量

### 4. 启动服务
docker compose up -d

### 5. 验证部署
docker compose ps
docker compose logs -f

访问：http://your-server-ip

### 6. 停止服务
docker compose down

## 使用构建缓存（可选）

如果包含构建缓存文件，可以在目标机器上快速重新构建：

### 1. 解压缓存
tar -xzf backend-cache.tar.gz
tar -xzf frontend-cache.tar.gz

### 2. 创建构建器
docker buildx create --name cache-builder --use

### 3. 使用缓存构建
# 后端
docker buildx build \
  --cache-from=type=local,src=./backend-cache \
  --load \
  -t llm-chat-backend \
  ../../backend

# 前端
docker buildx build \
  --cache-from=type=local,src=./frontend-cache \
  --load \
  -t llm-chat-frontend \
  --build-arg NEXT_PUBLIC_API_URL=http://your-ip \
  ../../frontend

### 4. 清理构建器
docker buildx rm cache-builder

## 自动化导入

可以使用提供的 import-docker-images.sh 脚本自动导入：

bash import-docker-images.sh

## 故障排除

Q: 导入镜像时报错？
A: 确保Docker版本兼容，镜像文件完整无损

Q: 服务无法启动？
A: 检查端口是否被占用（80, 3000, 8000）
   查看日志：docker compose logs

Q: 如何更新配置？
A: 修改docker-compose.yml或.env文件后，重启服务：
   docker compose down
   docker compose up -d

Q: 构建缓存无法使用？
A: 确保docker buildx已安装，尝试重新构建时不使用缓存

## 注意事项

1. 镜像文件是针对特定架构（通常是linux/amd64）构建的
2. 确保目标机器的Docker版本与构建机器兼容
3. 导入镜像前确保有足够的磁盘空间
4. 生产环境使用前，请修改默认的SECRET_KEY等敏感配置
5. 建议在目标机器上运行完整性检查

## 文件大小说明

- 后端镜像：约500MB-1GB
- 前端镜像：约500MB-1GB
- Nginx镜像：约40MB
- 构建缓存（可选）：约1-3GB

总计：约2-6GB（取决于是否包含构建缓存）
EOF

echo -e "${GREEN}   ✓ README.txt已创建${NC}"

# 8. 显示总结
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Docker离线部署包导出完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "📁 离线包位置: ${YELLOW}$OFFLINE_DIR${NC}"
echo ""
echo -e "📦 包含文件："
ls -lh "$OFFLINE_DIR" | grep -v "^total" | grep -v "^d"
echo ""

# 计算总大小
TOTAL_SIZE=$(du -sh "$OFFLINE_DIR" | cut -f1)
echo -e "💾 总大小: ${YELLOW}$TOTAL_SIZE${NC}"
echo ""
echo -e "${YELLOW}💡 下一步：${NC}"
echo -e "   1. 将 $OFFLINE_DIR 目录复制到目标机器"
echo -e "   2. 在目标机器上参考 README.txt 进行部署"
echo -e "   3. 或运行 import-docker-images.sh 自动导入"
echo ""
echo -e "${YELLOW}📝 提示：${NC}"
echo -e "   - 可以打包整个目录: tar -czf docker-offline-package.tar.gz offline-packages/"
echo -e "   - 传输到目标机器后解压: tar -xzf docker-offline-package.tar.gz"
echo ""
