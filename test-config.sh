#!/bin/bash

# 配置文件测试和验证脚本
# 使用方法: ./test-config.sh [config-file]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "================================================"
echo "  配置文件验证工具"
echo "================================================"
echo -e "${NC}"

CONFIG_FILE="${1:-deployment-config.json}"

# 检查配置文件
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}✗ 配置文件不存在: $CONFIG_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 找到配置文件: $CONFIG_FILE${NC}"
echo ""

# 检查 jq
if ! command -v jq &> /dev/null; then
    echo -e "${RED}✗ 需要安装 jq 工具${NC}"
    exit 1
fi

echo -e "${BLUE}[1/5] 验证 JSON 语法...${NC}"
if jq empty "$CONFIG_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓ JSON 语法正确${NC}"
else
    echo -e "${RED}✗ JSON 语法错误${NC}"
    jq . "$CONFIG_FILE"
    exit 1
fi

echo ""
echo -e "${BLUE}[2/5] 读取配置参数...${NC}"

SERVER_HOST=$(jq -r '.server.host' "$CONFIG_FILE")
PROJECT_PATH=$(jq -r '.server.project_path' "$CONFIG_FILE")
BACKEND_PORT=$(jq -r '.backend.port' "$CONFIG_FILE")
FRONTEND_PORT=$(jq -r '.frontend.port' "$CONFIG_FILE")
LLM_API_URL=$(jq -r '.backend.llm.api_url' "$CONFIG_FILE")
NGINX_ENABLED=$(jq -r '.nginx.enabled' "$CONFIG_FILE")
DEPLOYMENT_TYPE=$(jq -r '.deployment.type' "$CONFIG_FILE")

echo "  服务器地址: $SERVER_HOST"
echo "  项目路径: $PROJECT_PATH"
echo "  后端端口: $BACKEND_PORT"
echo "  前端端口: $FRONTEND_PORT"
echo "  LLM API: $LLM_API_URL"
echo "  Nginx启用: $NGINX_ENABLED"
echo "  部署类型: $DEPLOYMENT_TYPE"

echo ""
echo -e "${BLUE}[3/5] 检查必填参数...${NC}"

ERRORS=0

if [ "$SERVER_HOST" = "null" ] || [ -z "$SERVER_HOST" ]; then
    echo -e "${RED}✗ server.host 未设置${NC}"
    ERRORS=$((ERRORS+1))
else
    echo -e "${GREEN}✓ server.host 已设置${NC}"
fi

if [ "$PROJECT_PATH" = "null" ] || [ -z "$PROJECT_PATH" ]; then
    echo -e "${RED}✗ server.project_path 未设置${NC}"
    ERRORS=$((ERRORS+1))
else
    echo -e "${GREEN}✓ server.project_path 已设置${NC}"
fi

if [ "$LLM_API_URL" = "null" ] || [ -z "$LLM_API_URL" ]; then
    echo -e "${RED}✗ backend.llm.api_url 未设置${NC}"
    ERRORS=$((ERRORS+1))
else
    echo -e "${GREEN}✓ backend.llm.api_url 已设置${NC}"
fi

echo ""
echo -e "${BLUE}[4/5] 检查端口冲突...${NC}"

if command -v lsof &> /dev/null; then
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠ 端口 $BACKEND_PORT (后端) 已被占用${NC}"
        lsof -i :$BACKEND_PORT
    else
        echo -e "${GREEN}✓ 端口 $BACKEND_PORT (后端) 可用${NC}"
    fi

    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠ 端口 $FRONTEND_PORT (前端) 已被占用${NC}"
        lsof -i :$FRONTEND_PORT
    else
        echo -e "${GREEN}✓ 端口 $FRONTEND_PORT (前端) 可用${NC}"
    fi

    if [ "$NGINX_ENABLED" = "true" ]; then
        NGINX_PORT=$(jq -r '.nginx.port' "$CONFIG_FILE")
        if lsof -Pi :$NGINX_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${YELLOW}⚠ 端口 $NGINX_PORT (Nginx) 已被占用${NC}"
            lsof -i :$NGINX_PORT
        else
            echo -e "${GREEN}✓ 端口 $NGINX_PORT (Nginx) 可用${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠ lsof 命令不可用，跳过端口检查${NC}"
fi

echo ""
echo -e "${BLUE}[5/5] 生成配置摘要...${NC}"

cat > config-summary.txt <<EOF
# LLM Chat System 配置摘要
# 生成时间: $(date)

## 服务器信息
服务器地址: $SERVER_HOST
项目路径: $PROJECT_PATH
部署类型: $DEPLOYMENT_TYPE

## 服务端口
后端: $BACKEND_PORT
前端: $FRONTEND_PORT
$([ "$NGINX_ENABLED" = "true" ] && echo "Nginx: $(jq -r '.nginx.port' "$CONFIG_FILE")")

## 访问地址
$(if [ "$NGINX_ENABLED" = "true" ]; then
    echo "应用入口: http://$SERVER_HOST"
else
    echo "前端地址: http://$SERVER_HOST:$FRONTEND_PORT"
    echo "后端地址: http://$SERVER_HOST:$BACKEND_PORT"
fi)

## LLM 配置
API地址: $LLM_API_URL
模型: $(jq -r '.backend.llm.model' "$CONFIG_FILE")

## 下一步操作
1. 应用配置: ./apply-config.sh
2. 启动服务:
$(if [ "$DEPLOYMENT_TYPE" = "docker" ]; then
    echo "   cd deployment/docker && docker compose up -d"
else
    echo "   cd deployment/local && ./start.sh"
fi)
3. 查看日志:
$(if [ "$DEPLOYMENT_TYPE" = "docker" ]; then
    echo "   docker compose logs -f"
else
    echo "   tail -f logs/backend.log logs/frontend.log"
fi)

EOF

echo -e "${GREEN}✓ 配置摘要已保存到: config-summary.txt${NC}"

echo ""
echo "================================================"

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}✗ 发现 $ERRORS 个错误，请修改配置文件${NC}"
    exit 1
else
    echo -e "${GREEN}✓ 配置验证通过！${NC}"
    echo ""
    echo -e "${YELLOW}下一步:${NC}"
    echo "  1. 查看配置摘要: cat config-summary.txt"
    echo "  2. 应用配置: ./apply-config.sh"
    if [ "$DEPLOYMENT_TYPE" = "docker" ]; then
        echo "  3. 启动服务: cd deployment/docker && docker compose up -d"
    else
        echo "  3. 启动服务: cd deployment/local && ./start.sh"
    fi
fi

echo "================================================"
