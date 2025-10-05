# Docker 构建缓存使用指南

本目录包含 Docker 构建缓存的导出和导入工具，用于在离线环境中加速重新构建。

## 📋 目录

- [为什么需要缓存](#为什么需要缓存)
- [缓存内容](#缓存内容)
- [使用方法](#使用方法)
- [性能对比](#性能对比)
- [注意事项](#注意事项)
- [故障排查](#故障排查)

## 🎯 为什么需要缓存

### 问题场景
在离线环境中重新构建 Docker 镜像时，会遇到以下问题：
- ❌ 需要重新下载所有基础镜像
- ❌ 需要重新下载所有 Python/Node.js 依赖
- ❌ 构建过程耗时长（30-60分钟）
- ❌ 占用大量网络带宽

### 解决方案
使用 Docker 构建缓存可以：
- ✅ 预先导出基础镜像和依赖
- ✅ 离线环境直接使用缓存
- ✅ 构建时间缩短到 5-10 分钟
- ✅ 无需网络连接

## 📦 缓存内容

### 1. 基础镜像 (base-images.tar)
包含构建所需的基础镜像：
- `python:3.9-slim` - 后端基础镜像
- `node:18-alpine` - 前端基础镜像
- `nginx:alpine` - Web 服务器镜像

**大小**: 约 300-400MB

### 2. 构建缓存 (build-cache.tar)
包含已构建的缓存镜像：
- `llm-chat-backend-cache:latest` - 后端构建缓存
- `llm-chat-frontend-cache:latest` - 前端构建缓存

**大小**: 约 800MB-1GB

### 3. Python 依赖缓存 (pip-cache/)
包含所有 Python 包：
```
fastapi==0.115.5
uvicorn==0.32.1
sqlalchemy==2.0.36
httpx==0.28.1
pydantic==2.10.3
python-dotenv==1.0.1
passlib[bcrypt]==1.7.4
bcrypt==4.0.1
python-jose[cryptography]==3.3.0
python-multipart==0.0.9
```

**大小**: 约 50-100MB

### 4. Node.js 依赖缓存 (npm-cache/)
包含所有 npm 包的缓存：
- Next.js 及其依赖
- React 相关包
- TypeScript 及工具链

**大小**: 约 100-200MB

### 5. node_modules 打包 (node_modules.tar.gz)
完整的 frontend/node_modules 目录打包，可直接解压使用。

**大小**: 约 200-300MB

## 🚀 使用方法

### 步骤 1: 导出缓存（在有网络的环境）

```bash
cd /home/data2/yangyk/llm-chat-v1
bash docker-build-cache/export-build-cache.sh
```

**导出内容**:
- 自动拉取并导出基础镜像
- 构建并导出构建缓存镜像
- 导出 pip 和 npm 依赖缓存
- 打包 node_modules
- 生成缓存清单和导入脚本

**输出目录**: `docker-build-cache/`

### 步骤 2: 传输到目标服务器

```bash
# 方式1: 使用 tar 打包
tar czf docker-build-cache.tar.gz docker-build-cache/
scp docker-build-cache.tar.gz user@target-server:/path/

# 方式2: 直接复制目录
scp -r docker-build-cache/ user@target-server:/path/

# 方式3: 使用 U 盘或其他离线方式
```

### 步骤 3: 导入缓存（在目标服务器）

```bash
# 如果是 tar.gz 包，先解压
tar xzf docker-build-cache.tar.gz

# 导入缓存
cd docker-build-cache
bash import-build-cache.sh
```

**导入过程**:
1. ✅ 导入基础镜像到 Docker
2. ✅ 导入构建缓存镜像
3. ✅ 设置 pip 缓存到 ~/.cache/pip
4. ✅ 设置 npm 缓存到 ~/.npm
5. ✅ 可选：解压 node_modules

### 步骤 4: 使用缓存构建

```bash
# 返回项目根目录
cd ..

# 使用缓存构建（会自动使用已导入的缓存）
docker compose build

# 或者指定使用缓存
docker compose build --build-arg BUILDKIT_INLINE_CACHE=1
```

## 📊 性能对比

### 无缓存构建
```
后端构建: 15-20 分钟
  - 下载基础镜像: 3-5 分钟
  - 安装 Python 依赖: 8-10 分钟
  - 复制代码和配置: 2-3 分钟

前端构建: 20-30 分钟
  - 下载基础镜像: 3-5 分钟
  - npm install: 12-18 分钟
  - npm build: 5-7 分钟

总计: 35-50 分钟
```

### 使用缓存构建
```
后端构建: 2-3 分钟
  - 加载基础镜像: 10-20 秒
  - 使用 pip 缓存: 30-60 秒
  - 复制代码和配置: 30 秒

前端构建: 3-5 分钟
  - 加载基础镜像: 10-20 秒
  - 使用 node_modules: 1-2 分钟
  - npm build: 2-3 分钟

总计: 5-8 分钟
```

**加速比例**: 约 **6-10 倍**

## ⚙️ 高级用法

### 1. 仅导出特定缓存

```bash
# 仅导出基础镜像
docker save python:3.9-slim node:18-alpine nginx:alpine \
    -o docker-build-cache/base-images.tar

# 仅导出 pip 缓存
cp -r ~/.cache/pip docker-build-cache/pip-cache/

# 仅导出 npm 缓存
cp -r ~/.npm docker-build-cache/npm-cache/
```

### 2. 更新缓存

```bash
# 重新构建以更新缓存
docker compose build --no-cache

# 重新导出缓存
bash docker-build-cache/export-build-cache.sh
```

### 3. 验证缓存

```bash
# 查看导入的镜像
docker images | grep -E "python|node|nginx|cache"

# 查看 pip 缓存
ls -lh ~/.cache/pip/

# 查看 npm 缓存
ls -lh ~/.npm/
```

### 4. 手动使用 node_modules

```bash
# 解压到前端目录
tar xzf docker-build-cache/node_modules.tar.gz -C frontend/

# 验证
ls -la frontend/node_modules/
```

## 🔧 Docker Compose 集成

### 在离线部署脚本中使用

修改 `docker-compose.yml` 以使用缓存：

```yaml
services:
  backend:
    build:
      context: ./backend
      cache_from:
        - llm-chat-backend-cache:latest
        - python:3.9-slim
      args:
        - PIP_CACHE_DIR=/root/.cache/pip

  frontend:
    build:
      context: ./frontend
      cache_from:
        - llm-chat-frontend-cache:latest
        - node:18-alpine
      args:
        - NPM_CONFIG_CACHE=/root/.npm
```

### 构建时指定缓存

```bash
# 使用内联缓存
DOCKER_BUILDKIT=1 docker compose build \
    --build-arg BUILDKIT_INLINE_CACHE=1

# 从缓存构建
docker compose build --build-arg BUILDKIT_INLINE_CACHE=1
```

## ⚠️ 注意事项

### 1. 缓存大小
- 完整缓存包约 1.5-2GB
- 建议有至少 5GB 可用磁盘空间
- 可根据需要选择性导出部分缓存

### 2. 缓存有效期
- 基础镜像缓存长期有效
- 依赖缓存在依赖版本不变时有效
- 如果 requirements.txt 或 package.json 变更，需更新缓存

### 3. Docker 版本
- 建议 Docker 20.10+
- 支持 BuildKit 特性
- 兼容 Docker Compose v2

### 4. 文件权限
- 确保导入脚本有执行权限
- pip/npm 缓存目录需要写权限

### 5. 离线环境限制
- 无法安装新依赖（除非已在缓存中）
- 基础镜像标签必须匹配
- 建议提前测试完整构建流程

## 🐛 故障排查

### 问题1: 导入镜像失败

```bash
# 错误: Error loading image
# 解决: 检查 tar 文件完整性
tar -tzf docker-build-cache/base-images.tar | head

# 重新导入
docker load -i docker-build-cache/base-images.tar
```

### 问题2: pip 缓存未生效

```bash
# 检查缓存位置
echo $HOME/.cache/pip
ls -la $HOME/.cache/pip

# 手动设置
export PIP_CACHE_DIR=$HOME/.cache/pip
pip install -r requirements.txt
```

### 问题3: npm 缓存未生效

```bash
# 检查缓存配置
npm config get cache

# 手动设置
npm config set cache $HOME/.npm
npm install
```

### 问题4: 构建仍然很慢

```bash
# 验证镜像已加载
docker images | grep cache

# 强制使用缓存
docker compose build --build-arg BUILDKIT_INLINE_CACHE=1

# 查看构建日志
docker compose build --progress=plain
```

### 问题5: node_modules 解压失败

```bash
# 检查压缩包
tar -tzf docker-build-cache/node_modules.tar.gz | head

# 手动解压
mkdir -p frontend/node_modules
tar xzf docker-build-cache/node_modules.tar.gz -C frontend/
```

## 📚 相关文档

- [离线部署指南](../offline-deployment/OFFLINE_DEPLOYMENT_GUIDE.md)
- [Docker 部署指南](../DOCKER_DEPLOYMENT_GUIDE.md)
- [在线部署指南](../online-deployment/ONLINE_DEPLOYMENT_GUIDE.md)

## 🔄 更新记录

### v1.0 (2025-10-05)
- ✨ 初始版本
- ✅ 支持基础镜像缓存
- ✅ 支持构建缓存镜像
- ✅ 支持 pip/npm 依赖缓存
- ✅ 支持 node_modules 打包
- ✅ 自动生成导入脚本

## 💡 最佳实践

1. **定期更新缓存**
   - 每次依赖更新后重新导出缓存
   - 建议每月更新一次基础镜像

2. **分层缓存策略**
   - 基础镜像：长期缓存
   - 依赖包：中期缓存（依赖变更时更新）
   - 代码层：不缓存（每次构建）

3. **缓存传输优化**
   - 使用压缩减少传输大小
   - 可以分批传输（基础镜像、依赖分开）
   - 使用增量更新（rsync）

4. **离线环境准备**
   - 提前导入所有缓存
   - 测试完整构建流程
   - 准备备用缓存

## 🆘 获取帮助

如遇到问题：
1. 查看本文档的故障排查章节
2. 检查 `cache-manifest.txt` 文件清单
3. 查看 Docker 构建日志
4. 参考离线部署指南

---

**版本**: v1.0
**更新时间**: 2025-10-05
**维护**: LLM Chat Team
