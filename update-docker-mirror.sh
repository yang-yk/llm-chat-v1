#!/bin/bash

# 更新 Docker 镜像源配置脚本

echo "正在更新 Docker 镜像源配置..."

sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
    "registry-mirrors": [
        "https://docker.1panel.live",
        "https://hub.rat.dev"
    ],
    "runtimes": {
        "nvidia": {
            "args": [],
            "path": "nvidia-container-runtime"
        }
    }
}
EOF

echo "配置文件已更新"
echo "正在重启 Docker 服务..."

sudo systemctl restart docker

echo "Docker 服务已重启"
echo "镜像源配置完成！"
