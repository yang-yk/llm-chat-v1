#!/bin/bash

# LLM Chat System 一键启动脚本
# 自动启动后端和前端服务

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# 日志文件
LOG_DIR="$PROJECT_ROOT/logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

# 创建日志目录
mkdir -p "$LOG_DIR"

# PID文件
BACKEND_PID_FILE="$LOG_DIR/backend.pid"
FRONTEND_PID_FILE="$LOG_DIR/frontend.pid"

echo -e "${BLUE}"
echo "================================================"
echo "   🤖 LLM Chat System - 启动脚本"
echo "================================================"
echo -e "${NC}"

# 检查Python
check_python() {
    echo -e "${YELLOW}📋 检查Python环境...${NC}"
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ 未找到Python3，请先安装Python 3.8+${NC}"
        exit 1
    fi
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    echo -e "${GREEN}✅ Python版本: $PYTHON_VERSION${NC}"
}

# 检查Node
check_node() {
    echo -e "${YELLOW}📋 检查Node.js环境...${NC}"
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ 未找到Node.js，请先安装Node.js 18+${NC}"
        exit 1
    fi
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js版本: $NODE_VERSION${NC}"
}

# 安装后端依赖
install_backend_deps() {
    echo -e "${YELLOW}📦 检查后端依赖...${NC}"
    cd "$BACKEND_DIR"

    if [ ! -f "requirements.txt" ]; then
        echo -e "${RED}❌ 未找到requirements.txt${NC}"
        exit 1
    fi

    # 检查是否需要安装
    if ! python3 -c "import fastapi" &> /dev/null; then
        echo -e "${YELLOW}📥 安装后端依赖...${NC}"
        pip3 install -r requirements.txt
        echo -e "${GREEN}✅ 后端依赖安装完成${NC}"
    else
        echo -e "${GREEN}✅ 后端依赖已安装${NC}"
    fi
}

# 安装前端依赖
install_frontend_deps() {
    echo -e "${YELLOW}📦 检查前端依赖...${NC}"
    cd "$FRONTEND_DIR"

    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ 未找到package.json${NC}"
        exit 1
    fi

    # 检查是否需要安装
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📥 安装前端依赖（可能需要几分钟）...${NC}"
        npm install
        echo -e "${GREEN}✅ 前端依赖安装完成${NC}"
    else
        echo -e "${GREEN}✅ 前端依赖已安装${NC}"
    fi
}

# 检查数据库权限
check_database() {
    echo -e "${YELLOW}🗄️  检查数据库权限...${NC}"

    # 检查根目录的 conversation.db
    if [ -f "$PROJECT_ROOT/conversation.db" ]; then
        if [ ! -w "$PROJECT_ROOT/conversation.db" ]; then
            echo -e "${YELLOW}⚠️  修复数据库文件权限...${NC}"
            chmod 664 "$PROJECT_ROOT/conversation.db" 2>/dev/null || true
        fi
        echo -e "${GREEN}✅ 数据库权限正常${NC}"
    fi

    # 确保项目根目录可写
    if [ ! -w "$PROJECT_ROOT" ]; then
        echo -e "${RED}❌ 项目根目录不可写，可能影响数据库创建${NC}"
    fi
}

# 启动后端
start_backend() {
    echo -e "${YELLOW}🚀 启动后端服务...${NC}"
    cd "$BACKEND_DIR"

    # 检查端口是否被占用
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  端口8000已被占用，尝试关闭现有进程...${NC}"
        lsof -ti:8000 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi

    # 检查uvicorn是否可用
    if ! python3 -c "import uvicorn" &> /dev/null; then
        echo -e "${RED}❌ uvicorn未安装，请运行: pip install -r requirements.txt${NC}"
        exit 1
    fi

    # 启动后端（使用uvicorn）
    nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 > "$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$BACKEND_PID_FILE"

    echo -e "${GREEN}✅ 后端服务已启动 (PID: $BACKEND_PID)${NC}"
    echo -e "${BLUE}   访问地址: http://localhost:8000${NC}"
    echo -e "${BLUE}   API文档: http://localhost:8000/docs${NC}"
    echo -e "${BLUE}   日志文件: $BACKEND_LOG${NC}"

    # 等待后端启动
    echo -e "${YELLOW}⏳ 等待后端服务启动...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 后端服务已就绪${NC}"
            return 0
        fi
        sleep 1
    done

    echo -e "${RED}❌ 后端服务启动超时，请查看日志: $BACKEND_LOG${NC}"
    tail -20 "$BACKEND_LOG"
    return 1
}

# 启动前端
start_frontend() {
    echo -e "${YELLOW}🚀 启动前端服务...${NC}"
    cd "$FRONTEND_DIR"

    # 检查端口是否被占用
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  端口3000已被占用，尝试关闭现有进程...${NC}"
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi

    # 启动前端
    nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$FRONTEND_PID_FILE"

    echo -e "${GREEN}✅ 前端服务已启动 (PID: $FRONTEND_PID)${NC}"
    echo -e "${BLUE}   访问地址: http://localhost:3000${NC}"
    echo -e "${BLUE}   日志文件: $FRONTEND_LOG${NC}"

    # 等待前端启动
    echo -e "${YELLOW}⏳ 等待前端服务启动（可能需要10-20秒）...${NC}"
    for i in {1..60}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 前端服务已就绪${NC}"
            return 0
        fi
        sleep 1
    done

    echo -e "${YELLOW}⚠️  前端服务启动较慢，但进程已在后台运行${NC}"
    return 0
}

# 主函数
main() {
    # 检查环境
    check_python
    check_node

    echo ""

    # 安装依赖
    install_backend_deps
    echo ""
    install_frontend_deps

    echo ""

    # 检查数据库
    check_database

    echo ""
    echo -e "${BLUE}================================================${NC}"

    # 启动服务
    start_backend
    echo ""
    start_frontend

    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${GREEN}🎉 启动完成！${NC}"
    echo ""
    echo -e "${BLUE}📱 访问应用:${NC}"
    echo -e "   前端界面: ${GREEN}http://localhost:3000${NC}"
    echo -e "   后端API:  ${GREEN}http://localhost:8000/docs${NC}"
    echo ""
    echo -e "${BLUE}📋 查看日志:${NC}"
    echo -e "   后端日志: tail -f $BACKEND_LOG"
    echo -e "   前端日志: tail -f $FRONTEND_LOG"
    echo ""
    echo -e "${BLUE}🛑 停止服务:${NC}"
    echo -e "   运行: ./stop.sh"
    echo -e "   或手动: kill \$(cat $BACKEND_PID_FILE) \$(cat $FRONTEND_PID_FILE)"
    echo ""
    echo -e "${YELLOW}💡 提示: 服务已在后台运行，关闭终端不会停止服务${NC}"
    echo -e "${BLUE}================================================${NC}"
}

# 运行主函数
main
