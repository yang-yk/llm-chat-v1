# 脚本使用参考

## 部署管理脚本

### deployment-manager.sh

**用途**：统一管理本地和Docker部署

**位置**：`/home/data2/yangyk/llm-chat-v1/deployment-manager.sh`

**使用方法**：

```bash
./deployment-manager.sh [命令]
```

**可用命令**：

| 命令 | 说明 |
|-----|------|
| `status` | 查看当前部署状态 |
| `start-docker` | 启动Docker部署（自动停止本地） |
| `stop-docker` | 停止Docker部署 |
| `start-local` | 启动本地部署（自动停止Docker） |
| `stop-local` | 停止本地部署 |
| `stop-all` | 停止所有部署 |
| `restart-docker` | 重启Docker部署 |
| `restart-local` | 重启本地部署 |
| `help` | 显示帮助信息 |

**特性**：
- 自动检测并停止冲突的部署
- 自动切换配置类型（docker/local）
- 自动重新应用配置

**示例**：

```bash
# 查看当前状态
./deployment-manager.sh status

# 切换到Docker部署
./deployment-manager.sh start-docker

# 停止所有服务
./deployment-manager.sh stop-all
```

---

## 本地部署脚本

### start.sh

**用途**：启动本地部署（后端+前端）

**位置**：`deployment/local/start.sh`

**使用方法**：

```bash
cd deployment/local
bash start.sh
```

**功能**：
1. 检查Python和Node.js环境
2. 检查后端/前端依赖
3. 自动检测并使用conda py38环境
4. 启动后端服务（uvicorn）
5. 启动前端服务（Next.js生产模式）
6. 等待服务就绪

**输出信息**：
- Python版本
- Node.js版本
- 后端PID和访问地址
- 前端PID和访问地址
- 日志文件位置

**conda环境支持**：
- 自动检测 `py38` conda环境
- 如果存在，自动使用该环境的Python
- 无需手动激活conda

### stop.sh

**用途**：停止本地部署

**位置**：`deployment/local/stop.sh`

**使用方法**：

```bash
cd deployment/local
bash stop.sh
```

**功能**：
1. 根据PID文件停止进程
2. 清理端口8000和3000的残留进程
3. 清理uvicorn和next-server进程
4. 删除PID文件

**支持的进程**：
- uvicorn（后端）
- next-server（前端生产模式）
- node...next（前端开发模式）
- npm...start（npm启动的进程）

---

## 配置管理脚本

### apply-config.sh

**用途**：应用配置文件到各个组件

**位置**：`/home/data2/yangyk/llm-chat-v1/apply-config.sh`

**使用方法**：

```bash
./apply-config.sh [配置文件]
```

**默认配置文件**：`deployment-config.json`

**功能**：
1. 读取JSON配置文件
2. 自动生成JWT密钥（如果未设置）
3. 生成 `backend/.env`
4. 生成 `frontend/.env.local`
5. 生成 `nginx/default.conf`
6. 生成 `deployment/docker/.env`
7. 生成systemd服务文件
8. 备份旧配置（可选）

**智能配置**：
- 自动根据部署类型调整路径
- 统一使用宿主机数据库路径
- Docker通过卷挂载访问

**示例**：

```bash
# 使用默认配置文件
./apply-config.sh

# 使用指定配置文件
./apply-config.sh deployment-config.local.json

# 查看配置摘要后决定
./apply-config.sh deployment-config.local.json
# 会显示配置摘要，等待确认
```

---

## 管理员管理脚本

### set_admin.py

**用途**：非交互式创建/更新管理员

**位置**：`backend/set_admin.py`

**使用方法**：

```bash
cd backend
python set_admin.py --username <用户名> --password <密码> [--email <邮箱>]
```

**参数**：
- `-u, --username`: 管理员用户名（必需）
- `-p, --password`: 管理员密码（必需）
- `-e, --email`: 管理员邮箱（可选）

**功能**：
- 如果用户已存在，更新为管理员并重置密码
- 如果用户不存在，创建新管理员
- 自动创建默认配置

**示例**：

```bash
# 创建/重置admin账户
python set_admin.py --username admin --password "Admin@2025"

# 创建带邮箱的管理员
python set_admin.py --username admin --password "Admin@2025" --email "admin@example.com"

# 创建其他管理员
python set_admin.py --username manager --password "Manager@123" --email "manager@example.com"
```

### create_admin.py

**用途**：交互式管理员管理

**位置**：`backend/create_admin.py`

**使用方法**：

```bash
cd backend
python create_admin.py
```

**功能菜单**：
1. 创建新的管理员账户（交互式输入）
2. 查看所有管理员
3. 将现有用户设置为管理员
4. 退出

---

## Docker管理

### docker-compose.yml

**位置**：`deployment/docker/docker-compose.yml`

**常用命令**：

```bash
cd deployment/docker

# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx

# 重启服务
docker compose restart

# 重新构建并启动
docker compose up -d --build

# 查看资源使用
docker compose stats
```

**服务说明**：
- `backend`: FastAPI后端服务
- `frontend`: Next.js前端服务
- `nginx`: Nginx反向代理

**网络模式**：
- 所有服务使用 `host` 网络模式
- 可直接访问宿主机端口
- 方便访问宿主机的LLM服务

**数据持久化**：
- 数据库：挂载 `../../db` 到容器 `/app/db`
- 日志：挂载 `../../logs` 到容器 `/app/logs`

---

## 快速参考

### 启动服务

```bash
# 本地部署
cd deployment/local && bash start.sh

# Docker部署
./deployment-manager.sh start-docker

# 或
cd deployment/docker && docker compose up -d
```

### 停止服务

```bash
# 本地部署
cd deployment/local && bash stop.sh

# Docker部署
./deployment-manager.sh stop-docker

# 或
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

### 重启服务

```bash
# 本地部署
cd deployment/local
bash stop.sh && bash start.sh

# 或使用管理脚本
./deployment-manager.sh restart-local

# Docker部署
./deployment-manager.sh restart-docker

# 或
cd deployment/docker
docker compose restart
```

### 管理员操作

```bash
# 创建/重置管理员
cd backend
python set_admin.py --username admin --password "Admin@2025"

# 交互式管理
python create_admin.py
```

### 应用配置

```bash
# 修改配置
vim deployment-config.local.json

# 应用配置
./apply-config.sh deployment-config.local.json

# 重启服务
./deployment-manager.sh restart-local  # 或 restart-docker
```

---

## 环境变量

### backend/.env

```bash
LLM_API_URL=http://111.19.168.151:11553/v1/chat/completions
LLM_MODEL=glm4_32B_chat
LLM_API_KEY=glm432b
DATABASE_URL=sqlite:////home/data2/yangyk/llm-chat-v1/db/conversation.db
SECRET_KEY=<自动生成>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
HOST=0.0.0.0
PORT=8000
```

### frontend/.env.local

```bash
NEXT_PUBLIC_API_URL=http://111.19.168.151:8000
```

### deployment/docker/.env

```bash
LLM_API_URL=http://111.19.168.151:11553/v1/chat/completions
LLM_MODEL=glm4_32B_chat
LLM_API_KEY=glm432b
SECRET_KEY=<自动生成>
FRONTEND_API_URL=http://111.19.168.151
```

---

## 故障排查脚本

### 检查端口占用

```bash
netstat -tulnp | grep -E ":(80|3000|8000)"
# 或
ss -tulnp | grep -E ":(80|3000|8000)"
```

### 检查进程

```bash
ps aux | grep -E "uvicorn|next-server|nginx"
```

### 清理端口

```bash
# 清理3000端口
lsof -ti:3000 | xargs kill -9

# 清理8000端口
lsof -ti:8000 | xargs kill -9

# 清理80端口（需要root）
sudo lsof -ti:80 | xargs kill -9
```

### 验证配置

```bash
# 检查数据库路径
cat backend/.env | grep DATABASE_URL

# 检查前端API地址
cat frontend/.env.local

# 检查Docker配置
cat deployment/docker/.env
```

### 查看服务状态

```bash
# Docker
docker compose -f deployment/docker/docker-compose.yml ps

# 进程
ps aux | grep -E "uvicorn|next-server" | grep -v grep

# 端口
netstat -tulnp | grep -E ":(80|3000|8000)"
```
