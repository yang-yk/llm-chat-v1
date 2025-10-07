# 快速开始指南

## 一分钟启动

### 本地部署

```bash
cd /home/data2/yangyk/llm-chat-v1/deployment/local
bash start.sh
```

启动后访问：
- 前端：http://111.19.168.151:3000
- 管理后台：http://111.19.168.151:3000/admin

### Docker部署

```bash
cd /home/data2/yangyk/llm-chat-v1
./deployment-manager.sh start-docker
```

启动后访问：
- 前端：http://111.19.168.151
- 管理后台：http://111.19.168.151/admin

## 默认账户

首次启动会自动创建管理员：

```
用户名: admin
密码: Admin@2025
```

## 常用命令

### 切换部署方式

```bash
# 切换到Docker
./deployment-manager.sh start-docker

# 切换到本地
./deployment-manager.sh start-local

# 查看状态
./deployment-manager.sh status
```

### 停止服务

```bash
# 停止本地部署
cd deployment/local && bash stop.sh

# 停止Docker部署
cd deployment/docker && docker compose down

# 停止所有
./deployment-manager.sh stop-all
```

### 查看日志

```bash
# 本地部署
tail -f logs/backend.log
tail -f logs/frontend.log

# Docker部署
docker compose -f deployment/docker/docker-compose.yml logs -f
```

## 验证部署

### 检查后端
```bash
curl http://127.0.0.1:8000/api/health
# 应该返回: {"status":"ok",...}
```

### 检查前端
访问：http://111.19.168.151:3000
应该看到登录页面

### 检查管理员
查看启动日志：
```bash
tail logs/backend.log
# 应该看到: ✓ 管理员账户已存在: admin
```

## 下一步

1. 访问管理后台修改默认密码
2. 创建普通用户测试对话功能
3. 根据需要调整LLM模型配置

## 需要帮助？

查看详细文档：
- [README.md](README.md) - 完整说明
- [FINAL_SETUP_GUIDE.md](FINAL_SETUP_GUIDE.md) - 详细配置
- [故障排查](#troubleshooting) - 常见问题

## 常见问题

**Q: 端口被占用？**
```bash
cd deployment/local && bash stop.sh
```

**Q: 忘记管理员密码？**
```bash
cd backend
python set_admin.py --username admin --password "Admin@2025"
```

**Q: 如何重置所有数据？**
```bash
./deployment-manager.sh stop-all
rm db/conversation.db
./deployment-manager.sh start-local
```
