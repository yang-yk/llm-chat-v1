# 📁 项目结构说明

## 完整目录树

```
llm-chat-system/
│
├── backend/                          # 后端服务
│   ├── main.py                      # FastAPI主应用和路由 (420行)
│   ├── config.py                    # 配置管理 (17行)
│   ├── database.py                  # 数据库模型和ORM (78行)
│   ├── llm_service.py               # LLM API调用服务 (133行)
│   ├── conversation_service.py      # 对话管理服务 (260行)
│   ├── requirements.txt             # Python依赖包
│   ├── .env.example                 # 环境变量示例
│   └── README.md                    # 后端文档
│
├── frontend/                         # 前端应用
│   ├── app/                         # Next.js App Router
│   │   ├── page.tsx                 # 主页面 (200行)
│   │   ├── layout.tsx               # 根布局 (20行)
│   │   └── globals.css              # 全局样式 (50行)
│   │
│   ├── components/                  # React组件
│   │   ├── Sidebar.tsx              # 侧边栏组件 (100行)
│   │   ├── ChatMessages.tsx         # 消息列表组件 (50行)
│   │   ├── ChatMessage.tsx          # 单条消息组件 (60行)
│   │   ├── MessageInput.tsx         # 输入框组件 (60行)
│   │   └── SettingsModal.tsx        # 设置弹窗组件 (150行)
│   │
│   ├── lib/                         # 工具库
│   │   ├── api.ts                   # API集成层 (170行)
│   │   └── types.ts                 # TypeScript类型定义 (60行)
│   │
│   ├── public/                      # 静态资源
│   ├── node_modules/                # npm包（自动生成）
│   ├── .next/                       # 构建输出（自动生成）
│   │
│   ├── package.json                 # npm配置和依赖
│   ├── package-lock.json            # 依赖锁定文件
│   ├── tsconfig.json                # TypeScript配置
│   ├── next.config.js               # Next.js配置
│   ├── tailwind.config.ts           # Tailwind CSS配置
│   ├── postcss.config.js            # PostCSS配置
│   ├── .gitignore                   # Git忽略规则
│   ├── .env.example                 # 环境变量示例
│   └── README.md                    # 前端文档
│
├── logs/                            # 日志目录（运行时生成）
│   ├── backend.log                  # 后端日志
│   ├── frontend.log                 # 前端日志
│   ├── backend.pid                  # 后端进程ID
│   └── frontend.pid                 # 前端进程ID
│
├── start.sh                         # 启动脚本
├── stop.sh                          # 停止脚本
├── README.md                        # 项目主文档
├── QUICKSTART.md                    # 快速开始指南
├── STRUCTURE.md                     # 本文件
├── LICENSE                          # MIT许可证
└── .gitignore                       # Git忽略规则
```

## 文件说明

### 后端核心文件

#### main.py
- **作用**: FastAPI主应用，定义所有API路由
- **功能**:
  - 对话管理（创建、查询、删除）
  - 消息发送（流式/非流式）
  - 模型配置管理
  - CORS配置
  - 健康检查接口

#### config.py
- **作用**: 集中管理配置
- **内容**:
  - LLM API配置
  - 数据库连接配置
  - 服务器配置（主机、端口）

#### database.py
- **作用**: 数据库模型和会话管理
- **模型**:
  - Conversation: 对话会话
  - Message: 消息记录
  - UserConfig: 用户配置

#### llm_service.py
- **作用**: 封装LLM API调用
- **功能**:
  - 非流式对话
  - 流式对话（SSE）
  - 错误处理

#### conversation_service.py
- **作用**: 对话业务逻辑
- **功能**:
  - 对话创建和管理
  - 消息存储
  - 标题自动生成
  - 旧对话清理

### 前端核心文件

#### app/page.tsx
- **作用**: 主应用页面
- **功能**:
  - 状态管理（对话、消息、配置）
  - 事件处理
  - 组件整合

#### components/Sidebar.tsx
- **作用**: 侧边栏组件
- **功能**:
  - 对话列表展示
  - 新建对话
  - 选择/删除对话
  - 折叠/展开

#### components/ChatMessages.tsx
- **作用**: 消息列表组件
- **功能**:
  - 渲染所有消息
  - 自动滚动
  - 加载状态
  - 欢迎页面

#### components/MessageInput.tsx
- **作用**: 消息输入组件
- **功能**:
  - 自适应高度
  - 快捷键支持
  - 发送按钮

#### components/SettingsModal.tsx
- **作用**: 设置弹窗组件
- **功能**:
  - 模型选择
  - 参数配置
  - 保存设置

#### lib/api.ts
- **作用**: API集成层
- **功能**:
  - 封装所有后端API调用
  - 流式响应处理
  - 用户ID管理

#### lib/types.ts
- **作用**: TypeScript类型定义
- **内容**:
  - API请求/响应类型
  - 组件Props类型
  - 数据模型类型

### 配置文件

#### backend/requirements.txt
```
fastapi
uvicorn
sqlalchemy
httpx
pydantic
```

#### frontend/package.json
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "next": "^15.0.0",
    "typescript": "^5.5.0",
    "tailwindcss": "^3.4.0",
    "highlight.js": "^11.9.0"
  }
}
```

### 脚本文件

#### start.sh
- **作用**: 一键启动脚本
- **功能**:
  - 环境检查
  - 依赖安装
  - 服务启动
  - 状态监控

#### stop.sh
- **作用**: 停止服务脚本
- **功能**:
  - 停止后端
  - 停止前端
  - 清理PID文件

## 数据流

### 创建对话流程
```
用户点击"新对话"
  ↓
frontend/app/page.tsx (handleNewChat)
  ↓
frontend/lib/api.ts (createConversation)
  ↓
HTTP POST /conversations
  ↓
backend/main.py (@app.post("/conversations"))
  ↓
backend/conversation_service.py (create_conversation)
  ↓
backend/database.py (Conversation model)
  ↓
返回 session_id
```

### 发送消息流程（流式）
```
用户输入消息并发送
  ↓
frontend/app/page.tsx (handleSendMessage)
  ↓
frontend/lib/api.ts (sendMessageStream)
  ↓
HTTP POST /chat (stream: true)
  ↓
backend/main.py (@app.post("/chat"))
  ↓
backend/conversation_service.py (chat_stream)
  ↓
backend/llm_service.py (chat_completion_stream)
  ↓
Server-Sent Events (SSE)
  ↓
AsyncGenerator 逐步返回
  ↓
frontend 实时更新UI
```

## 代码统计

| 分类 | 文件数 | 代码行数 |
|------|--------|---------|
| 后端Python | 5 | ~900 |
| 前端TypeScript | 8 | ~900 |
| 配置文件 | 10 | ~200 |
| 文档 | 6 | ~2000 |
| 脚本 | 2 | ~300 |
| **总计** | **31** | **~4300** |

## 运行时生成的文件

执行启动脚本后会生成：

```
llm-chat-system/
├── backend/
│   └── conversation.db          # SQLite数据库
├── frontend/
│   ├── node_modules/           # npm包（约147个包）
│   └── .next/                  # Next.js构建输出
└── logs/
    ├── backend.log
    ├── frontend.log
    ├── backend.pid
    └── frontend.pid
```

## 依赖关系

### 后端依赖
```
main.py
  ├─→ config.py
  ├─→ database.py
  ├─→ conversation_service.py
  │     ├─→ database.py
  │     └─→ llm_service.py
  └─→ llm_service.py
        └─→ config.py
```

### 前端依赖
```
app/page.tsx
  ├─→ components/Sidebar.tsx
  ├─→ components/ChatMessages.tsx
  │     └─→ components/ChatMessage.tsx
  ├─→ components/MessageInput.tsx
  ├─→ components/SettingsModal.tsx
  ├─→ lib/api.ts
  │     └─→ lib/types.ts
  └─→ lib/types.ts
```

## 端口使用

- **8000**: 后端FastAPI服务
- **3000**: 前端Next.js服务

## 环境变量

### 后端 (.env)
- `LLM_API_URL`: LLM API地址
- `LLM_MODEL`: 模型名称
- `LLM_API_KEY`: API密钥
- `DATABASE_URL`: 数据库连接
- `HOST`: 服务器主机
- `PORT`: 服务器端口

### 前端 (.env.local)
- `NEXT_PUBLIC_API_URL`: 后端API地址

## 技术栈版本

| 技术 | 版本 |
|------|------|
| Python | 3.8+ |
| FastAPI | Latest |
| SQLAlchemy | Latest |
| Node.js | 18+ |
| React | 18 |
| Next.js | 15 |
| TypeScript | 5 |
| Tailwind CSS | 3 |

## 许可证

MIT License - 详见 [LICENSE](LICENSE)
