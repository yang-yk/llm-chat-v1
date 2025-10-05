# 项目迁移指南

## 迁移信息

### 路径变更
- **旧路径**: `/home/yangyk/llm-chat/llm-chat-v1`
- **新路径**: `/home/data2/yangyk/llm-chat-v1`
- **迁移时间**: 2025-10-05

### 迁移原因
原磁盘空间不足：
- **原磁盘**: `/dev/mapper/ubuntu--vg-ubuntu--lv` (437G，已使用 98%)
- **新磁盘**: `/dev/nvme2n1p1` (3.5T，已使用 33%，可用 2.3T)

## 迁移后的配置

### 1. 项目路径
所有操作需要在新路径下进行：
```bash
cd /home/data2/yangyk/llm-chat-v1
```

### 2. Docker 配置
Docker 容器已在新路径重新部署：
```bash
# 查看容器状态
docker compose ps

# 查看日志
docker compose logs -f

# 重启服务
docker compose restart
```

### 3. 数据持久化
Docker volumes 数据已随容器重新创建：
- `backend-db`: 数据库文件
- `backend-logs`: 后端日志

**注意**: 如果需要保留旧数据，需要手动复制旧路径的 volume 数据。

## 服务访问

### 访问地址（未变）
- **主页**: http://111.19.168.151
- **前端直接访问**: http://111.19.168.151:3000
- **后端 API**: http://111.19.168.151:8000/docs

### 端口映射
- `80`: Nginx 反向代理
- `3000`: 前端服务
- `8000`: 后端 API

## 常用命令

### 启动服务
```bash
cd /home/data2/yangyk/llm-chat-v1
docker compose up -d
```

### 停止服务
```bash
cd /home/data2/yangyk/llm-chat-v1
docker compose down
```

### 重新构建
```bash
cd /home/data2/yangyk/llm-chat-v1

# 重新构建前端
docker compose build frontend
docker compose up -d frontend

# 重新构建后端
docker compose build backend
docker compose up -d backend

# 重新构建所有
docker compose build
docker compose up -d
```

### 查看日志
```bash
cd /home/data2/yangyk/llm-chat-v1

# 查看所有日志
docker compose logs -f

# 查看前端日志
docker compose logs -f frontend

# 查看后端日志
docker compose logs -f backend

# 查看最近 50 行日志
docker compose logs --tail 50
```

### 进入容器
```bash
cd /home/data2/yangyk/llm-chat-v1

# 进入前端容器
docker compose exec frontend sh

# 进入后端容器
docker compose exec backend bash
```

## 更新内容回顾

### 新功能
1. ✅ 复制按钮优化（双重机制）
2. ✅ 点赞点踩可取消
3. ✅ 管理后台用户搜索和分页
4. ✅ 管理后台新标签页打开
5. ✅ 用户列表智能排序

### 配置修复
1. ✅ Docker 网络配置
2. ✅ 前端 API 代理配置
3. ✅ Nginx 反向代理配置

## 旧路径数据迁移（可选）

如果需要保留旧数据库和日志：

### 1. 停止新容器
```bash
cd /home/data2/yangyk/llm-chat-v1
docker compose down
```

### 2. 复制旧数据
```bash
# 查找旧 volume 位置
docker volume ls | grep llm-chat

# 复制数据库文件
# (需要找到旧 volume 的实际路径，通常在 /var/lib/docker/volumes/)
```

### 3. 重新启动
```bash
cd /home/data2/yangyk/llm-chat-v1
docker compose up -d
```

**注意**: 由于 Docker volumes 是独立管理的，建议在迁移前导出数据库备份。

## 故障排查

### 容器无法启动
```bash
# 检查容器状态
docker compose ps

# 查看错误日志
docker compose logs

# 重新构建并启动
docker compose down
docker compose build
docker compose up -d
```

### 网络连接问题
```bash
# 检查网络
docker network ls
docker network inspect llm-chat-v1_llm-chat-network

# 重建网络
docker compose down
docker network prune
docker compose up -d
```

### 磁盘空间检查
```bash
# 检查磁盘使用
df -h /home/data2

# 检查 Docker 磁盘使用
docker system df

# 清理未使用的资源
docker system prune -a
```

## 回滚步骤（如需）

如果需要回滚到旧路径：

1. 停止新路径的服务
```bash
cd /home/data2/yangyk/llm-chat-v1
docker compose down
```

2. 返回旧路径启动
```bash
cd /home/yangyk/llm-chat/llm-chat-v1
docker compose up -d
```

**注意**: 回滚前确保旧路径的文件未被删除。

## 支持

如有问题，请查看：
- `CHANGELOG.md`: 详细更新日志
- `README.md`: 项目说明
- `TROUBLESHOOTING_FAILED_TO_FETCH.md`: 常见问题排查
- Docker 日志: `docker compose logs -f`
