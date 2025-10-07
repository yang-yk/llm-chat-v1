# Docker离线部署指南

## 概述

本文档介绍如何在没有网络连接的环境中使用Docker部署LLM Chat System。

Docker离线部署的优势：
- 环境一致性好，避免依赖冲突
- 部署简单，无需手动配置Python/Node.js环境
- 易于迁移和扩展
- 隔离性好，不影响宿主机环境

## 准备工作

### 在有网络的机器上

#### 1. 确保Docker环境

```bash
# 检查Docker版本
docker --version  # 需要 20.10+
docker compose version  # 需要 v2+

# 如果没有安装，先安装Docker
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动Docker
sudo systemctl start docker
sudo systemctl enable docker
```

#### 2. 导出Docker镜像

```bash
cd /path/to/llm-chat-v1/deployment/docker

# 运行导出脚本
bash export-docker-images.sh
```

导出过程：
1. 构建后端和前端镜像
2. 拉取Nginx基础镜像
3. 导出所有镜像为tar文件
4. （可选）保存构建缓存用于快速重建
5. 生成校验和文件
6. 复制必要的配置文件
7. 创建说明文档

导出完成后会生成 `offline-packages/` 目录，包含：
```
offline-packages/
├── backend-image.tar          # 后端镜像（约500MB-1GB）
├── frontend-image.tar         # 前端镜像（约500MB-1GB）
├── nginx-image.tar            # Nginx镜像（约40MB）
├── backend-cache.tar.gz       # 后端构建缓存（可选）
├── frontend-cache.tar.gz      # 前端构建缓存（可选）
├── docker-compose.yml         # Docker编排文件
├── env.example                # 环境变量示例
├── nginx/default.conf         # Nginx配置
├── checksums.sha256           # 校验和文件
├── images-info.txt            # 镜像信息
└── README.txt                 # 详细说明
```

#### 3. 打包离线包

```bash
cd /path/to/llm-chat-v1/deployment/docker

# 打包离线包目录
tar -czf llm-chat-docker-offline.tar.gz offline-packages/

# 或者打包整个项目（包含代码，推荐）
cd ../..
tar -czf llm-chat-docker-complete.tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=__pycache__ \
  --exclude=*.pyc \
  --exclude=.git \
  --exclude=deployment/local/offline-packages \
  .
```

#### 4. 打包Docker安装文件（如果目标机器没有Docker）

```bash
# 下载Docker离线安装包
mkdir docker-offline-install
cd docker-offline-install

# Ubuntu/Debian
wget https://download.docker.com/linux/static/stable/x86_64/docker-24.0.7.tgz
wget https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-linux-x86_64

# CentOS/RHEL (下载rpm包)
# 访问 https://download.docker.com/linux/centos/7/x86_64/stable/Packages/
# 下载docker-ce, docker-ce-cli, containerd.io 等rpm包

# 创建安装脚本
cat > install-docker-offline.sh << 'EOF'
#!/bin/bash
set -e

echo "安装Docker（离线）..."

# 解压Docker
tar -xzf docker-24.0.7.tgz
sudo cp docker/* /usr/bin/

# 创建systemd服务
sudo tee /etc/systemd/system/docker.service > /dev/null << 'DOCKERSERVICE'
[Unit]
Description=Docker Application Container Engine
Documentation=https://docs.docker.com
After=network-online.target firewalld.service
Wants=network-online.target

[Service]
Type=notify
ExecStart=/usr/bin/dockerd
ExecReload=/bin/kill -s HUP $MAINPID
Restart=on-failure
RestartSec=5
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
Delegate=yes
KillMode=process

[Install]
WantedBy=multi-user.target
DOCKERSERVICE

# 启动Docker
sudo systemctl daemon-reload
sudo systemctl enable docker
sudo systemctl start docker

# 安装docker compose
sudo install -m 755 docker-compose-linux-x86_64 /usr/local/bin/docker-compose
sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

echo "Docker安装完成！"
docker --version
docker compose version
EOF

chmod +x install-docker-offline.sh

cd ..
tar -czf docker-offline-install.tar.gz docker-offline-install/
```

#### 5. 传输到目标机器

```bash
# 将以下文件传输到目标机器：
# 1. llm-chat-docker-complete.tar.gz（完整项目，推荐）
#    或 llm-chat-docker-offline.tar.gz（仅离线包）
# 2. docker-offline-install.tar.gz（如果需要安装Docker）

# 使用U盘、移动硬盘或内网传输
scp llm-chat-docker-complete.tar.gz user@target:/path/
scp docker-offline-install.tar.gz user@target:/path/
```

## 在离线目标机器上部署

### 1. 安装Docker（如果未安装）

```bash
# 解压安装包
tar -xzf docker-offline-install.tar.gz
cd docker-offline-install

# 运行安装脚本
sudo bash install-docker-offline.sh

# 验证安装
docker --version
docker compose version

# 将当前用户添加到docker组（可选）
sudo usermod -aG docker $USER
# 重新登录以生效
```

### 2. 解压项目文件

```bash
# 解压完整项目
tar -xzf llm-chat-docker-complete.tar.gz
cd llm-chat-v1

# 或者只解压离线包（如果项目代码已存在）
cd llm-chat-v1/deployment/docker
tar -xzf llm-chat-docker-offline.tar.gz
```

### 3. 导入Docker镜像

#### 方法1: 使用自动导入脚本（推荐）

```bash
cd deployment/docker
bash import-docker-images.sh
```

脚本会自动：
1. 验证文件完整性
2. 导入所有Docker镜像
3. 验证镜像导入成功
4. 准备配置文件
5. 询问是否启动服务

#### 方法2: 手动导入

```bash
cd deployment/docker/offline-packages

# 验证文件完整性（可选）
sha256sum -c checksums.sha256

# 导入镜像
docker load -i backend-image.tar
docker load -i frontend-image.tar
docker load -i nginx-image.tar

# 验证镜像
docker images | grep -E "llm-chat|nginx"
```

### 4. 配置环境

```bash
cd /path/to/llm-chat-v1

# 复制配置文件
cp deployment-config.example.json deployment-config.local.json

# 编辑配置
vim deployment-config.local.json
```

关键配置项：
```json
{
  "deployment": {
    "type": "docker"
  },
  "llm": {
    "api_url": "http://your-llm-server:11553/v1/chat/completions",
    "model": "glm4_32B_chat",
    "api_key": "your-api-key"
  },
  "frontend": {
    "api_url": "http://your-server-ip"
  },
  "nginx": {
    "enabled": true
  }
}
```

应用配置：
```bash
bash apply-config.sh deployment-config.local.json
```

或者手动创建.env文件：
```bash
cd deployment/docker

# 创建.env文件
cat > .env << EOF
LLM_API_URL=http://your-llm-server:11553/v1/chat/completions
LLM_MODEL=glm4_32B_chat
LLM_API_KEY=your-api-key
SECRET_KEY=$(openssl rand -hex 32)
FRONTEND_API_URL=http://your-server-ip
EOF
```

### 5. 启动服务

```bash
cd deployment/docker

# 启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

如果导入脚本已经启动服务，可以跳过此步骤。

### 6. 验证部署

```bash
# 检查容器状态
docker compose ps

# 应该看到3个运行中的容器：
# - llm-chat-backend
# - llm-chat-frontend
# - llm-chat-nginx

# 检查日志
docker compose logs backend | tail -20
docker compose logs frontend | tail -20
docker compose logs nginx | tail -20

# 测试后端API
curl http://127.0.0.1:8000/api/health

# 检查数据库
ls -la ../../db/
```

### 7. 访问服务

- **前端页面**：http://your-server-ip
- **管理后台**：http://your-server-ip/admin
- **后端API**：http://your-server-ip/api (通过Nginx代理)

默认管理员账户：
- 用户名：`admin`
- 密码：`Admin@2025`

### 8. 服务管理

```bash
cd deployment/docker

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 重启单个服务
docker compose restart backend

# 查看日志
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx

# 查看资源使用
docker compose stats

# 进入容器
docker compose exec backend bash
docker compose exec frontend sh
```

## 使用构建缓存（高级）

如果在导出时保存了构建缓存，可以在目标机器上快速重新构建镜像（适用于需要修改代码的场景）。

### 1. 解压缓存文件

```bash
cd deployment/docker/offline-packages

tar -xzf backend-cache.tar.gz
tar -xzf frontend-cache.tar.gz
```

### 2. 创建buildx构建器

```bash
docker buildx create --name cache-builder --driver docker-container --use
```

### 3. 使用缓存构建

```bash
# 构建后端
docker buildx build \
  --builder cache-builder \
  --cache-from=type=local,src=./offline-packages/backend-cache \
  --load \
  -t llm-chat-backend \
  ../../backend

# 构建前端
docker buildx build \
  --builder cache-builder \
  --cache-from=type=local,src=./offline-packages/frontend-cache \
  --load \
  -t llm-chat-frontend \
  --build-arg NEXT_PUBLIC_API_URL=http://your-server-ip \
  ../../frontend
```

### 4. 清理构建器

```bash
docker buildx rm cache-builder
```

### 5. 启动服务

```bash
cd deployment/docker
docker compose up -d
```

## 故障排除

### Docker相关问题

**问题：docker命令需要sudo**

```bash
# 将用户添加到docker组
sudo usermod -aG docker $USER

# 重新登录或执行
newgrp docker

# 测试
docker ps
```

**问题：镜像导入失败**

```bash
# 检查磁盘空间
df -h

# 检查Docker存储
docker system df

# 清理未使用的资源
docker system prune -a

# 重新导入
docker load -i offline-packages/backend-image.tar
```

**问题：容器无法启动**

```bash
# 查看详细日志
docker compose logs backend
docker compose logs frontend

# 检查端口占用
netstat -tulnp | grep -E "80|3000|8000"

# 检查配置文件
cat .env
cat ../../nginx/default.conf

# 检查数据库目录权限
ls -la ../../db/
```

### 网络问题

**问题：容器间无法通信**

Docker使用host网络模式，容器直接使用宿主机网络：

```bash
# 检查网络配置
docker compose config | grep network_mode

# 应该显示: network_mode: host

# 检查本地端口
netstat -tulnp | grep -E "8000|3000"
```

**问题：外部无法访问**

```bash
# 检查防火墙
sudo firewall-cmd --list-all

# 开放端口80
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload

# 或者关闭防火墙（不推荐）
sudo systemctl stop firewalld
```

### 数据库问题

**问题：数据库文件不存在**

```bash
# 检查挂载
docker compose exec backend ls -la /app/db/

# 检查宿主机
ls -la ../../db/

# 创建数据库目录
mkdir -p ../../db

# 重启后端服务（会自动初始化）
docker compose restart backend
```

**问题：权限拒绝**

```bash
# 检查目录权限
ls -la ../../db/

# 修复权限
chmod 755 ../../db/
chmod 664 ../../db/conversation.db  # 如果已存在

# 重启服务
docker compose restart backend
```

### 前端问题

**问题：前端显示API连接错误**

```bash
# 检查环境变量
docker compose config | grep NEXT_PUBLIC_API_URL

# 应该是宿主机IP（不带端口）
# 正确: http://192.168.1.100
# 错误: http://192.168.1.100:8000

# 修改配置
vim .env
# 设置: FRONTEND_API_URL=http://your-server-ip

# 重新构建前端
docker compose up -d --build frontend
```

### 性能问题

**问题：容器占用资源过高**

```bash
# 查看资源使用
docker compose stats

# 限制资源使用（在docker-compose.yml中添加）
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

# 应用配置
docker compose up -d --force-recreate
```

## 更新和维护

### 更新代码

```bash
# 停止服务
cd deployment/docker
docker compose down

# 更新代码（如果有内网git）
git pull

# 或者手动替换代码文件

# 重新构建镜像
docker compose build

# 启动服务
docker compose up -d
```

### 更新镜像

如果需要在有网络的环境更新镜像：

```bash
# 在联网机器上
cd deployment/docker

# 重新导出镜像
bash export-docker-images.sh

# 传输到离线机器

# 在离线机器上
bash import-docker-images.sh

# 重启服务
docker compose down
docker compose up -d
```

### 备份数据

```bash
# 备份数据库
cp ../../db/conversation.db ../../db/conversation.db.backup.$(date +%Y%m%d)

# 备份配置
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  .env \
  ../../nginx/default.conf \
  ../../deployment-config.local.json

# 完整备份
tar -czf docker-backup-$(date +%Y%m%d).tar.gz \
  ../../db/ \
  ../../logs/ \
  .env \
  ../../nginx/
```

### 恢复数据

```bash
# 停止服务
docker compose down

# 恢复数据库
cp ../../db/conversation.db.backup.20250107 ../../db/conversation.db

# 恢复配置
tar -xzf config-backup-20250107.tar.gz

# 启动服务
docker compose up -d
```

## 系统要求

### 最小配置
- CPU: 2核
- 内存: 4GB
- 磁盘: 15GB（含Docker镜像）
- 操作系统: Linux (x86_64)
- Docker: 20.10+
- Docker Compose: v2+

### 推荐配置
- CPU: 4核+
- 内存: 8GB+
- 磁盘: 30GB+
- 操作系统: Ubuntu 20.04+ / CentOS 7+
- Docker: 24.0+
- Docker Compose: v2.20+

## 离线包大小估算

| 组件 | 大小 |
|-----|------|
| 后端镜像 | 500MB - 1GB |
| 前端镜像 | 500MB - 1GB |
| Nginx镜像 | 40MB |
| 构建缓存（可选） | 1GB - 3GB |
| 配置文件 | < 1MB |
| **总计（不含缓存）** | **1GB - 2.5GB** |
| **总计（含缓存）** | **2GB - 5.5GB** |

## 安全建议

### 1. 修改默认密码

```bash
# 进入后端容器
docker compose exec backend bash

# 修改管理员密码
cd /app
python set_admin.py --username admin --password "YourNewPassword"

# 退出容器
exit
```

### 2. 配置HTTPS（生产环境）

```bash
# 修改nginx配置，添加SSL
vim ../../nginx/default.conf

# 添加证书到容器
# 在docker-compose.yml中添加卷挂载：
volumes:
  - ../../nginx/ssl:/etc/nginx/ssl

# 重启nginx
docker compose restart nginx
```

### 3. 限制容器权限

```bash
# 在docker-compose.yml中添加安全选项
services:
  backend:
    security_opt:
      - no-new-privileges:true
    read_only: false
    user: "1000:1000"
```

### 4. 定期更新

```bash
# 定期更新基础镜像
# 在联网环境重新构建

# 定期备份数据
0 2 * * * cd /path/to/llm-chat-v1 && tar -czf backup-$(date +\%Y\%m\%d).tar.gz db/
```

## 生产环境建议

### 1. 使用Docker Swarm或Kubernetes

对于生产环境，建议使用容器编排工具：

```bash
# Docker Swarm
docker swarm init
docker stack deploy -c docker-compose.yml llm-chat

# Kubernetes
# 准备k8s部署文件
kubectl apply -f k8s/
```

### 2. 配置持久化存储

确保数据持久化：

```yaml
volumes:
  - type: bind
    source: ../../db
    target: /app/db
  - type: bind
    source: ../../logs
    target: /app/logs
```

### 3. 配置健康检查

在docker-compose.yml中添加：

```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 4. 配置日志轮转

```bash
# 配置Docker日志驱动
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 常见问题

**Q: 离线环境如何更新Docker？**

A: 在联网机器下载新版本Docker离线包，传输到目标机器安装。

**Q: 如何在多台机器部署？**

A: 导出一次镜像，复制到所有目标机器，分别导入并启动。

**Q: 容器重启后数据会丢失吗？**

A: 不会。数据库和日志通过卷挂载到宿主机，持久化存储。

**Q: 可以在Windows上使用吗？**

A: 理论可以，但本指南针对Linux环境。Windows需要使用Docker Desktop和WSL2。

**Q: 如何监控容器状态？**

A: 使用docker compose ps, docker compose logs, docker compose stats等命令。

## 附录

### 完整部署检查清单

- [ ] Docker已安装并运行
- [ ] Docker Compose已安装
- [ ] 离线包已传输到目标机器
- [ ] 离线包已解压
- [ ] Docker镜像已导入
- [ ] 镜像验证成功
- [ ] 配置文件已准备
- [ ] 数据库目录已创建
- [ ] 服务已启动
- [ ] 容器状态正常
- [ ] 端口可访问
- [ ] 前端页面正常
- [ ] 管理员可登录
- [ ] 对话功能正常

### 脚本文件清单

```
deployment/docker/
├── docker-compose.yml               # Docker编排文件
├── .env                             # 环境变量（需创建）
├── export-docker-images.sh          # 导出Docker镜像
├── import-docker-images.sh          # 导入Docker镜像
├── offline-packages/                # 离线包目录（自动生成）
│   ├── backend-image.tar           # 后端镜像
│   ├── frontend-image.tar          # 前端镜像
│   ├── nginx-image.tar             # Nginx镜像
│   ├── backend-cache.tar.gz        # 构建缓存（可选）
│   ├── frontend-cache.tar.gz       # 构建缓存（可选）
│   ├── docker-compose.yml          # 编排文件副本
│   ├── nginx/default.conf          # Nginx配置
│   ├── checksums.sha256            # 校验和
│   ├── images-info.txt             # 镜像信息
│   └── README.txt                  # 说明文档
└── OFFLINE_DEPLOYMENT_GUIDE.md      # 本文档
```

### Docker命令速查

```bash
# 镜像管理
docker images                        # 列出镜像
docker load -i image.tar             # 导入镜像
docker save -o image.tar image:tag   # 导出镜像
docker rmi image:tag                 # 删除镜像

# 容器管理
docker ps                            # 列出运行中的容器
docker ps -a                         # 列出所有容器
docker logs container                # 查看日志
docker exec -it container bash       # 进入容器

# Compose命令
docker compose up -d                 # 启动服务
docker compose down                  # 停止并删除容器
docker compose ps                    # 查看状态
docker compose logs -f               # 查看日志
docker compose restart               # 重启服务
docker compose build                 # 构建镜像

# 系统清理
docker system prune                  # 清理未使用资源
docker system df                     # 查看磁盘使用
```

## 技术支持

遇到问题时的排查顺序：
1. 检查容器状态：`docker compose ps`
2. 查看容器日志：`docker compose logs`
3. 检查网络连接：`netstat -tulnp`
4. 验证配置文件：`cat .env`, `cat ../../nginx/default.conf`
5. 检查资源使用：`docker system df`, `df -h`

更多帮助请参考：
- [README.md](../../README.md) - 项目总览
- [SCRIPTS_REFERENCE.md](../../SCRIPTS_REFERENCE.md) - 脚本参考
- [QUICK_START.md](../../QUICK_START.md) - 快速开始
- Docker官方文档：https://docs.docker.com/
