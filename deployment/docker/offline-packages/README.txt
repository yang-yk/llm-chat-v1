# Docker离线部署包

## 包含内容
1. backend-image.tar - 后端Docker镜像 (374MB)
2. frontend-image.tar - 前端Docker镜像 (1.4GB)
3. nginx-image.tar - Nginx镜像 (52MB)
4. docker-compose.yml - Docker编排文件
5. env.example - 环境变量示例
6. nginx/default.conf - Nginx配置文件
7. checksums.sha256 - 文件校验和
8. images-info.txt - 镜像详细信息

## 系统要求
- Docker 20.10+
- Docker Compose v2+
- Linux x86_64
- 至少4GB磁盘空间

## 离线安装步骤

### 1. 验证文件完整性（可选）
```bash
cd offline-packages
sha256sum -c checksums.sha256
```

### 2. 导入Docker镜像
```bash
docker load -i backend-image.tar
docker load -i frontend-image.tar
docker load -i nginx-image.tar
```

验证镜像已导入：
```bash
docker images
```

### 3. 准备配置文件

复制nginx配置（如果还没有）：
```bash
mkdir -p ../../nginx
cp nginx/default.conf ../../nginx/
```

准备.env文件：
```bash
cp env.example ../.env
# 编辑.env文件，设置必要的环境变量
vim ../.env
```

### 4. 启动服务
```bash
cd ..
docker compose up -d
```

### 5. 验证部署
```bash
docker compose ps
docker compose logs -f
```

访问：http://your-server-ip

### 6. 停止服务
```bash
docker compose down
```

## 自动化导入

可以使用提供的 import-docker-images.sh 脚本自动导入：

```bash
cd /path/to/llm-chat-v1/deployment/docker
bash import-docker-images.sh
```

## 故障排除

Q: 导入镜像时报错？
A: 确保Docker版本兼容，镜像文件完整无损

Q: 服务无法启动？
A: 检查端口是否被占用（80, 3000, 8000）
   查看日志：docker compose logs

Q: 如何更新配置？
A: 修改docker-compose.yml或.env文件后，重启服务：
   docker compose down
   docker compose up -d

## 注意事项

1. 镜像文件是针对特定架构（通常是linux/amd64）构建的
2. 确保目标机器的Docker版本与构建机器兼容
3. 导入镜像前确保有足够的磁盘空间
4. 生产环境使用前，请修改默认的SECRET_KEY等敏感配置
5. 建议在目标机器上运行完整性检查

## 文件大小说明

- 后端镜像：约374MB
- 前端镜像：约1.4GB
- Nginx镜像：约52MB
- 配置文件：< 10MB

总计：约1.9GB

## 默认访问信息

服务启动后：
- 前端：http://your-ip
- 管理后台：http://your-ip/admin

默认管理员账户：
- 用户名：admin
- 密码：Admin@2025

**重要：首次登录后请立即修改密码！**

## 更多信息

详细部署指南请参考：
- ../OFFLINE_DEPLOYMENT_GUIDE.md - Docker离线部署详细指南
- ../../OFFLINE_DEPLOYMENT.md - 离线部署总指南
- ../../OFFLINE_QUICK_START.md - 5分钟快速开始

## 离线重新构建

如果需要在离线环境中修改代码并重新构建镜像，请查看：

**位置**: `build-cache/` 目录

**快速开始**:
```bash
cd build-cache
bash rebuild.sh
```

**详细文档**:
- `build-cache/README.md` - 完整的重新构建指南
- `build-cache/QUICK_REBUILD.txt` - 快速参考

**适用场景**:
- ✅ 修改业务代码
- ✅ 调整配置文件
- ✅ 修改Dockerfile
- ⚠️ 不适合添加新依赖（需要网络）

**构建速度**:
- 只修改代码: 10-30秒
- 首次构建: 15-30分钟

---

更新时间: $(date)
