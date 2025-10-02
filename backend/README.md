# LLM Chat System - 后端服务

基于 FastAPI 的大模型对话后端服务，提供完整的对话管理和LLM API集成。

## 技术栈

- **Web框架**: FastAPI
- **数据库**: SQLite (可切换到 PostgreSQL/MySQL)
- **ORM**: SQLAlchemy
- **HTTP客户端**: httpx (异步)
- **ASGI服务器**: Uvicorn

## 功能特性

- ✨ **多轮对话**: 支持上下文连贯的多轮对话
- 💾 **对话存储**: 自动保存所有对话记录
- 🔄 **会话管理**: 创建、查询、删除对话会话
- 📝 **历史记录**: 获取完整对话历史
- 🚀 **异步处理**: 高性能异步架构
- 📡 **流式响应**: 支持 Server-Sent Events (SSE)
- ⚙️ **模型配置**: 支持多种预设模型和自定义模型
- 👥 **用户配置**: 每个用户独立的模型配置
- 🏷️ **自动标题**: 根据对话内容自动生成标题

## 项目结构

```
backend/
├── main.py                    # FastAPI主应用和路由
├── config.py                  # 配置文件
├── database.py                # 数据库模型和会话管理
├── llm_service.py             # 大模型API调用服务
├── conversation_service.py    # 对话管理服务
└── requirements.txt           # Python依赖
```

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 配置环境变量（可选）

创建 `.env` 文件或使用默认配置：

```bash
# 大模型API配置
LLM_API_URL=http://111.19.168.151:11551/v1/chat/completions
LLM_MODEL=codegeex4-all-9b
LLM_API_KEY=codegeex

# 数据库配置
DATABASE_URL=sqlite:///./conversation.db

# 服务器配置
HOST=0.0.0.0
PORT=8000
```

### 3. 启动服务

```bash
python main.py
```

或使用 uvicorn：

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. 访问服务

- **API文档**: http://localhost:8000/docs
- **健康检查**: http://localhost:8000/api/health

## API接口

### 对话管理

#### 创建对话
```http
POST /conversations
```

**响应**:
```json
{
  "session_id": "uuid",
  "message": "对话会话创建成功"
}
```

#### 获取对话列表
```http
GET /conversations
```

**响应**:
```json
{
  "conversations": [
    {
      "session_id": "uuid",
      "title": "对话标题",
      "created_at": "2025-10-02T10:00:00",
      "updated_at": "2025-10-02T10:30:00",
      "message_count": 10
    }
  ]
}
```

#### 获取对话历史
```http
GET /conversations/{session_id}/history
```

**响应**:
```json
{
  "session_id": "uuid",
  "messages": [
    {
      "role": "user",
      "content": "你好"
    },
    {
      "role": "assistant",
      "content": "你好！有什么可以帮助你的吗？"
    }
  ]
}
```

#### 删除对话
```http
DELETE /conversations/{session_id}
```

### 消息发送

#### 发送消息（支持流式/非流式）
```http
POST /chat
```

**请求体**:
```json
{
  "user_id": "user_xxx",
  "session_id": "uuid",
  "message": "你好",
  "temperature": 0.7,
  "max_tokens": 2000,
  "stream": true
}
```

**非流式响应** (`stream: false`):
```json
{
  "session_id": "uuid",
  "user_message": "你好",
  "assistant_reply": "你好！有什么可以帮助你的吗？"
}
```

**流式响应** (`stream: true`):
```
data: {"chunk": "你好"}
data: {"chunk": "！"}
data: {"chunk": "有什么"}
data: {"chunk": "可以帮助你的吗？"}
data: {"done": true}
```

### 模型配置

#### 获取配置
```http
GET /api/config?user_id=user_xxx
```

**响应**:
```json
{
  "llm_api_url": "http://...",
  "llm_model": "codegeex4-all-9b",
  "llm_api_key": "xxx",
  "preset_models": [...],
  "current_model_type": "codegeex",
  "max_tokens": 2000
}
```

#### 更新配置
```http
POST /api/config
```

**请求体**:
```json
{
  "user_id": "user_xxx",
  "model_type": "codegeex",
  "max_tokens": 2000
}
```

## 数据库

### 数据表结构

#### conversations 表
- `id` - 主键
- `session_id` - 会话唯一标识符
- `title` - 对话标题
- `created_at` - 创建时间
- `updated_at` - 更新时间

#### messages 表
- `id` - 主键
- `conversation_id` - 外键
- `role` - 角色（user/assistant）
- `content` - 消息内容
- `created_at` - 创建时间

#### user_configs 表
- `id` - 主键
- `user_identifier` - 用户标识
- `current_model_type` - 当前模型类型
- `max_tokens` - 最大token数
- `custom_api_url` - 自定义API URL
- `custom_model` - 自定义模型名
- `custom_api_key` - 自定义API密钥

### 切换数据库

修改 `config.py` 中的 `DATABASE_URL`：

```python
# PostgreSQL
DATABASE_URL = "postgresql://user:password@localhost/dbname"

# MySQL
DATABASE_URL = "mysql+pymysql://user:password@localhost/dbname"
```

## 预设模型

系统内置两个预设模型：

1. **CodeGeex 4**
   - URL: http://111.19.168.151:11551/v1/chat/completions
   - Model: codegeex4-all-9b
   - Key: codegeex

2. **GLM-4 32B**
   - URL: http://111.19.168.151:11553/v1/chat/completions
   - Model: glm4_32B_chat
   - Key: glm432b

## 开发说明

### 添加新的API端点

在 `main.py` 中添加新的路由：

```python
@app.get("/api/new-endpoint")
async def new_endpoint():
    return {"message": "新端点"}
```

### 修改LLM服务

编辑 `llm_service.py` 自定义LLM调用逻辑：

```python
class LLMService:
    async def chat_completion(self, messages, temperature, max_tokens):
        # 自定义实现
        pass
```

### 扩展数据库模型

在 `database.py` 中添加新的模型：

```python
class NewModel(Base):
    __tablename__ = "new_table"
    # 定义字段
```

## 性能优化

- 使用异步处理提高并发性能
- SQLite适合中小规模，大规模建议PostgreSQL
- 流式响应减少首字节时间
- 自动清理旧对话（保留最近500条）

## 安全建议

- 生产环境配置具体的CORS域名
- 使用环境变量存储敏感信息
- 定期备份数据库
- 添加用户认证和授权
- 限制API调用频率

## 故障排查

### 数据库连接失败
- 检查 `DATABASE_URL` 配置
- 确保数据库文件有写权限

### LLM API调用失败
- 检查网络连接
- 验证API URL和密钥
- 查看服务器日志

### 端口被占用
- 修改 `config.py` 中的 `PORT`
- 或使用 `uvicorn main:app --port 8001`

## 日志

服务器运行日志会输出到控制台，包括：
- 请求信息
- 错误信息
- 数据库操作
- LLM API调用状态

## 部署

### 开发环境
```bash
python main.py
```

### 生产环境
```bash
# 使用gunicorn + uvicorn worker
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# 或使用systemd服务
sudo systemctl start llm-backend
```

### Docker
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 依赖说明

主要依赖包：
- `fastapi` - Web框架
- `uvicorn` - ASGI服务器
- `sqlalchemy` - ORM
- `httpx` - HTTP客户端
- `pydantic` - 数据验证

## 许可证

MIT License
