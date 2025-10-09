# 模型配置修改指南

## 📋 概述

本指南介绍如何方便地修改系统默认的大模型API接口配置。

## 🎯 三种修改方法

### 方法1：修改配置文件（推荐，最简单）

**适用场景**：永久修改预设模型配置

**步骤**：

1. 编辑 `backend/models_config.py` 文件

2. 修改对应模型的配置：

```python
PRESET_MODELS = {
    "codegeex": {
        "name": "CodeGeex",
        "url": "http://127.0.0.1:11551/v1/chat/completions",  # ← 修改这里
        "model": "codegeex4-all-9b",                          # ← 或这里
        "key": "codegeex"                                     # ← 或这里
    },
    "glm": {
        "name": "GLM-4",
        "url": "http://127.0.0.1:11553/v1/chat/completions",  # ← 修改这里
        "model": "glm4_32B_chat",                             # ← 或这里
        "key": "glm432b"                                      # ← 或这里
    }
}

# 修改默认使用的模型类型
DEFAULT_MODEL_TYPE = "glm"  # ← 改成 "codegeex" 或 "glm"
```

3. 重启后端服务：

```bash
cd /home/data2/yangyk/llm-chat-v1

# Docker 部署
./deployment-manager.sh restart-docker

# 或本地部署
./deployment-manager.sh restart-local
```

### 方法2：使用环境变量（灵活）

**适用场景**：不同环境使用不同配置，不想修改代码

**支持的环境变量**：

```bash
# CodeGeex 配置
CODEGEEX_API_URL=http://your-codegeex-api:port/v1/chat/completions
CODEGEEX_MODEL=your-model-name
CODEGEEX_API_KEY=your-api-key

# GLM 配置
GLM_API_URL=http://your-glm-api:port/v1/chat/completions
GLM_MODEL=your-model-name
GLM_API_KEY=your-api-key

# 默认模型类型
DEFAULT_MODEL_TYPE=glm  # 或 codegeex
```

**使用方法A**：修改 `.env` 文件

```bash
cd /home/data2/yangyk/llm-chat-v1/backend
vim .env
```

添加或修改：

```bash
# CodeGeex 模型配置
CODEGEEX_API_URL=http://192.168.1.100:11551/v1/chat/completions
CODEGEEX_MODEL=codegeex4-all-9b
CODEGEEX_API_KEY=your-key

# GLM 模型配置
GLM_API_URL=http://192.168.1.100:11553/v1/chat/completions
GLM_MODEL=glm4_32B_chat
GLM_API_KEY=your-key

# 默认使用的模型
DEFAULT_MODEL_TYPE=glm
```

**使用方法B**：Docker Compose 环境变量

编辑 `deployment/docker/docker-compose.yml`：

```yaml
services:
  backend:
    environment:
      # ... 其他配置
      - CODEGEEX_API_URL=http://your-ip:11551/v1/chat/completions
      - GLM_API_URL=http://your-ip:11553/v1/chat/completions
      - DEFAULT_MODEL_TYPE=glm
```

### 方法3：直接修改 main.py（不推荐）

**注意**：不推荐此方法，因为升级代码时可能被覆盖。

如果确实需要，编辑 `backend/main.py` 的第184-201行。

## 🔄 常见配置场景

### 场景1：更换CodeGeex服务器地址

**问题**：CodeGeex服务部署在新服务器上

**解决方案**：

编辑 `backend/models_config.py`：

```python
"codegeex": {
    "name": "CodeGeex",
    "url": "http://192.168.1.200:11551/v1/chat/completions",  # 新地址
    "model": "codegeex4-all-9b",
    "key": "codegeex"
},
```

### 场景2：切换默认模型为CodeGeex

**问题**：想让新用户默认使用CodeGeex而不是GLM

**解决方案**：

编辑 `backend/models_config.py`：

```python
DEFAULT_MODEL_TYPE = "codegeex"  # 从 "glm" 改为 "codegeex"
```

### 场景3：添加新的预设模型

**问题**：想添加第三个预设模型（如ChatGPT）

**解决方案**：

1. 编辑 `backend/models_config.py`：

```python
PRESET_MODELS = {
    "codegeex": { ... },
    "glm": { ... },
    "chatgpt": {  # 新增
        "name": "ChatGPT",
        "url": "https://api.openai.com/v1/chat/completions",
        "model": "gpt-4",
        "key": "your-openai-api-key"
    }
}
```

2. 修改 `backend/main.py` 添加对新模型的处理逻辑（需要修改多处）

### 场景4：不同环境使用不同配置

**问题**：开发环境和生产环境使用不同的模型服务器

**解决方案**：使用环境变量

**开发环境** `.env.development`：
```bash
GLM_API_URL=http://localhost:11553/v1/chat/completions
```

**生产环境** `.env.production`：
```bash
GLM_API_URL=http://111.19.168.151:11553/v1/chat/completions
```

## 📝 快速参考

### 修改 CodeGeex 地址

```bash
# 编辑配置
cd /home/data2/yangyk/llm-chat-v1/backend
vim models_config.py

# 修改这一行
"url": "http://新IP:端口/v1/chat/completions"

# 重启服务
cd /home/data2/yangyk/llm-chat-v1
./deployment-manager.sh restart-docker
```

### 修改 GLM 地址

```bash
# 编辑配置
cd /home/data2/yangyk/llm-chat-v1/backend
vim models_config.py

# 在 glm 部分修改
"url": "http://新IP:端口/v1/chat/completions"

# 重启服务
cd /home/data2/yangyk/llm-chat-v1
./deployment-manager.sh restart-docker
```

### 切换默认模型

```bash
# 编辑配置
cd /home/data2/yangyk/llm-chat-v1/backend
vim models_config.py

# 修改这一行
DEFAULT_MODEL_TYPE = "codegeex"  # 或 "glm"

# 重启服务
cd /home/data2/yangyk/llm-chat-v1
./deployment-manager.sh restart-docker
```

## ⚙️ 配置优先级

当同时使用多种方式配置时，优先级如下：

```
环境变量 > 配置文件 (models_config.py) > 代码默认值
```

例如：
- `models_config.py` 中设置：`url="http://127.0.0.1:11551"`
- `.env` 中设置：`CODEGEEX_API_URL=http://192.168.1.100:11551`
- **实际使用**：`http://192.168.1.100:11551` (环境变量优先)

## 🔍 验证配置

### 检查当前配置

```bash
# 查看环境变量
cd /home/data2/yangyk/llm-chat-v1/backend
cat .env | grep -E "CODEGEEX|GLM|DEFAULT"

# 查看配置文件
cat models_config.py
```

### 测试配置

启动后端后，访问配置API：

```bash
# 获取当前配置（需要先登录获取token）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/config?user_id=1
```

## 🐛 故障排查

### 问题1：修改配置后没有生效

**原因**：没有重启服务

**解决**：
```bash
cd /home/data2/yangyk/llm-chat-v1
./deployment-manager.sh restart-docker
```

### 问题2：环境变量不生效

**原因**：Docker部署时需要在docker-compose.yml中配置

**解决**：编辑 `deployment/docker/docker-compose.yml`，在backend服务的environment中添加

### 问题3：连接不上新的模型服务

**检查清单**：
- [ ] 新地址是否可以ping通
- [ ] 端口是否开放
- [ ] API路径是否正确（通常是 `/v1/chat/completions`）
- [ ] 网络模式（Docker使用host模式，可以访问宿主机服务）

## 📚 相关文件

| 文件 | 用途 | 说明 |
|------|------|------|
| `backend/models_config.py` | 模型配置文件 | **推荐修改** |
| `backend/.env` | 环境变量 | 可覆盖配置文件 |
| `backend/main.py` | 主程序 | 不推荐直接修改 |
| `deployment/docker/docker-compose.yml` | Docker配置 | Docker环境变量 |

## 💡 最佳实践

1. **开发环境**：直接修改 `models_config.py`
2. **测试环境**：使用 `.env` 文件
3. **生产环境**：使用 Docker Compose 环境变量
4. **团队协作**：将 `models_config.py` 加入版本控制，`.env` 不加入版本控制

---

**更新日期**：2025-10-09
**维护者**：DevOps Team
