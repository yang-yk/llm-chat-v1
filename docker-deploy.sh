#!/bin/bash

# Docker 部署脚本

set -e

echo "========================================="
echo "  LLM Chat System Docker 部署脚本"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "错误: 未检测到 Docker，请先安装 Docker"
    echo "安装指南: https://docs.docker.com/engine/install/"
    exit 1
fi

# 检查 docker-compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "错误: 未检测到 docker-compose，请先安装"
    echo "安装指南: https://docs.docker.com/compose/install/"
    exit 1
fi

# 生成 SECRET_KEY
echo -e "${GREEN}生成 JWT SECRET_KEY...${NC}"
SECRET_KEY=$(openssl rand -hex 32)

# 创建 .env 文件
cat > .env <<EOF
SECRET_KEY=$SECRET_KEY
EOF

echo -e "${GREEN}配置文件已创建${NC}"
echo ""

# 询问是否构建镜像
echo -e "${YELLOW}是否重新构建 Docker 镜像? [Y/n]:${NC}"
read -p "" BUILD
BUILD=${BUILD:-Y}

if [[ $BUILD =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}构建 Docker 镜像...${NC}"
    docker-compose build
fi

# 启动服务
echo ""
echo -e "${GREEN}启动 Docker 容器...${NC}"
docker-compose up -d

# 等待服务启动
echo ""
echo -e "${GREEN}等待服务启动...${NC}"
sleep 5

# 检查服务状态
echo ""
echo -e "${GREEN}服务状态:${NC}"
docker-compose ps

echo ""
echo "========================================="
echo "  部署完成!"
echo "========================================="
echo ""
echo "访问地址:"
echo "  前端: http://localhost:3000"
echo "  后端: http://localhost:8000/docs"
echo ""
echo "常用命令:"
echo "  查看日志: docker-compose logs -f"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart"
echo "  查看状态: docker-compose ps"
echo ""
