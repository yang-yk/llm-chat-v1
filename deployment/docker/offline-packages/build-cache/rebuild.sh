#!/bin/bash

# Docker离线重新构建脚本
# 用于在修改代码后快速重新构建镜像

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 获取项目根目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
DOCKER_DIR="$SCRIPT_DIR/../.."
PROJECT_ROOT="$(cd "$DOCKER_DIR/../.." && pwd)"

echo -e "${BLUE}"
echo "========================================"
echo "  🔨 Docker离线重新构建工具"
echo "========================================"
echo -e "${NC}"
echo ""

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到Docker${NC}"
    exit 1
fi

# 检查是否在正确的目录
if [ ! -f "$PROJECT_ROOT/backend/main.py" ]; then
    echo -e "${RED}❌ 错误: 未找到项目文件${NC}"
    echo -e "${YELLOW}当前目录: $(pwd)${NC}"
    echo -e "${YELLOW}项目根目录: $PROJECT_ROOT${NC}"
    exit 1
fi

echo -e "${GREEN}📁 项目根目录: $PROJECT_ROOT${NC}"
echo ""

# 询问重新构建哪些服务
echo -e "${YELLOW}请选择要重新构建的服务：${NC}"
echo "  1) 后端 (backend)"
echo "  2) 前端 (frontend)"
echo "  3) 全部 (backend + frontend)"
echo "  4) 取消"
echo ""
read -p "请输入选项 (1-4): " CHOICE

case $CHOICE in
    1)
        REBUILD_BACKEND=true
        REBUILD_FRONTEND=false
        echo -e "${GREEN}将重新构建: 后端${NC}"
        ;;
    2)
        REBUILD_BACKEND=false
        REBUILD_FRONTEND=true
        echo -e "${GREEN}将重新构建: 前端${NC}"
        ;;
    3)
        REBUILD_BACKEND=true
        REBUILD_FRONTEND=true
        echo -e "${GREEN}将重新构建: 后端 + 前端${NC}"
        ;;
    4)
        echo -e "${YELLOW}已取消${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}无效选项${NC}"
        exit 1
        ;;
esac

echo ""

# 如果重新构建前端，询问API地址
if [ "$REBUILD_FRONTEND" = true ]; then
    echo -e "${YELLOW}前端需要配置API地址${NC}"
    read -p "请输入API地址 (默认: http://111.19.168.151): " API_URL
    API_URL=${API_URL:-http://111.19.168.151}
    echo -e "${GREEN}API地址: $API_URL${NC}"
    echo ""
fi

# 询问是否停止当前运行的服务
echo -e "${YELLOW}是否停止当前运行的服务? (y/N)${NC}"
read -r STOP_SERVICES

if [[ "$STOP_SERVICES" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏹️  停止服务...${NC}"
    cd "$DOCKER_DIR"
    docker compose down
    echo -e "${GREEN}   ✓ 服务已停止${NC}"
    echo ""
fi

# 开始构建
echo -e "${BLUE}"
echo "========================================"
echo "  🔨 开始重新构建"
echo "========================================"
echo -e "${NC}"
echo ""

cd "$PROJECT_ROOT"

# 重新构建后端
if [ "$REBUILD_BACKEND" = true ]; then
    echo -e "${YELLOW}📦 重新构建后端镜像...${NC}"
    echo ""

    START_TIME=$(date +%s)

    if docker build -t docker-backend:latest backend/; then
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        echo ""
        echo -e "${GREEN}✅ 后端镜像构建完成 (耗时: ${DURATION}秒)${NC}"

        # 显示镜像信息
        IMAGE_SIZE=$(docker images docker-backend:latest --format "{{.Size}}")
        echo -e "${GREEN}   📦 镜像大小: $IMAGE_SIZE${NC}"
    else
        echo ""
        echo -e "${RED}❌ 后端镜像构建失败${NC}"
        exit 1
    fi
    echo ""
fi

# 重新构建前端
if [ "$REBUILD_FRONTEND" = true ]; then
    echo -e "${YELLOW}📦 重新构建前端镜像...${NC}"
    echo ""

    START_TIME=$(date +%s)

    if docker build \
        --build-arg NEXT_PUBLIC_API_URL="$API_URL" \
        -t docker-frontend:latest \
        frontend/; then
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        echo ""
        echo -e "${GREEN}✅ 前端镜像构建完成 (耗时: ${DURATION}秒)${NC}"

        # 显示镜像信息
        IMAGE_SIZE=$(docker images docker-frontend:latest --format "{{.Size}}")
        echo -e "${GREEN}   📦 镜像大小: $IMAGE_SIZE${NC}"
    else
        echo ""
        echo -e "${RED}❌ 前端镜像构建失败${NC}"
        exit 1
    fi
    echo ""
fi

# 询问是否启动服务
echo -e "${BLUE}"
echo "========================================"
echo "  ✅ 构建完成"
echo "========================================"
echo -e "${NC}"
echo ""

echo -e "${YELLOW}是否启动服务? (Y/n)${NC}"
read -r START_SERVICES

if [[ ! "$START_SERVICES" =~ ^[Nn]$ ]]; then
    echo -e "${YELLOW}🚀 启动服务...${NC}"
    cd "$DOCKER_DIR"

    if docker compose up -d; then
        echo ""
        echo -e "${GREEN}✅ 服务启动成功${NC}"
        echo ""

        # 等待服务就绪
        echo -e "${YELLOW}等待服务就绪...${NC}"
        sleep 5

        # 显示服务状态
        echo ""
        echo -e "${GREEN}📊 服务状态：${NC}"
        docker compose ps

        echo ""
        echo -e "${GREEN}"
        echo "========================================"
        echo "  🎉 部署完成"
        echo "========================================"
        echo -e "${NC}"
        echo ""
        echo -e "🌐 访问地址: ${YELLOW}http://$(hostname -I | awk '{print $1}')${NC}"
        echo -e "🔧 管理后台: ${YELLOW}http://$(hostname -I | awk '{print $1}')/admin${NC}"
        echo ""
        echo -e "${YELLOW}💡 查看日志：${NC}"
        echo -e "   ${GREEN}docker compose -f $DOCKER_DIR/docker-compose.yml logs -f${NC}"
        echo ""
        echo -e "${YELLOW}💡 查看状态：${NC}"
        echo -e "   ${GREEN}docker compose -f $DOCKER_DIR/docker-compose.yml ps${NC}"
        echo ""
    else
        echo ""
        echo -e "${RED}❌ 服务启动失败${NC}"
        echo -e "${YELLOW}查看日志: docker compose -f $DOCKER_DIR/docker-compose.yml logs${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⊘ 跳过启动服务${NC}"
    echo ""
    echo -e "${YELLOW}手动启动命令：${NC}"
    echo -e "   ${GREEN}cd $DOCKER_DIR${NC}"
    echo -e "   ${GREEN}docker compose up -d${NC}"
    echo ""
fi

echo -e "${GREEN}✨ 完成！${NC}"
echo ""
