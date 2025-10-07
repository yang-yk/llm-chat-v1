# 离线部署快速开始

> 5分钟快速了解如何在无网络环境部署LLM Chat System

## 一、选择部署方式

| 部署方式 | 适用场景 | 离线包大小 |
|---------|---------|-----------|
| **本地部署** | 开发/测试环境，资源受限 | 1-2.5GB |
| **Docker部署** | 生产环境，多机部署 | 1-5.5GB |

## 二、准备离线包（在联网机器上）

### 本地部署

```bash
cd /path/to/llm-chat-v1/deployment/local
bash export-conda-env.sh
```

**生成文件**: `offline-packages/py38-env.tar.gz` 及相关文件

### Docker部署

```bash
cd /path/to/llm-chat-v1/deployment/docker
bash export-docker-images.sh
```

**生成文件**: `offline-packages/*.tar` 镜像文件及相关配置

## 三、传输到目标机器

```bash
# 打包整个项目（推荐）
cd /path/to/llm-chat-v1
tar -czf llm-chat-complete.tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=__pycache__ \
  --exclude=.git \
  .

# 传输（使用U盘、移动硬盘或内网）
# 方法1: 物理传输（U盘/硬盘）
# 方法2: 内网scp
scp llm-chat-complete.tar.gz user@target:/path/
```

## 四、在目标机器部署

### 本地部署

```bash
# 1. 解压项目
tar -xzf llm-chat-complete.tar.gz
cd llm-chat-v1

# 2. 导入conda环境
cd deployment/local
bash import-conda-env.sh

# 3. 启动服务
bash start.sh

# 4. 访问
# http://your-ip:3000
```

### Docker部署

```bash
# 1. 解压项目
tar -xzf llm-chat-complete.tar.gz
cd llm-chat-v1

# 2. 导入Docker镜像
cd deployment/docker
bash import-docker-images.sh
# （脚本会询问是否启动服务，选择Y）

# 3. 访问
# http://your-ip
```

## 五、验证部署

### 检查服务

```bash
# 本地部署
ps aux | grep -E "uvicorn|next"
curl http://127.0.0.1:8000/api/health

# Docker部署
docker compose ps
curl http://127.0.0.1/api/health
```

### 访问测试

1. 打开浏览器访问：
   - 本地部署：`http://your-ip:3000`
   - Docker部署：`http://your-ip`

2. 使用默认账户登录：
   - 用户名：`admin`
   - 密码：`Admin@2025`

3. 测试对话功能

## 六、常用命令

### 本地部署

```bash
cd deployment/local

# 启动
bash start.sh

# 停止
bash stop.sh

# 查看日志
tail -f ../../logs/backend.log
tail -f ../../logs/frontend.log
```

### Docker部署

```bash
cd deployment/docker

# 启动
docker compose up -d

# 停止
docker compose down

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f

# 重启
docker compose restart
```

## 七、故障排除

### 端口被占用

```bash
# 查看端口
netstat -tulnp | grep -E "80|3000|8000"

# 清理端口
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### 服务无法启动

```bash
# 本地部署 - 查看日志
tail -50 logs/backend.log
tail -50 logs/frontend.log

# Docker部署 - 查看日志
docker compose logs backend
docker compose logs frontend
```

### 重置管理员密码

```bash
# 本地部署
cd backend
python set_admin.py --username admin --password "NewPassword"

# Docker部署
docker compose exec backend python set_admin.py --username admin --password "NewPassword"
```

## 八、文档索引

### 主要文档

- **[OFFLINE_DEPLOYMENT.md](OFFLINE_DEPLOYMENT.md)** - 离线部署总指南
- **[deployment/local/OFFLINE_DEPLOYMENT_GUIDE.md](deployment/local/OFFLINE_DEPLOYMENT_GUIDE.md)** - 本地部署详细指南
- **[deployment/docker/OFFLINE_DEPLOYMENT_GUIDE.md](deployment/docker/OFFLINE_DEPLOYMENT_GUIDE.md)** - Docker部署详细指南

### 其他文档

- [README.md](README.md) - 项目总览
- [QUICK_START.md](QUICK_START.md) - 在线部署快速开始
- [SCRIPTS_REFERENCE.md](SCRIPTS_REFERENCE.md) - 脚本使用参考

## 九、关键脚本

### 本地部署

| 脚本 | 用途 |
|-----|------|
| `deployment/local/export-conda-env.sh` | 导出conda环境 |
| `deployment/local/import-conda-env.sh` | 导入conda环境 |
| `deployment/local/start.sh` | 启动服务 |
| `deployment/local/stop.sh` | 停止服务 |

### Docker部署

| 脚本 | 用途 |
|-----|------|
| `deployment/docker/export-docker-images.sh` | 导出Docker镜像 |
| `deployment/docker/import-docker-images.sh` | 导入Docker镜像 |
| `deployment/docker/docker-compose.yml` | Docker编排 |

## 十、完整流程图

```
┌─────────────────────────────────────────────┐
│          联网机器（准备阶段）                  │
├─────────────────────────────────────────────┤
│  1. 运行导出脚本                              │
│     - 本地: export-conda-env.sh              │
│     - Docker: export-docker-images.sh        │
│  2. 获得离线包                                │
│  3. 打包完整项目                              │
└─────────────────────────────────────────────┘
                    ↓
            传输（U盘/内网）
                    ↓
┌─────────────────────────────────────────────┐
│          目标机器（部署阶段）                  │
├─────────────────────────────────────────────┤
│  1. 解压项目文件                              │
│  2. 运行导入脚本                              │
│     - 本地: import-conda-env.sh              │
│     - Docker: import-docker-images.sh        │
│  3. 启动服务                                  │
│     - 本地: start.sh                         │
│     - Docker: 导入脚本自动启动                │
│  4. 访问验证                                  │
│     - 本地: http://ip:3000                   │
│     - Docker: http://ip                      │
└─────────────────────────────────────────────┘
```

## 十一、时间估算

| 阶段 | 本地部署 | Docker部署 |
|-----|---------|-----------|
| 导出准备 | 10-30分钟 | 15-45分钟 |
| 文件传输 | 取决于传输方式 | 取决于传输方式 |
| 导入部署 | 5-15分钟 | 5-15分钟 |
| **总计** | **20-60分钟** | **25-75分钟** |

## 十二、检查清单

### 准备阶段
- [ ] 确定部署方式
- [ ] 在联网机器运行导出脚本
- [ ] 验证离线包完整性
- [ ] 打包完整项目
- [ ] 准备传输介质

### 部署阶段
- [ ] 传输文件到目标机器
- [ ] 解压项目文件
- [ ] 运行导入脚本
- [ ] 启动服务
- [ ] 验证服务状态
- [ ] 测试前端访问
- [ ] 测试管理员登录
- [ ] 测试对话功能
- [ ] 修改默认密码

### 生产环境额外检查
- [ ] 配置防火墙
- [ ] 设置HTTPS（可选）
- [ ] 配置自动备份
- [ ] 设置监控告警
- [ ] 准备回滚方案

## 需要帮助？

- 详细问题请查看对应的详细指南文档
- 检查日志文件获取错误信息
- 验证系统要求是否满足
- 确认文件完整性（使用sha256sum）

---

**提示**: 首次部署建议先在测试环境验证，确认无误后再在生产环境部署。
