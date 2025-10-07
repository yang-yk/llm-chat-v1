# Docker 构建缓存快速开始

## 🚀 5 分钟快速上手

### 场景：离线环境需要重新构建 Docker 镜像

#### 在有网络的服务器上

```bash
# 1. 导出缓存
cd /home/data2/yangyk/llm-chat-v1
bash docker-build-cache/export-build-cache.sh

# 2. 打包缓存
tar czf docker-build-cache.tar.gz docker-build-cache/

# 3. 传输到目标服务器
scp docker-build-cache.tar.gz user@target:/path/
```

#### 在离线服务器上

```bash
# 1. 解压缓存
tar xzf docker-build-cache.tar.gz

# 2. 导入缓存
cd docker-build-cache
bash import-build-cache.sh

# 3. 重新构建（使用缓存）
cd /opt/llm-chat  # 或你的项目目录
docker compose build

# 4. 重启服务
docker compose up -d
```

## 📊 效果对比

| 操作 | 无缓存 | 有缓存 | 提升 |
|------|--------|--------|------|
| 后端构建 | 15-20 分钟 | 2-3 分钟 | **6-7倍** |
| 前端构建 | 20-30 分钟 | 3-5 分钟 | **6-8倍** |
| **总计** | **35-50 分钟** | **5-8 分钟** | **6-10倍** |

## 📦 缓存包含内容

- ✅ 基础镜像 (python:3.9-slim, node:18-alpine, nginx:alpine)
- ✅ 构建缓存镜像
- ✅ Python pip 依赖缓存
- ✅ Node.js npm 依赖缓存
- ✅ 前端 node_modules (可选)

## 💡 最佳实践

### 首次离线部署
```bash
# 同时传输镜像和缓存
scp llm-chat-offline-*.tar.gz user@target:/path/
scp docker-build-cache.tar.gz user@target:/path/
```

### 代码更新时
```bash
# 仅传输源码，使用已有缓存重新构建
scp project-source.tar.gz user@target:/path/

# 在目标服务器
tar xzf project-source.tar.gz -C /opt/llm-chat/
cd /opt/llm-chat
docker compose build  # 使用缓存
docker compose restart
```

## 🔧 常用命令

### 导出缓存
```bash
bash docker-build-cache/export-build-cache.sh
```

### 导入缓存
```bash
bash docker-build-cache/import-build-cache.sh
```

### 验证缓存
```bash
# 查看导入的镜像
docker images | grep cache

# 查看 pip 缓存
ls ~/.cache/pip/

# 查看 npm 缓存
ls ~/.npm/
```

### 使用缓存构建
```bash
docker compose build
# 或
DOCKER_BUILDKIT=1 docker compose build
```

## ❓ 常见问题

**Q: 缓存多大？**
A: 约 1.5-2GB，建议有 5GB+ 可用空间

**Q: 缓存多久更新一次？**
A: 当依赖版本变更时更新，建议每月更新一次基础镜像

**Q: 可以只用部分缓存吗？**
A: 可以，按需导入基础镜像、pip缓存或npm缓存

**Q: 缓存失效了怎么办？**
A: 重新导出缓存，或在有网络环境下正常构建

## 📚 更多信息

- 详细教程：[README.md](README.md)
- 集成指南：[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- 离线部署：[../offline-deployment/OFFLINE_DEPLOYMENT_GUIDE.md](../offline-deployment/OFFLINE_DEPLOYMENT_GUIDE.md)

---

**提示**: 缓存可以显著加速离线环境的 Docker 构建，强烈推荐使用！
