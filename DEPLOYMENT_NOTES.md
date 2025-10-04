# Docker 部署问题记录

## 部署时间
2025-10-04

## 服务器环境
- 操作系统: Linux 5.15.0-78-generic
- 服务器 IP: 10.10.1.15
- Docker 版本: 26.0.0
- Docker Compose 版本: v2.39.1

## 遇到的问题及解决方案

### 1. Docker Compose 版本兼容问题

**问题描述:**
```
错误: 未检测到 docker-compose
```

**原因分析:**
- 服务器安装的是 Docker Compose V2 (集成在 `docker` 命令中)
- 原部署脚本检测的是旧版 `docker-compose` 命令
- 新版使用 `docker compose` (空格分隔) 而非 `docker-compose` (连字符)

**解决方案:**
修改 `docker-deploy.sh` 脚本,增加对 Docker Compose V2 的兼容:

```bash
# 检查 docker-compose 是否安装(兼容 V1 和 V2)
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo -e "${RED}错误: 未检测到 docker-compose 或 docker compose${NC}"
    exit 1
fi
```

然后将脚本中所有的 `docker-compose` 命令替换为 `$DOCKER_COMPOSE` 变量。

**修改文件:**
- `docker-deploy.sh`: 第 34-43 行,第 215、220、230 行,第 237-283 行,第 309-319、324 行

---

### 2. Docker 用户权限问题

**问题描述:**
```
permission denied while trying to connect to the Docker daemon socket
```

**原因分析:**
- 当前用户 `yangyk` 不在 `docker` 用户组中
- 无法直接执行 Docker 命令

**解决方案:**
```bash
# 将用户添加到 docker 组
sudo usermod -aG docker yangyk

# 刷新用户组(无需重新登录)
newgrp docker
```

**注意事项:**
- `newgrp docker` 只对当前终端会话生效
- 如果重新登录 SSH,则权限会永久生效
- 添加到 docker 组后,用户可以无需 sudo 执行 Docker 命令

---

### 3. Docker 镜像源无法访问

**问题描述:**
```
failed to do request: Head "https://docker.mirrors.ustc.edu.cn/v2/library/python/manifests/3.9-slim":
dial tcp: lookup docker.mirrors.ustc.edu.cn on 127.0.0.53:53: no such host
```

**原因分析:**
- `/etc/docker/daemon.json` 中配置的中科大镜像源 `docker.mirrors.ustc.edu.cn` 无法访问
- DNS 解析失败或镜像源服务不可用

**解决方案:**

**方案 1: 更换可用的镜像源 (推荐)**
```bash
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
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

# 重启 Docker 服务
sudo systemctl restart docker
```

**方案 2: 使用 Docker Hub 官方源**
```bash
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
    "runtimes": {
        "nvidia": {
            "args": [],
            "path": "nvidia-container-runtime"
        }
    }
}
EOF

# 重启 Docker 服务
sudo systemctl restart docker
```

**其他可用镜像源:**
- 阿里云: `https://[your-id].mirror.aliyuncs.com` (需要注册)
- 网易: `https://hub-mirror.c.163.com`
- 腾讯云: `https://mirror.ccs.tencentyun.com`

---

## 部署配置

### 最终配置参数
- 服务器地址: 10.10.1.15
- 后端端口: 8000
- 前端端口: 3000
- Nginx: 未启用
- JWT SECRET_KEY: 已自动生成

### 访问地址
- 前端: http://10.10.1.15:3000
- 后端 API: http://10.10.1.15:8000/docs
- 健康检查: http://10.10.1.15:8000/api/health

---

## 常用 Docker 管理命令

### 服务管理
```bash
# 启动服务
./docker-start.sh
# 或
docker compose up -d

# 停止服务
./docker-stop.sh
# 或
docker compose down

# 重启服务
./docker-restart.sh
# 或
docker compose restart

# 查看服务状态
./docker-status.sh
# 或
docker compose ps
```

### 日志查看
```bash
# 查看所有服务日志
./docker-logs.sh
# 或
docker compose logs -f

# 查看后端日志
./docker-logs.sh backend
# 或
docker compose logs -f backend

# 查看前端日志
./docker-logs.sh frontend
# 或
docker compose logs -f frontend
```

### 容器管理
```bash
# 进入后端容器
docker compose exec backend bash

# 进入前端容器
docker compose exec frontend sh

# 查看资源占用
docker stats
```

---

## 注意事项

1. **数据持久化**
   - 数据库文件: `backend/conversation.db` (已挂载到宿主机)
   - 日志文件: `logs/` 目录下
   - 停止容器不会删除数据

2. **数据备份**
   ```bash
   # 定期备份数据库
   mkdir -p backup
   cp backend/conversation.db backup/conversation_$(date +%Y%m%d_%H%M%S).db
   ```

3. **删除数据卷警告**
   ```bash
   # ⚠️ 此命令会删除所有数据,请谨慎使用!
   docker compose down -v
   ```

4. **端口占用检查**
   ```bash
   # 检查端口是否被占用
   netstat -tulpn | grep -E ':(3000|8000)'
   ```

5. **防火墙配置**
   如果外网无法访问,需要开放端口:
   ```bash
   sudo ufw allow 3000/tcp
   sudo ufw allow 8000/tcp
   ```

---

## 故障排查

### 容器无法启动
```bash
# 查看详细日志
docker compose logs backend
docker compose logs frontend

# 检查容器状态
docker compose ps -a

# 重新构建镜像
docker compose build --no-cache
docker compose up -d
```

### 前端无法连接后端
1. 检查 `docker-compose.override.yml` 中的 `NEXT_PUBLIC_API_URL` 配置
2. 确认后端容器正在运行: `docker compose ps`
3. 检查网络连接: `docker network inspect llm-chat-v1_llm-chat-network`

### 数据库错误
```bash
# 进入后端容器检查
docker compose exec backend bash
ls -la conversation.db

# 如需重置数据库(⚠️ 会删除所有数据)
docker compose down
rm backend/conversation.db
docker compose up -d
```

---

## 总结

部署过程中主要遇到了 3 个问题:
1. ✅ Docker Compose 版本兼容问题 - 已修改脚本支持 V2
2. ✅ Docker 用户权限问题 - 已添加用户到 docker 组
3. ✅ Docker 镜像源访问问题 - 已更换可用镜像源

所有问题均已解决,系统成功部署运行。

---

**文档维护:** 如遇到新问题,请及时更新此文档。
