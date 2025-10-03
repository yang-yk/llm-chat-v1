#!/bin/bash

# LLM Chat System 重启脚本
# 先停止服务，然后重新启动

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo -e "${BLUE}"
echo "================================================"
echo "   🔄 LLM Chat System - 重启脚本"
echo "================================================"
echo -e "${NC}"

# 停止服务
echo -e "${YELLOW}📍 步骤 1/2: 停止现有服务${NC}"
echo ""

if [ -f "$PROJECT_ROOT/stop.sh" ]; then
    bash "$PROJECT_ROOT/stop.sh"
else
    echo -e "${RED}❌ 未找到 stop.sh 脚本${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}⏳ 等待服务完全停止...${NC}"
sleep 3

# 启动服务
echo ""
echo -e "${YELLOW}📍 步骤 2/2: 启动服务${NC}"
echo ""

if [ -f "$PROJECT_ROOT/start.sh" ]; then
    bash "$PROJECT_ROOT/start.sh"
else
    echo -e "${RED}❌ 未找到 start.sh 脚本${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}🎉 重启完成！${NC}"
echo -e "${BLUE}================================================${NC}"
