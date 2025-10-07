# 管理员账户和数据库配置说明

## 重要改动总结

### 1. 数据库统一（✅ 已完成）

本地部署和Docker部署现在**共享同一个数据库文件**：

```
数据库位置: /home/data2/yangyk/llm-chat-v1/db/conversation.db
```

- **本地部署**: 直接读写该文件
- **Docker部署**: 通过卷挂载访问该文件（`../../db:/app/db`）

### 2. 自动初始化管理员（✅ 已完成）

在应用启动时，后端会自动检查并创建默认管理员：

**默认管理员账户：**
- 用户名：`admin`
- 密码：`Admin@2025`
- 邮箱：`admin@example.com`

**逻辑说明：**
- 如果数据库中已存在`admin`用户 → 跳过，不重复创建
- 如果不存在`admin`用户 → 自动创建

**启动日志确认：**
```bash
# 已存在管理员时
✓ 管理员账户已存在: admin

# 首次启动创建时
✅ 默认管理员创建成功 (用户名: admin, 密码: Admin@2025)
```

### 3. Conda环境支持（✅ 已完成）

`deployment/local/start.sh` 现在会自动检测并使用 `py38` conda环境：

```bash
# 如果检测到py38环境，会自动使用
📦 使用conda环境: py38
```

### 4. 配置文件变更

#### docker-compose.yml
```yaml
volumes:
  # 挂载宿主机数据库目录（与本地部署共享数据库）
  - ../../db:/app/db
  # 挂载宿主机日志目录
  - ../../logs:/app/logs
```

#### main.py
添加了启动事件处理，自动初始化管理员：

```python
@app.on_event("startup")
async def startup_event():
    init_db()
    print("数据库初始化完成")

    # 自动创建默认超级管理员（如果不存在）
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            # 创建默认管理员...
```

## 验证步骤

### 检查数据库是否共享

```bash
# 1. 启动本地部署
cd /home/data2/yangyk/llm-chat-v1/deployment/local
bash start.sh

# 查看日志，应该看到：
# ✓ 管理员账户已存在: admin

# 2. 切换到Docker部署
cd /home/data2/yangyk/llm-chat-v1
./deployment-manager.sh start-docker

# 查看Docker日志，应该也看到：
docker compose logs backend | grep "管理员"
# 输出: ✓ 管理员账户已存在: admin
```

### 登录管理后台

**本地部署访问：**
- URL: http://111.19.168.151:3000/admin
- 用户名: admin
- 密码: Admin@2025

**Docker部署访问：**
- URL: http://111.19.168.151/admin
- 用户名: admin
- 密码: Admin@2025

## 常见问题

### Q1: 如何重置admin密码？

删除数据库文件并重新启动：

```bash
# 停止所有服务
./deployment-manager.sh stop-all

# 删除数据库（会丢失所有数据！）
rm /home/data2/yangyk/llm-chat-v1/db/conversation.db

# 重新启动，会自动创建admin（密码Admin@2025）
./deployment-manager.sh start-local
# 或
./deployment-manager.sh start-docker
```

### Q2: 如何查看当前管理员？

```bash
cd /home/data2/yangyk/llm-chat-v1/backend

# 使用set_admin.py查询
python -c "
from database import SessionLocal, User, init_db
init_db()
db = SessionLocal()
admins = db.query(User).filter(User.is_admin == True).all()
for admin in admins:
    print(f'- {admin.username} (ID: {admin.id})')
db.close()
"
```

### Q3: 本地和Docker可以同时运行吗？

**不建议**，因为：
1. 它们现在共享同一个数据库文件，可能导致锁定冲突
2. 它们监听相同的端口（8000, 3000, 80）

使用 `deployment-manager.sh` 自动管理部署切换：

```bash
# 自动停止其他部署并启动Docker
./deployment-manager.sh start-docker

# 自动停止其他部署并启动本地
./deployment-manager.sh start-local
```

## 部署流程

### 首次部署

```bash
# 1. 应用配置
./apply-config.sh deployment-config.local.json

# 2. 启动部署（Docker或本地）
./deployment-manager.sh start-docker
# 或
./deployment-manager.sh start-local

# 3. 自动创建管理员（首次启动时）
# 查看日志确认：
tail -f logs/backend.log
# 应该看到：✅ 默认管理员创建成功
```

### 后续部署

```bash
# 启动任意部署方式，都会检测到已存在的admin
./deployment-manager.sh start-local
# 日志显示：✓ 管理员账户已存在: admin
```

## 文件位置

- 数据库: `/home/data2/yangyk/llm-chat-v1/db/conversation.db`
- 日志: `/home/data2/yangyk/llm-chat-v1/logs/backend.log`
- 管理员脚本: `/home/data2/yangyk/llm-chat-v1/backend/set_admin.py`
- 部署管理: `/home/data2/yangyk/llm-chat-v1/deployment-manager.sh`

## 安全建议

1. **修改默认密码**: 首次登录后立即在管理后台修改密码
2. **限制访问**: 配置防火墙规则，只允许可信IP访问
3. **定期备份**: 备份数据库文件
4. **监控日志**: 定期查看 `logs/backend.log`
