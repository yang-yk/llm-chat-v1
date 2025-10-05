#!/bin/bash

# LLM Chat 在线部署脚本 v1.0
# 用于在有网络环境下快速部署 LLM Chat 系统

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "  LLM Chat 在线部署脚本 v1.0"
echo "=========================================="
echo ""

# 检查是否以 root 或 sudo 运行
if [[ $EUID -ne 0 ]] && ! sudo -n true 2>/dev/null; then
    echo -e "${YELLOW}提示: 某些操作可能需要 sudo 权限${NC}"
fi

# 步骤 1: 检查系统环境
echo -e "${BLUE}[步骤 1/8]${NC} 检查系统环境..."

# 检查操作系统
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "操作系统: $NAME $VERSION"
else
    echo -e "${RED}无法检测操作系统${NC}"
    exit 1
fi

# 检查磁盘空间（至少需要 5GB）
available_space=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$available_space" -lt 5 ]; then
    echo -e "${RED}错误: 磁盘空间不足，至少需要 5GB，当前可用: ${available_space}GB${NC}"
    exit 1
fi
echo "磁盘空间: ${available_space}GB 可用"

echo -e "${GREEN}✓${NC} 系统环境检查完成"
echo ""

# 步骤 2: 检查并安装 Docker
echo -e "${BLUE}[步骤 2/8]${NC} 检查 Docker..."

if ! command -v docker &> /dev/null; then
    echo "Docker 未安装，正在安装..."

    # 安装 Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh

    # 将当前用户添加到 docker 组
    sudo usermod -aG docker $USER

    # 启动 Docker
    sudo systemctl start docker
    sudo systemctl enable docker

    echo -e "${GREEN}✓${NC} Docker 安装完成"
else
    docker_version=$(docker --version)
    echo "Docker 已安装: $docker_version"
fi

# 检查 Docker Compose
if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose 未安装，正在安装..."

    # 安装 Docker Compose 插件
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin

    echo -e "${GREEN}✓${NC} Docker Compose 安装完成"
else
    if command -v docker compose &> /dev/null; then
        compose_version=$(docker compose version)
    else
        compose_version=$(docker-compose --version)
    fi
    echo "Docker Compose 已安装: $compose_version"
fi

echo -e "${GREEN}✓${NC} Docker 环境准备完成"
echo ""

# 步骤 3: 获取配置信息
echo -e "${BLUE}[步骤 3/8]${NC} 配置部署参数..."
echo ""

# 获取服务器地址
while true; do
    read -p "请输入服务器 IP 地址或域名（用户访问地址）: " SERVER_IP
    if [ -n "$SERVER_IP" ]; then
        break
    fi
    echo -e "${RED}服务器地址不能为空${NC}"
done

# 获取端口配置
read -p "Nginx 端口 [默认 80]: " NGINX_PORT
NGINX_PORT=${NGINX_PORT:-80}

read -p "前端端口 [默认 3000]: " FRONTEND_PORT
FRONTEND_PORT=${FRONTEND_PORT:-3000}

read -p "后端端口 [默认 8000]: " BACKEND_PORT
BACKEND_PORT=${BACKEND_PORT:-8000}

# 获取部署目录
read -p "部署目录 [默认 /opt/llm-chat]: " DEPLOY_DIR
DEPLOY_DIR=${DEPLOY_DIR:-/opt/llm-chat}

# 获取 Git 仓库地址
read -p "Git 仓库地址 [留空则使用本地路径]: " GIT_REPO

# 获取模型配置
read -p "模型 API 地址 [默认 http://127.0.0.1:11553/v1/chat/completions]: " LLM_API_URL
LLM_API_URL=${LLM_API_URL:-http://127.0.0.1:11553/v1/chat/completions}

read -p "模型名称 [默认 glm4_32B_chat]: " MODEL_NAME
MODEL_NAME=${MODEL_NAME:-glm4_32B_chat}

read -p "模型 API Key [默认 glm432b]: " API_KEY
API_KEY=${API_KEY:-glm432b}

# 获取管理员配置
read -p "管理员用户名 [默认 admin]: " ADMIN_USERNAME
ADMIN_USERNAME=${ADMIN_USERNAME:-admin}

read -p "管理员密码 [默认 Admin@2025]: " ADMIN_PASSWORD
ADMIN_PASSWORD=${ADMIN_PASSWORD:-Admin@2025}

echo ""
echo "=========================================="
echo "配置确认:"
echo "=========================================="
echo "服务器地址: $SERVER_IP"
echo "Nginx 端口: $NGINX_PORT"
echo "前端端口: $FRONTEND_PORT"
echo "后端端口: $BACKEND_PORT"
echo "部署目录: $DEPLOY_DIR"
echo "模型 API: $LLM_API_URL"
echo "模型名称: $MODEL_NAME"
echo "管理员: $ADMIN_USERNAME"
echo "=========================================="
echo ""

read -p "确认配置并继续部署? [y/N]: " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "部署已取消"
    exit 0
fi

echo ""

# 步骤 4: 获取项目源码
echo -e "${BLUE}[步骤 4/8]${NC} 获取项目源码..."

# 创建部署目录
sudo mkdir -p "$DEPLOY_DIR"
sudo chown $USER:$USER "$DEPLOY_DIR"

if [ -n "$GIT_REPO" ]; then
    # 从 Git 克隆
    echo "从 Git 仓库克隆项目..."
    git clone "$GIT_REPO" "$DEPLOY_DIR"
else
    # 从当前脚本所在目录的上一级复制
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    SOURCE_DIR="$(dirname "$SCRIPT_DIR")/llm-chat-v1"

    if [ -d "$SOURCE_DIR" ]; then
        echo "从本地复制项目..."
        cp -r "$SOURCE_DIR"/* "$DEPLOY_DIR/"
    else
        echo -e "${RED}错误: 未找到项目源码${NC}"
        echo "请提供 Git 仓库地址或确保项目源码在正确位置"
        exit 1
    fi
fi

cd "$DEPLOY_DIR"

echo -e "${GREEN}✓${NC} 项目源码准备完成"
echo ""

# 步骤 5: 生成配置文件
echo -e "${BLUE}[步骤 5/8]${NC} 生成配置文件..."

# 生成随机密钥
SECRET_KEY=$(openssl rand -hex 32)

# 生成 docker-compose.yml
cat > docker-compose.yml <<EOF
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: llm-chat-backend
    network_mode: host
    environment:
      - LLM_API_URL=${LLM_API_URL}
      - MODEL_NAME=${MODEL_NAME}
      - API_KEY=${API_KEY}
      - PORT=${BACKEND_PORT}
      - SECRET_KEY=${SECRET_KEY}
    volumes:
      - ./backend/db:/app/db
      - ./backend/logs:/app/logs
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: llm-chat-frontend
    ports:
      - "${FRONTEND_PORT}:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://${SERVER_IP}:${BACKEND_PORT}
      - BACKEND_URL=http://172.17.0.1:${BACKEND_PORT}
    restart: unless-stopped
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    container_name: llm-chat-nginx
    network_mode: host
    volumes:
      - ./nginx:/etc/nginx/conf.d
    restart: unless-stopped
    depends_on:
      - frontend
      - backend
EOF

# 生成 nginx 配置
mkdir -p nginx
cat > nginx/default.conf <<EOF
server {
    listen ${NGINX_PORT};
    server_name _;

    client_max_body_size 50M;

    # API 请求转发到后端
    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # SSE 支持
        proxy_buffering off;
        proxy_read_timeout 300s;
    }

    # 前端请求
    location / {
        proxy_pass http://127.0.0.1:${FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# 生成前端环境变量
cat > frontend/.env.local <<EOF
NEXT_PUBLIC_API_URL=http://${SERVER_IP}:${BACKEND_PORT}
BACKEND_URL=http://172.17.0.1:${BACKEND_PORT}
EOF

echo -e "${GREEN}✓${NC} 配置文件生成完成"
echo ""

# 步骤 6: 构建和启动服务
echo -e "${BLUE}[步骤 6/8]${NC} 构建 Docker 镜像..."

docker compose build

echo -e "${GREEN}✓${NC} 镜像构建完成"
echo ""

echo -e "${BLUE}[步骤 7/8]${NC} 启动服务..."

docker compose up -d

# 等待服务启动
echo "等待服务启动..."
sleep 10

echo -e "${GREEN}✓${NC} 服务启动完成"
echo ""

# 步骤 8: 创建管理员账号
echo -e "${BLUE}[步骤 8/8]${NC} 创建管理员账号..."

# 等待后端完全启动
max_retries=30
retry_count=0
while [ $retry_count -lt $max_retries ]; do
    if docker compose exec -T backend python -c "from app.database import get_db; next(get_db())" 2>/dev/null; then
        break
    fi
    retry_count=$((retry_count + 1))
    echo "等待后端服务就绪... ($retry_count/$max_retries)"
    sleep 2
done

# 创建管理员账号
docker compose exec -T backend python -c "
from app.database import SessionLocal
from app.models import User
from app.auth import get_password_hash
import sys

db = SessionLocal()
try:
    # 检查管理员是否存在
    existing_admin = db.query(User).filter(User.username == '${ADMIN_USERNAME}').first()
    if existing_admin:
        print('管理员账号已存在')
        sys.exit(0)

    # 创建管理员
    admin_user = User(
        username='${ADMIN_USERNAME}',
        hashed_password=get_password_hash('${ADMIN_PASSWORD}'),
        is_admin=True
    )
    db.add(admin_user)
    db.commit()
    print('管理员账号创建成功')
except Exception as e:
    print(f'创建管理员失败: {e}')
    sys.exit(1)
finally:
    db.close()
"

echo -e "${GREEN}✓${NC} 管理员账号创建完成"
echo ""

# 保存部署信息
cat > deployment-info.txt <<EOF
========================================
LLM Chat 部署信息
========================================

部署时间: $(date '+%Y-%m-%d %H:%M:%S')

服务器配置:
-----------
服务器地址: ${SERVER_IP}
Nginx 端口: ${NGINX_PORT}
前端端口: ${FRONTEND_PORT}
后端端口: ${BACKEND_PORT}
部署目录: ${DEPLOY_DIR}

访问地址:
---------
主页: http://${SERVER_IP}:${NGINX_PORT}
管理后台: http://${SERVER_IP}:${NGINX_PORT}/admin

安全凭证:
---------
管理员用户名: ${ADMIN_USERNAME}
管理员密码: ${ADMIN_PASSWORD}
Secret Key: ${SECRET_KEY}

模型配置:
---------
API 地址: ${LLM_API_URL}
模型名称: ${MODEL_NAME}
API Key: ${API_KEY}

常用命令:
---------
查看服务状态: cd ${DEPLOY_DIR} && docker compose ps
查看日志: cd ${DEPLOY_DIR} && docker compose logs -f
重启服务: cd ${DEPLOY_DIR} && docker compose restart
停止服务: cd ${DEPLOY_DIR} && docker compose down
启动服务: cd ${DEPLOY_DIR} && docker compose up -d

备份数据库:
-----------
docker compose exec backend cp /app/db/conversation.db /tmp/backup.db
docker compose cp backend:/tmp/backup.db ./backup-\$(date +%Y%m%d).db

========================================
EOF

# 显示部署完成信息
echo "=========================================="
echo -e "${GREEN}  部署完成！${NC}"
echo "=========================================="
echo ""
echo "访问信息:"
echo "  主页: http://${SERVER_IP}:${NGINX_PORT}"
echo "  管理后台: http://${SERVER_IP}:${NGINX_PORT}/admin"
echo ""
echo "管理员账号:"
echo "  用户名: ${ADMIN_USERNAME}"
echo "  密码: ${ADMIN_PASSWORD}"
echo ""
echo "部署目录: ${DEPLOY_DIR}"
echo "部署信息已保存到: ${DEPLOY_DIR}/deployment-info.txt"
echo ""
echo -e "${YELLOW}安全提醒:${NC}"
echo "  - 首次登录后请立即修改管理员密码"
echo "  - 生产环境建议配置 HTTPS"
echo "  - 定期备份数据库"
echo ""
echo "查看服务状态:"
echo "  cd ${DEPLOY_DIR} && docker compose ps"
echo ""
