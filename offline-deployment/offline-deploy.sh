#!/bin/bash

# LLM Chat 离线部署脚本
# 用于在无网络环境下部署应用

set -e

echo "=========================================="
echo "  LLM Chat 离线部署脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ] && ! groups | grep -q docker; then
    echo -e "${YELLOW}警告: 当前用户不在 docker 组中，某些操作可能需要 sudo${NC}"
fi

# 步骤 1: 检查 Docker 是否已安装
echo -e "${GREEN}[步骤 1/6]${NC} 检查 Docker 环境..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装！${NC}"
    echo "请先安装 Docker，然后重新运行此脚本"
    echo "参考文档: OFFLINE_DEPLOYMENT_GUIDE.md 中的 Docker 离线安装部分"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}错误: Docker 服务未启动！${NC}"
    echo "请运行: sudo systemctl start docker"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker 环境检查通过"
echo ""

# 步骤 2: 解压项目源码
echo -e "${GREEN}[步骤 2/6]${NC} 解压项目源码..."
if [ ! -f "project-source.tar.gz" ]; then
    echo -e "${RED}错误: 找不到 project-source.tar.gz${NC}"
    exit 1
fi

# 创建临时目录
DEPLOY_DIR="/tmp/llm-chat-deploy-$(date +%s)"
mkdir -p "$DEPLOY_DIR"
tar xzf project-source.tar.gz -C "$DEPLOY_DIR"
echo -e "${GREEN}✓${NC} 项目源码已解压到: $DEPLOY_DIR"
echo ""

# 步骤 3: 加载 Docker 镜像
echo -e "${GREEN}[步骤 3/6]${NC} 加载 Docker 镜像..."
if [ ! -f "llm-chat-images.tar" ]; then
    echo -e "${RED}错误: 找不到 llm-chat-images.tar${NC}"
    exit 1
fi

echo "正在加载镜像（文件较大，请耐心等待）..."
docker load -i llm-chat-images.tar
echo -e "${GREEN}✓${NC} Docker 镜像加载完成"
echo ""

# 步骤 4: 配置环境变量
echo -e "${GREEN}[步骤 4/6]${NC} 配置环境变量..."
echo ""
echo "请根据您的实际环境填写以下配置信息："
echo ""

# 获取服务器 IP
read -p "请输入服务器 IP 地址或域名 (例如: 192.168.1.100): " SERVER_IP
if [ -z "$SERVER_IP" ]; then
    echo -e "${RED}错误: 服务器 IP 不能为空${NC}"
    exit 1
fi

# 配置前端环境变量
cat > "$DEPLOY_DIR/frontend/.env.local" <<EOF
NEXT_PUBLIC_API_URL=http://${SERVER_IP}:8000
EOF

echo -e "${GREEN}✓${NC} 前端配置: NEXT_PUBLIC_API_URL=http://${SERVER_IP}:8000"

# 配置模型 API
echo ""
echo "配置大模型 API 信息："
read -p "模型 API 地址 (回车使用默认: http://127.0.0.1:11553/v1/chat/completions): " LLM_API_URL
LLM_API_URL=${LLM_API_URL:-http://127.0.0.1:11553/v1/chat/completions}

read -p "模型名称 (回车使用默认: glm4_32B_chat): " LLM_MODEL
LLM_MODEL=${LLM_MODEL:-glm4_32B_chat}

read -p "模型 API Key (回车使用默认: glm432b): " LLM_API_KEY
LLM_API_KEY=${LLM_API_KEY:-glm432b}

# 生成随机 SECRET_KEY
SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || echo "change-this-secret-key-$(date +%s)")

# 修改 docker-compose.yml
sed -i "s|LLM_API_URL=.*|LLM_API_URL=${LLM_API_URL}|g" "$DEPLOY_DIR/docker-compose.yml"
sed -i "s|LLM_MODEL=.*|LLM_MODEL=${LLM_MODEL}|g" "$DEPLOY_DIR/docker-compose.yml"
sed -i "s|LLM_API_KEY=.*|LLM_API_KEY=${LLM_API_KEY}|g" "$DEPLOY_DIR/docker-compose.yml"
sed -i "s|SECRET_KEY=.*|SECRET_KEY=${SECRET_KEY}|g" "$DEPLOY_DIR/docker-compose.yml"

echo -e "${GREEN}✓${NC} 后端配置已更新"
echo -e "${GREEN}✓${NC} SECRET_KEY: ${SECRET_KEY}"
echo ""

# 步骤 5: 启动服务
echo -e "${GREEN}[步骤 5/6]${NC} 启动服务..."
cd "$DEPLOY_DIR"

# 创建必要的目录
mkdir -p frontend/public

echo "正在启动 Docker 容器..."
docker compose up -d

echo ""
echo "等待服务启动（10秒）..."
sleep 10

# 检查容器状态
echo ""
echo "检查容器状态："
docker compose ps

echo ""
echo -e "${GREEN}✓${NC} 服务启动完成"
echo ""

# 步骤 6: 创建管理员账号
echo -e "${GREEN}[步骤 6/6]${NC} 创建管理员账号..."
echo ""
read -p "是否创建管理员账号? (Y/n): " CREATE_ADMIN
CREATE_ADMIN=${CREATE_ADMIN:-Y}

if [[ "$CREATE_ADMIN" =~ ^[Yy]$ ]]; then
    read -p "管理员用户名 (回车使用默认: admin): " ADMIN_USERNAME
    ADMIN_USERNAME=${ADMIN_USERNAME:-admin}

    read -sp "管理员密码 (回车使用默认: Admin@2025): " ADMIN_PASSWORD
    ADMIN_PASSWORD=${ADMIN_PASSWORD:-Admin@2025}
    echo ""

    docker compose exec -T backend python3 << EOF
from database import get_db, User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = next(get_db())

# 检查是否已存在
existing_admin = db.query(User).filter(User.username == "${ADMIN_USERNAME}").first()
if existing_admin:
    print("管理员账号已存在")
else:
    admin_user = User(
        username="${ADMIN_USERNAME}",
        hashed_password=pwd_context.hash("${ADMIN_PASSWORD}"),
        is_admin=True,
        is_active=True
    )
    db.add(admin_user)
    db.commit()
    print("管理员账号创建成功")
EOF

    echo -e "${GREEN}✓${NC} 管理员账号创建完成"
    echo ""
    echo "管理员凭证："
    echo "  用户名: ${ADMIN_USERNAME}"
    echo "  密码: ${ADMIN_PASSWORD}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  部署完成！${NC}"
echo "=========================================="
echo ""
echo "访问地址："
echo "  前端页面: http://${SERVER_IP}:3000"
echo "  后端 API: http://${SERVER_IP}:8000/docs"
echo "  管理后台: http://${SERVER_IP}:3000/admin"
echo ""
echo "项目目录: ${DEPLOY_DIR}"
echo ""
echo "常用命令："
echo "  查看日志: cd ${DEPLOY_DIR} && docker compose logs -f"
echo "  重启服务: cd ${DEPLOY_DIR} && docker compose restart"
echo "  停止服务: cd ${DEPLOY_DIR} && docker compose down"
echo ""
echo "配置信息已保存到："
echo "  ${DEPLOY_DIR}/frontend/.env.local"
echo "  ${DEPLOY_DIR}/docker-compose.yml"
echo ""
echo -e "${YELLOW}提示: 请妥善保管 SECRET_KEY 和管理员密码！${NC}"
echo ""

# 保存部署信息
cat > "$DEPLOY_DIR/deployment-info.txt" <<EOF
部署时间: $(date)
服务器地址: ${SERVER_IP}
部署目录: ${DEPLOY_DIR}
SECRET_KEY: ${SECRET_KEY}
管理员用户名: ${ADMIN_USERNAME}
管理员密码: ${ADMIN_PASSWORD}

访问地址:
- 前端: http://${SERVER_IP}:3000
- 后端: http://${SERVER_IP}:8000/docs
- 管理后台: http://${SERVER_IP}:3000/admin

模型配置:
- API URL: ${LLM_API_URL}
- 模型名称: ${LLM_MODEL}
- API Key: ${LLM_API_KEY}
EOF

echo -e "${GREEN}部署信息已保存到: ${DEPLOY_DIR}/deployment-info.txt${NC}"
echo ""
