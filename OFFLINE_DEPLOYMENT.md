# 离线部署总指南

## 概述

本文档提供LLM Chat System在无网络环境下的完整部署方案。支持两种部署方式：

1. **本地部署** - 直接在宿主机上运行（使用conda环境）
2. **Docker部署** - 使用Docker容器运行（推荐）

## 快速选择

### 选择本地部署，如果：
- ✅ 熟悉Python和Node.js环境管理
- ✅ 需要灵活调试和开发
- ✅ 系统资源有限
- ✅ 已有conda环境或易于安装

### 选择Docker部署，如果：
- ✅ 希望环境一致性和隔离性
- ✅ 需要快速部署和迁移
- ✅ 已有Docker环境或易于安装
- ✅ 生产环境部署（推荐）

## 对比表

| 特性 | 本地部署 | Docker部署 |
|-----|---------|-----------|
| 环境隔离 | ❌ 共享宿主机环境 | ✅ 完全隔离 |
| 部署难度 | 中等 | 简单 |
| 资源占用 | 低 | 中等 |
| 启动速度 | 快 | 中等 |
| 环境一致性 | 中等 | 高 |
| 迁移便利性 | 中等 | 高 |
| 调试便利性 | 高 | 中等 |
| 生产推荐度 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 部署流程总览

### 阶段1: 在联网机器上准备

#### 本地部署准备
```bash
cd deployment/local
bash export-conda-env.sh  # 导出conda环境（约10-30分钟）
```

#### Docker部署准备
```bash
cd deployment/docker
bash export-docker-images.sh  # 导出Docker镜像（约15-45分钟）
```

### 阶段2: 传输到目标机器

将生成的离线包传输到目标机器：
- 本地部署：`deployment/local/offline-packages/`（约1-2.5GB）
- Docker部署：`deployment/docker/offline-packages/`（约1-5.5GB）

### 阶段3: 在离线机器上部署

#### 本地部署
```bash
cd deployment/local
bash import-conda-env.sh  # 导入环境（约5-15分钟）
bash start.sh             # 启动服务
```

#### Docker部署
```bash
cd deployment/docker
bash import-docker-images.sh  # 导入镜像（约5-15分钟）
# 脚本会询问是否启动服务
```

## 详细文档

### 📘 本地部署详细指南
**文档位置**: [deployment/local/OFFLINE_DEPLOYMENT_GUIDE.md](deployment/local/OFFLINE_DEPLOYMENT_GUIDE.md)

**主要内容**:
- conda环境导出和导入
- 前端依赖准备
- 完整的手动安装步骤
- 故障排除
- 性能优化

**关键脚本**:
- `export-conda-env.sh` - 导出conda py38环境
- `import-conda-env.sh` - 导入并安装conda环境
- `start.sh` - 启动本地服务
- `stop.sh` - 停止本地服务

### 📗 Docker部署详细指南
**文档位置**: [deployment/docker/OFFLINE_DEPLOYMENT_GUIDE.md](deployment/docker/OFFLINE_DEPLOYMENT_GUIDE.md)

**主要内容**:
- Docker镜像导出和导入
- 构建缓存使用
- Docker离线安装
- 容器管理和监控
- 生产环境建议

**关键脚本**:
- `export-docker-images.sh` - 导出Docker镜像和缓存
- `import-docker-images.sh` - 导入Docker镜像并启动
- `docker-compose.yml` - Docker编排文件

## 离线包结构

### 本地部署离线包

```
deployment/local/offline-packages/
├── py38-env.tar.gz              # conda环境包（500MB-1GB）
├── py38-env.tar.gz.sha256       # 校验和
├── py38-environment.yml         # 环境配置文件
└── README.txt                   # 安装说明
```

### Docker部署离线包

```
deployment/docker/offline-packages/
├── backend-image.tar            # 后端镜像（500MB-1GB）
├── frontend-image.tar           # 前端镜像（500MB-1GB）
├── nginx-image.tar              # Nginx镜像（40MB）
├── backend-cache.tar.gz         # 构建缓存（可选，1-2GB）
├── frontend-cache.tar.gz        # 构建缓存（可选，1-2GB）
├── docker-compose.yml           # 编排文件
├── env.example                  # 环境变量示例
├── nginx/default.conf           # Nginx配置
├── checksums.sha256             # 校验和
├── images-info.txt              # 镜像信息
└── README.txt                   # 安装说明
```

## 系统要求对比

### 本地部署

**最小要求**:
- CPU: 2核
- 内存: 4GB
- 磁盘: 10GB
- 操作系统: Linux x86_64
- 预装: 无（conda环境已打包）
- Node.js: 18.0+（需单独准备）

**推荐配置**:
- CPU: 4核+
- 内存: 8GB+
- 磁盘: 20GB+

### Docker部署

**最小要求**:
- CPU: 2核
- 内存: 4GB
- 磁盘: 15GB
- 操作系统: Linux x86_64
- Docker: 20.10+
- Docker Compose: v2+

**推荐配置**:
- CPU: 4核+
- 内存: 8GB+
- 磁盘: 30GB+
- Docker: 24.0+

## 常见场景

### 场景1: 开发/测试环境

**推荐**: 本地部署

**理由**:
- 启动快，调试方便
- 可以直接修改代码并重启
- 资源占用少

**快速开始**:
```bash
# 在联网机器
cd deployment/local
bash export-conda-env.sh

# 传输并在离线机器导入
bash import-conda-env.sh
bash start.sh
```

### 场景2: 生产环境

**推荐**: Docker部署

**理由**:
- 环境一致性好
- 易于迁移和扩展
- 隔离性好，更安全
- 便于监控和管理

**快速开始**:
```bash
# 在联网机器
cd deployment/docker
bash export-docker-images.sh

# 传输并在离线机器导入
bash import-docker-images.sh
# 自动启动服务
```

### 场景3: 多机部署

**推荐**: Docker部署

**理由**:
- 导出一次，部署多次
- 环境完全一致
- 易于批量管理

**步骤**:
```bash
# 在联网机器导出一次
cd deployment/docker
bash export-docker-images.sh

# 将离线包复制到多台机器
# 在每台机器上
bash import-docker-images.sh
```

### 场景4: 受限环境（无法安装Docker）

**推荐**: 本地部署

**理由**:
- 不依赖Docker
- 可以完全离线运行

**步骤**:
```bash
# 准备conda环境和前端依赖
cd deployment/local
bash export-conda-env.sh

# 在目标机器
bash import-conda-env.sh
bash start.sh
```

## 部署前检查清单

### 联网机器（准备阶段）

- [ ] 确定部署方式（本地 or Docker）
- [ ] 安装必要工具（conda-pack 或 Docker）
- [ ] 运行导出脚本
- [ ] 验证离线包完整性
- [ ] 准备传输介质（U盘/硬盘）
- [ ] 如需要，准备Docker/Node.js安装包

### 目标机器（部署阶段）

- [ ] 检查系统要求（CPU/内存/磁盘）
- [ ] 传输离线包到目标位置
- [ ] 安装基础环境（Docker或Node.js）
- [ ] 解压项目文件
- [ ] 运行导入脚本
- [ ] 配置环境变量
- [ ] 启动服务
- [ ] 验证部署成功

## 快速命令参考

### 本地部署

```bash
# 导出（联网机器）
cd deployment/local
bash export-conda-env.sh

# 导入（离线机器）
bash import-conda-env.sh

# 启动
bash start.sh

# 停止
bash stop.sh

# 查看日志
tail -f ../../logs/backend.log
tail -f ../../logs/frontend.log

# 验证
curl http://127.0.0.1:8000/api/health
```

### Docker部署

```bash
# 导出（联网机器）
cd deployment/docker
bash export-docker-images.sh

# 导入（离线机器）
bash import-docker-images.sh

# 手动启动（如果导入脚本未启动）
docker compose up -d

# 停止
docker compose down

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f

# 重启
docker compose restart

# 验证
curl http://127.0.0.1/api/health
```

## 访问地址

### 本地部署

- 前端: `http://server-ip:3000`
- 后端API: `http://server-ip:8000`
- 管理后台: `http://server-ip:3000/admin`

### Docker部署

- 前端: `http://server-ip` (通过Nginx，端口80)
- 后端API: `http://server-ip/api` (通过Nginx)
- 管理后台: `http://server-ip/admin`

### 默认账户（两种部署方式相同）

- 用户名: `admin`
- 密码: `Admin@2025`

**⚠️ 首次登录后请立即修改密码！**

## 故障排除快速索引

### 通用问题

**Q: 如何验证文件完整性？**
```bash
cd offline-packages
sha256sum -c checksums.sha256  # 或 *.sha256
```

**Q: 端口被占用？**
```bash
# 查看占用
netstat -tulnp | grep -E "80|3000|8000"

# 清理端口
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

**Q: 如何重置管理员密码？**
```bash
# 本地部署
cd backend
python set_admin.py --username admin --password "NewPassword"

# Docker部署
docker compose exec backend python set_admin.py --username admin --password "NewPassword"
```

**Q: 数据库权限问题？**
```bash
# 修复权限
chmod 755 db/
chmod 664 db/conversation.db
```

### 本地部署特定问题

详见: [deployment/local/OFFLINE_DEPLOYMENT_GUIDE.md#故障排除](deployment/local/OFFLINE_DEPLOYMENT_GUIDE.md#故障排除)

**Q: conda-unpack失败？**
```bash
source ~/conda-envs/py38/bin/activate
pip install conda-pack
conda-unpack
```

**Q: 前端构建失败？**
```bash
# 在联网机器预先构建
npm run build
tar -czf .next.tar.gz .next

# 在离线机器解压
tar -xzf .next.tar.gz
npm start
```

### Docker部署特定问题

详见: [deployment/docker/OFFLINE_DEPLOYMENT_GUIDE.md#故障排除](deployment/docker/OFFLINE_DEPLOYMENT_GUIDE.md#故障排除)

**Q: 镜像导入失败？**
```bash
# 检查磁盘空间
docker system df

# 清理空间
docker system prune -a

# 重新导入
docker load -i backend-image.tar
```

**Q: 容器无法启动？**
```bash
# 查看详细日志
docker compose logs backend
docker compose logs frontend

# 检查配置
cat .env
```

## 数据备份

### 重要数据位置

```
llm-chat-v1/
├── db/                          # 数据库（重要！）
│   └── conversation.db
├── logs/                        # 日志
│   ├── backend.log
│   └── frontend.log
├── backend/.env                 # 后端配置
├── frontend/.env.local          # 前端配置
├── nginx/default.conf           # Nginx配置
└── deployment-config.local.json # 部署配置
```

### 备份命令

```bash
# 快速备份数据库
cp db/conversation.db db/conversation.db.backup.$(date +%Y%m%d)

# 完整备份
tar -czf llm-chat-backup-$(date +%Y%m%d).tar.gz \
  db/ \
  logs/ \
  backend/.env \
  frontend/.env.local \
  nginx/default.conf \
  deployment-config.local.json

# 自动备份（添加到crontab）
0 2 * * * cd /path/to/llm-chat-v1 && tar -czf backup-$(date +\%Y\%m\%d).tar.gz db/
```

### 恢复数据

```bash
# 恢复数据库
cp db/conversation.db.backup.20250107 db/conversation.db

# 恢复完整备份
tar -xzf llm-chat-backup-20250107.tar.gz

# 重启服务
# 本地: bash stop.sh && bash start.sh
# Docker: docker compose restart
```

## 性能优化建议

### 本地部署

1. **使用生产模式**
   ```bash
   # start.sh已默认使用npm start（生产模式）
   ```

2. **优化Python环境**
   ```bash
   export PYTHONOPTIMIZE=1
   export PYTHONDONTWRITEBYTECODE=1
   ```

3. **禁用开发工具**
   ```bash
   # next.config.js中已配置禁用开发指示器
   ```

### Docker部署

1. **限制资源使用**
   ```yaml
   # docker-compose.yml
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
   ```

2. **配置日志轮转**
   ```yaml
   services:
     backend:
       logging:
         driver: "json-file"
         options:
           max-size: "10m"
           max-file: "3"
   ```

3. **使用健康检查**
   ```yaml
   services:
     backend:
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
         interval: 30s
   ```

## 安全加固建议

### 1. 修改默认密码（必须）

```bash
# 本地
cd backend
python set_admin.py --username admin --password "StrongPassword@2025"

# Docker
docker compose exec backend python set_admin.py --username admin --password "StrongPassword@2025"
```

### 2. 配置防火墙

```bash
# 开放必要端口
sudo firewall-cmd --permanent --add-port=80/tcp     # Docker部署
sudo firewall-cmd --permanent --add-port=3000/tcp   # 本地部署（前端）
sudo firewall-cmd --permanent --add-port=8000/tcp   # 本地部署（后端）
sudo firewall-cmd --reload
```

### 3. 配置HTTPS（生产环境）

修改nginx配置，添加SSL证书：
```nginx
server {
    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    # ...
}
```

### 4. 限制访问IP（可选）

```nginx
# 在nginx配置中添加
location / {
    allow 192.168.1.0/24;
    deny all;
    # ...
}
```

## 更新和维护

### 更新流程

1. **在联网机器准备更新包**
   ```bash
   # 获取最新代码
   git pull

   # 重新导出环境/镜像
   # 本地: bash export-conda-env.sh
   # Docker: bash export-docker-images.sh
   ```

2. **传输到目标机器**

3. **停止服务**
   ```bash
   # 本地: bash stop.sh
   # Docker: docker compose down
   ```

4. **更新文件**
   ```bash
   # 更新代码
   # 重新导入环境/镜像
   ```

5. **启动服务**
   ```bash
   # 本地: bash start.sh
   # Docker: docker compose up -d
   ```

### 版本管理

建议记录部署的版本信息：

```bash
# 创建版本记录
cat > VERSION.txt << EOF
部署日期: $(date)
部署方式: [本地/Docker]
代码版本: $(git rev-parse HEAD 2>/dev/null || echo "unknown")
部署人员: $(whoami)
备注:
EOF
```

## 监控和日志

### 日志位置

```
logs/
├── backend.log      # 后端日志
└── frontend.log     # 前端日志
```

### 实时监控

```bash
# 查看实时日志
tail -f logs/backend.log
tail -f logs/frontend.log

# 搜索错误
grep -i error logs/*.log

# 查看最近的日志
tail -100 logs/backend.log
```

### Docker日志

```bash
# 查看容器日志
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend

# 导出日志
docker compose logs > docker-logs.txt
```

### 系统监控

```bash
# 查看资源使用
# 本地
ps aux | grep -E "uvicorn|next"
top -p $(pgrep -d',' -f "uvicorn|next")

# Docker
docker compose stats
docker stats
```

## 技术支持和资源

### 文档索引

- [README.md](README.md) - 项目总览
- [QUICK_START.md](QUICK_START.md) - 快速开始
- [SCRIPTS_REFERENCE.md](SCRIPTS_REFERENCE.md) - 脚本参考
- [deployment/local/OFFLINE_DEPLOYMENT_GUIDE.md](deployment/local/OFFLINE_DEPLOYMENT_GUIDE.md) - 本地离线部署详细指南
- [deployment/docker/OFFLINE_DEPLOYMENT_GUIDE.md](deployment/docker/OFFLINE_DEPLOYMENT_GUIDE.md) - Docker离线部署详细指南

### 脚本位置

**本地部署**:
- `deployment/local/export-conda-env.sh` - 导出环境
- `deployment/local/import-conda-env.sh` - 导入环境
- `deployment/local/start.sh` - 启动服务
- `deployment/local/stop.sh` - 停止服务

**Docker部署**:
- `deployment/docker/export-docker-images.sh` - 导出镜像
- `deployment/docker/import-docker-images.sh` - 导入镜像
- `deployment/docker/docker-compose.yml` - 编排文件

**通用工具**:
- `apply-config.sh` - 配置管理
- `deployment-manager.sh` - 部署管理（在线环境）
- `backend/set_admin.py` - 管理员管理

### 排查问题的步骤

1. **检查服务状态**
   ```bash
   # 本地: ps aux | grep -E "uvicorn|next"
   # Docker: docker compose ps
   ```

2. **查看日志**
   ```bash
   # 本地: tail -f logs/*.log
   # Docker: docker compose logs -f
   ```

3. **检查端口**
   ```bash
   netstat -tulnp | grep -E "80|3000|8000"
   ```

4. **检查配置**
   ```bash
   cat backend/.env
   cat frontend/.env.local
   ```

5. **测试连接**
   ```bash
   curl http://127.0.0.1:8000/api/health
   ```

## 总结

离线部署流程：
1. ✅ 选择部署方式（本地/Docker）
2. ✅ 在联网机器导出环境/镜像
3. ✅ 传输到目标机器
4. ✅ 导入环境/镜像
5. ✅ 配置环境变量
6. ✅ 启动服务
7. ✅ 验证部署
8. ✅ 修改默认密码

推荐方案：
- **开发/测试**: 本地部署
- **生产环境**: Docker部署
- **多机部署**: Docker部署

如有问题，请参考详细文档或检查日志。
