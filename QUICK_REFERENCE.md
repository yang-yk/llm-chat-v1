# 快速参考手册

## 📍 项目信息

### 当前路径
```
/home/data2/yangyk/llm-chat-v1
```

### 访问地址
- **主页**: http://111.19.168.151
- **前端**: http://111.19.168.151:3000
- **后端 API**: http://111.19.168.151:8000/docs

## 🚀 常用命令

### 进入项目目录
```bash
cd /home/data2/yangyk/llm-chat-v1
```

### 服务管理
```bash
# 启动所有服务
docker compose up -d

# 停止所有服务
docker compose down

# 重启所有服务
docker compose restart

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f nginx
```

### 构建和更新
```bash
# 重新构建前端
docker compose build frontend
docker compose up -d frontend

# 重新构建后端
docker compose build backend
docker compose up -d backend

# 重新构建所有服务
docker compose build
docker compose up -d
```

### 进入容器
```bash
# 进入前端容器
docker compose exec frontend sh

# 进入后端容器
docker compose exec backend bash

# 进入 Nginx 容器
docker compose exec nginx sh
```

## 📁 项目结构

```
/home/data2/yangyk/llm-chat-v1/
├── backend/              # 后端代码
│   ├── main.py          # FastAPI 主程序
│   ├── admin_service.py # 管理后台服务
│   └── Dockerfile       # 后端 Docker 镜像
├── frontend/            # 前端代码
│   ├── app/            # Next.js 应用
│   │   ├── page.tsx    # 主页
│   │   ├── admin/      # 管理后台
│   │   └── auth/       # 登录注册
│   ├── components/     # React 组件
│   │   ├── ChatMessage.tsx  # 消息组件
│   │   ├── CodeBlock.tsx    # 代码块组件
│   │   └── ...
│   └── next.config.js  # Next.js 配置
├── nginx/              # Nginx 配置
│   └── default.conf    # 反向代理配置
├── docker-compose.yml  # Docker Compose 配置
└── *.md               # 文档
```

## 🔧 配置文件

### Docker Compose
- **文件**: `docker-compose.yml`
- **网络**:
  - backend: host 模式
  - frontend: 桥接网络
  - nginx: host 模式

### 环境变量
- **后端**: `docker-compose.yml` 中配置
- **前端**: `frontend/.env.local`（如需自定义）

### Nginx
- **配置文件**: `nginx/default.conf`
- **前端代理**: http://127.0.0.1:3000
- **后端代理**: http://127.0.0.1:8000

## 🐛 故障排查

### 容器无法启动
```bash
# 查看容器状态和错误
docker compose ps
docker compose logs

# 强制重建
docker compose down
docker compose build --no-cache
docker compose up -d
```

### 前端无法访问后端
```bash
# 检查后端是否运行
docker compose ps backend
docker compose logs backend

# 检查网络配置
docker network inspect llm-chat-v1_llm-chat-network
```

### Nginx 错误
```bash
# 查看 Nginx 日志
docker compose logs nginx

# 测试配置
docker compose exec nginx nginx -t

# 重启 Nginx
docker compose restart nginx
```

### 磁盘空间不足
```bash
# 检查磁盘使用
df -h /home/data2

# 清理 Docker 资源
docker system prune -a
docker volume prune
docker builder prune -a
```

## 📝 最近更新

### 2025-10-05
- ✅ 项目迁移到 `/home/data2/yangyk/llm-chat-v1`
- ✅ 复制功能优化（双重机制）
- ✅ 点赞点踩可取消
- ✅ 管理后台搜索和分页
- ✅ Docker 网络配置修复

详见：
- [CHANGELOG.md](CHANGELOG.md)
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)

## 🔑 默认账户

### 管理员账户
- **用户名**: admin
- **密码**: （首次运行时设置）

### 创建管理员
```bash
# 进入后端容器
docker compose exec backend bash

# 运行创建管理员脚本（如有）
python create_admin.py
```

## 📊 数据库

### 位置
- **类型**: SQLite
- **路径**: Docker volume `backend-db`
- **文件**: `/app/db/conversation.db`（容器内）

### 备份
```bash
# 导出数据库
docker compose exec backend cp /app/db/conversation.db /tmp/backup.db
docker compose cp backend:/tmp/backup.db ./backup-$(date +%Y%m%d).db
```

### 恢复
```bash
# 导入数据库
docker compose cp ./backup.db backend:/tmp/restore.db
docker compose exec backend cp /tmp/restore.db /app/db/conversation.db
docker compose restart backend
```

## 🌐 网络架构

```
Internet
   ↓
Nginx (port 80) [host network]
   ↓
   ├─→ Frontend (port 3000) [bridge network]
   │      ↓
   │   Backend API (via 172.17.0.1:8000)
   │
   └─→ Backend (port 8000) [host network]
          ↓
       LLM Models (localhost:11551, 11553)
```

## 📚 相关文档

- [README.md](README.md) - 项目介绍
- [CHANGELOG.md](CHANGELOG.md) - 更新日志
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - 迁移指南
- [DEPLOYMENT.md](DEPLOYMENT.md) - 部署指南
- [TROUBLESHOOTING_FAILED_TO_FETCH.md](TROUBLESHOOTING_FAILED_TO_FETCH.md) - 故障排查

## 💡 提示

1. **所有命令都需要在项目目录下执行**:
   ```bash
   cd /home/data2/yangyk/llm-chat-v1
   ```

2. **修改配置后记得重启**:
   ```bash
   docker compose restart [service_name]
   ```

3. **修改代码后需要重新构建**:
   ```bash
   docker compose build [service_name]
   docker compose up -d [service_name]
   ```

4. **定期清理 Docker 资源**:
   ```bash
   docker system prune
   ```

5. **备份数据库**:
   定期备份 `/app/db/conversation.db`
