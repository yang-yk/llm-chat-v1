#!/bin/bash

# 创建离线部署包脚本
# 用于打包项目源码和 Docker 镜像，生成完整的离线部署包

set -e

echo "=========================================="
echo "  创建 LLM Chat 离线部署包"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 检查是否在项目根目录
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 创建输出目录
OUTPUT_DIR="offline-deployment-package"
mkdir -p "$OUTPUT_DIR"

echo -e "${GREEN}[步骤 1/5]${NC} 打包项目源码..."

# 打包项目源码（排除不必要的文件）
tar czf "${OUTPUT_DIR}/project-source.tar.gz" \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.git' \
    --exclude='*.tar' \
    --exclude='*.tar.gz' \
    --exclude='offline-deployment-package' \
    --exclude='offline-deployment/llm-chat-images.tar' \
    --exclude='offline-deployment/project-source.tar.gz' \
    .

echo -e "${GREEN}✓${NC} 项目源码打包完成: ${OUTPUT_DIR}/project-source.tar.gz"
echo ""

echo -e "${GREEN}[步骤 2/5]${NC} 导出 Docker 镜像..."

# 确保镜像是最新的
echo "正在构建最新镜像..."
docker compose build

# 导出 Docker 镜像
echo "正在导出镜像（这可能需要几分钟）..."
docker save \
    llm-chat-v1-backend:latest \
    llm-chat-v1-frontend:latest \
    nginx:alpine \
    -o "${OUTPUT_DIR}/llm-chat-images.tar"

echo -e "${GREEN}✓${NC} Docker 镜像导出完成: ${OUTPUT_DIR}/llm-chat-images.tar"
echo "  镜像大小: $(du -h "${OUTPUT_DIR}/llm-chat-images.tar" | cut -f1)"
echo ""

echo -e "${GREEN}[步骤 3/5]${NC} 复制部署脚本和文档..."

# 复制离线部署脚本和文档
cp offline-deployment/offline-deploy.sh "${OUTPUT_DIR}/"
cp offline-deployment/install-docker-offline.sh "${OUTPUT_DIR}/"
cp offline-deployment/OFFLINE_DEPLOYMENT_GUIDE.md "${OUTPUT_DIR}/"

# 创建 README
cat > "${OUTPUT_DIR}/README.txt" <<'EOF'
LLM Chat 离线部署包
====================

本包包含完整的 LLM Chat 系统离线部署所需文件。

包含文件：
- project-source.tar.gz      项目源码
- llm-chat-images.tar        Docker 镜像
- offline-deploy.sh          部署脚本
- install-docker-offline.sh  Docker 离线安装脚本
- OFFLINE_DEPLOYMENT_GUIDE.md 详细部署文档
- README.txt                 本文件
- QUICK_START.txt            快速开始指南

快速开始：
1. 确保 Docker 已安装
   如未安装，运行: bash install-docker-offline.sh

2. 运行部署脚本
   bash offline-deploy.sh

3. 按照提示配置服务器 IP 和端口

4. 等待部署完成，使用浏览器访问

详细说明请查看 OFFLINE_DEPLOYMENT_GUIDE.md
EOF

# 创建快速开始指南
cat > "${OUTPUT_DIR}/QUICK_START.txt" <<'EOF'
LLM Chat 快速部署指南
======================

环境要求：
- Linux 系统（推荐 Ubuntu 20.04+）
- 至少 4GB 可用磁盘空间
- Docker 和 Docker Compose

快速部署步骤：
==============

1. 安装 Docker（如已安装可跳过）
   -----------------------------
   bash install-docker-offline.sh

2. 运行部署脚本
   -------------
   bash offline-deploy.sh

3. 配置参数（按提示输入）
   -----------------------
   - 服务器 IP 地址（必填）
   - 端口配置（可使用默认值）
     * Nginx: 80
     * 前端: 3000
     * 后端: 8000
   - 部署目录（默认 /opt/llm-chat）
   - 模型 API 配置
   - 管理员账号

4. 等待部署完成
   -------------
   脚本会自动：
   - 解压项目源码
   - 加载 Docker 镜像
   - 生成配置文件
   - 启动所有服务
   - 创建管理员账号

5. 访问服务
   ---------
   主页: http://你的IP:80
   管理后台: http://你的IP:80/admin

默认管理员账号：
- 用户名: admin
- 密码: Admin@2025
（建议首次登录后立即修改）

故障排查：
----------
如果遇到问题：
1. 检查 Docker 服务是否运行
   systemctl status docker

2. 查看容器日志
   cd /opt/llm-chat
   docker compose logs -f

3. 检查端口是否被占用
   netstat -tulpn | grep -E '80|3000|8000'

4. 参考详细文档
   OFFLINE_DEPLOYMENT_GUIDE.md

常用命令：
----------
cd /opt/llm-chat  # 进入部署目录

docker compose ps           # 查看服务状态
docker compose logs -f      # 查看日志
docker compose restart      # 重启服务
docker compose down         # 停止服务
docker compose up -d        # 启动服务

需要帮助？
----------
查看完整文档: OFFLINE_DEPLOYMENT_GUIDE.md
EOF

echo -e "${GREEN}✓${NC} 脚本和文档复制完成"
echo ""

echo -e "${GREEN}[步骤 4/5]${NC} 创建文件清单..."

# 创建文件清单
cat > "${OUTPUT_DIR}/file-checklist.md" <<EOF
# 离线部署包文件清单

## 必需文件

### 1. 项目源码
- \`project-source.tar.gz\` ($(du -h "${OUTPUT_DIR}/project-source.tar.gz" | cut -f1))
  - 包含完整的前端和后端源代码
  - 包含 docker-compose.yml 配置文件
  - 包含 Nginx 配置文件

### 2. Docker 镜像
- \`llm-chat-images.tar\` ($(du -h "${OUTPUT_DIR}/llm-chat-images.tar" | cut -f1))
  - llm-chat-v1-backend:latest
  - llm-chat-v1-frontend:latest
  - nginx:alpine

### 3. 部署脚本
- \`offline-deploy.sh\` - 主部署脚本
- \`install-docker-offline.sh\` - Docker 离线安装脚本

### 4. 文档
- \`OFFLINE_DEPLOYMENT_GUIDE.md\` - 详细部署文档
- \`README.txt\` - 说明文件
- \`QUICK_START.txt\` - 快速开始指南
- \`file-checklist.md\` - 本文件

## 文件完整性检查

生成时间: $(date '+%Y-%m-%d %H:%M:%S')

文件列表:
\`\`\`
$(ls -lh "${OUTPUT_DIR}")
\`\`\`

总大小: $(du -sh "${OUTPUT_DIR}" | cut -f1)

## 使用前检查

1. 确认所有文件完整
   - [ ] project-source.tar.gz
   - [ ] llm-chat-images.tar
   - [ ] offline-deploy.sh
   - [ ] install-docker-offline.sh
   - [ ] OFFLINE_DEPLOYMENT_GUIDE.md
   - [ ] README.txt
   - [ ] QUICK_START.txt

2. 检查文件大小是否正常
   - project-source.tar.gz 应该在几MB
   - llm-chat-images.tar 应该在 1-2GB

3. 验证脚本可执行权限
   \`\`\`bash
   chmod +x offline-deploy.sh
   chmod +x install-docker-offline.sh
   \`\`\`

## 部署流程

1. 将整个 \`offline-deployment-package\` 目录复制到目标服务器
2. 进入目录: \`cd offline-deployment-package\`
3. 运行部署脚本: \`bash offline-deploy.sh\`
4. 按照提示配置参数
5. 等待部署完成

## 注意事项

- 确保目标服务器有足够的磁盘空间（至少 4GB）
- 确保目标服务器已安装 Docker
- 如未安装 Docker，先运行 \`install-docker-offline.sh\`
- 部署过程中不需要网络连接
EOF

echo -e "${GREEN}✓${NC} 文件清单创建完成"
echo ""

echo -e "${GREEN}[步骤 5/5]${NC} 生成最终打包文件..."

# 创建最终的 tar.gz 包
PACKAGE_NAME="llm-chat-offline-$(date +%Y%m%d-%H%M%S).tar.gz"
tar czf "$PACKAGE_NAME" -C "$OUTPUT_DIR" .

echo -e "${GREEN}✓${NC} 最终打包文件创建完成: $PACKAGE_NAME"
echo ""

echo "=========================================="
echo -e "${GREEN}  打包完成！${NC}"
echo "=========================================="
echo ""
echo "包内容:"
echo "  - 项目源码: $(du -h "${OUTPUT_DIR}/project-source.tar.gz" | cut -f1)"
echo "  - Docker 镜像: $(du -h "${OUTPUT_DIR}/llm-chat-images.tar" | cut -f1)"
echo "  - 部署脚本和文档"
echo ""
echo "输出文件:"
echo "  - 离线包目录: ${OUTPUT_DIR}/"
echo "  - 压缩包文件: ${PACKAGE_NAME}"
echo "  - 压缩包大小: $(du -h "$PACKAGE_NAME" | cut -f1)"
echo ""
echo "使用方法:"
echo "  1. 将 ${PACKAGE_NAME} 复制到目标服务器"
echo "  2. 解压: tar xzf ${PACKAGE_NAME}"
echo "  3. 运行: bash offline-deploy.sh"
echo ""
echo -e "${YELLOW}提示:${NC}"
echo "  - 压缩包包含所有必需文件，无需网络即可部署"
echo "  - 目标服务器需要提前安装 Docker"
echo "  - 如需离线安装 Docker，使用包内的 install-docker-offline.sh"
echo ""
