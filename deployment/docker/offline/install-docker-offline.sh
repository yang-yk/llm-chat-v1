#!/bin/bash

# Docker 离线安装脚本
# 适用于已下载 docker-*.tgz 的情况

set -e

echo "=========================================="
echo "  Docker 离线安装脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 root 权限运行此脚本${NC}"
    echo "运行: sudo $0"
    exit 1
fi

# 检查 docker 压缩包是否存在
DOCKER_TAR=$(ls docker-*.tgz 2>/dev/null | head -1)
if [ -z "$DOCKER_TAR" ]; then
    echo -e "${RED}错误: 找不到 docker-*.tgz 文件${NC}"
    echo ""
    echo "请先下载 Docker 离线安装包："
    echo "访问: https://download.docker.com/linux/static/stable/"
    echo "根据您的系统架构选择对应版本"
    echo ""
    echo "示例："
    echo "  x86_64: https://download.docker.com/linux/static/stable/x86_64/docker-24.0.7.tgz"
    echo "  aarch64: https://download.docker.com/linux/static/stable/aarch64/docker-24.0.7.tgz"
    exit 1
fi

echo -e "${GREEN}找到 Docker 安装包: $DOCKER_TAR${NC}"
echo ""

# 检查是否已安装 Docker
if command -v docker &> /dev/null; then
    echo -e "${YELLOW}警告: Docker 已安装${NC}"
    docker --version
    read -p "是否继续安装（将覆盖现有版本）? (y/N): " CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
        echo "取消安装"
        exit 0
    fi
fi

# 解压 Docker
echo "正在解压 Docker..."
tar xzvf "$DOCKER_TAR"

# 复制二进制文件到系统目录
echo "正在复制 Docker 二进制文件到 /usr/bin/..."
cp docker/* /usr/bin/

# 清理解压的目录
rm -rf docker/

# 创建 Docker 服务文件
echo "正在创建 Docker 服务..."
cat > /etc/systemd/system/docker.service <<'EOF'
[Unit]
Description=Docker Application Container Engine
Documentation=https://docs.docker.com
After=network-online.target firewalld.service containerd.service
Wants=network-online.target
Requires=docker.socket containerd.service

[Service]
Type=notify
ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
ExecReload=/bin/kill -s HUP $MAINPID
TimeoutSec=0
RestartSec=2
Restart=always
StartLimitBurst=3
StartLimitInterval=60s

LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity

TasksMax=infinity

Delegate=yes
KillMode=process
OOMScoreAdjust=-500

[Install]
WantedBy=multi-user.target
EOF

# 创建 Docker socket 服务
cat > /etc/systemd/system/docker.socket <<'EOF'
[Unit]
Description=Docker Socket for the API

[Socket]
ListenStream=/var/run/docker.sock
SocketMode=0660
SocketUser=root
SocketGroup=docker

[Install]
WantedBy=sockets.target
EOF

# 创建 containerd 服务文件
cat > /etc/systemd/system/containerd.service <<'EOF'
[Unit]
Description=containerd container runtime
Documentation=https://containerd.io
After=network.target local-fs.target

[Service]
ExecStartPre=-/sbin/modprobe overlay
ExecStart=/usr/bin/containerd
Type=notify
Delegate=yes
KillMode=process
Restart=always
RestartSec=5
LimitNPROC=infinity
LimitCORE=infinity
LimitNOFILE=infinity
TasksMax=infinity
OOMScoreAdjust=-999

[Install]
WantedBy=multi-user.target
EOF

# 创建 Docker 配置目录
echo "正在创建 Docker 配置目录..."
mkdir -p /etc/docker

# 创建 docker 组
echo "正在创建 docker 组..."
groupadd docker 2>/dev/null || true

# 添加当前用户到 docker 组（如果是通过 sudo 运行）
if [ -n "$SUDO_USER" ]; then
    echo "正在将用户 $SUDO_USER 添加到 docker 组..."
    usermod -aG docker "$SUDO_USER"
fi

# 重载 systemd
echo "正在重载 systemd..."
systemctl daemon-reload

# 启动 containerd
echo "正在启动 containerd..."
systemctl enable containerd
systemctl start containerd

# 启动 Docker
echo "正在启动 Docker..."
systemctl enable docker.socket
systemctl enable docker
systemctl start docker.socket
systemctl start docker

# 等待 Docker 启动
echo "等待 Docker 服务启动..."
sleep 3

# 验证安装
echo ""
echo "=========================================="
echo -e "${GREEN}  Docker 安装完成！${NC}"
echo "=========================================="
echo ""

if docker --version &> /dev/null; then
    echo -e "${GREEN}Docker 版本:${NC}"
    docker --version
    echo ""

    if docker info &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker 服务运行正常"
    else
        echo -e "${YELLOW}警告: Docker 已安装但服务未正常运行${NC}"
        echo "请运行: systemctl status docker"
    fi
else
    echo -e "${RED}错误: Docker 安装失败${NC}"
    exit 1
fi

echo ""
echo "后续步骤："
echo "1. 如果遇到权限问题，请重新登录或运行: newgrp docker"
echo "2. 验证 Docker: docker run hello-world (需要网络或离线镜像)"
echo "3. 查看 Docker 信息: docker info"
echo ""
