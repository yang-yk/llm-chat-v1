# 🤖 LLM Chat System

一个完整的大语言模型对话系统，包含 FastAPI 后端和 React + Next.js 前端。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-green.svg)
![Node](https://img.shields.io/badge/node-18+-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue.svg)

## ✨ 特性

### 核心功能

- 💬 **多轮对话**: 支持上下文连贯的智能对话
- 📝 **对话管理**: 创建、查看、删除对话会话
- 🔄 **流式响应**: 实时显示AI生成内容，流式输出代码块
- ⚙️ **模型配置**: 支持多种预设模型和自定义配置
- 🎨 **代码高亮**: GitHub风格代码高亮，支持一键复制
- 💾 **持久化**: 所有对话自动保存到数据库
- 🏷️ **智能标题**: 根据对话内容自动生成标题
- 👥 **用户配置**: 每个用户独立的模型配置
- 📋 **一键复制**: 支持复制消息内容和代码块
- 📱 **响应式界面**: 优雅的对话界面，完美支持移动端

### 界面特性

- 🎨 **优雅设计**: 现代化聊天界面，清晰的视觉层次
- 💬 **消息气泡**: 用户消息右侧显示（带气泡），AI消息左侧显示（无气泡）
- 🔄 **实时加载**: AI思考时显示动画效果
- 📋 **智能复制**:
  - 用户消息：悬停右下角显示复制按钮
  - AI消息：下方始终显示复制按钮
  - 代码块：右上角固定复制按钮，支持实时复制
- ✏️ **智能输入**:
  - 多行输入支持（Shift+Enter换行）
  - 自动高度调整
  - 保持光标焦点
  - AI回复时允许继续输入
- 🎯 **Markdown渲染**: 完整支持Markdown格式（粗体、斜体、列表、表格等）
- 🌈 **代码高亮**: GitHub主题代码高亮，清晰易读

### 技术亮点

- 🚀 **现代化技术栈**: FastAPI + React + Next.js + TypeScript
- 📱 **响应式设计**: 完美支持桌面和移动设备
- 🎯 **类型安全**: 前后端完整的类型定义
- ⚡ **高性能**: 异步处理 + 流式响应 + 虚拟DOM优化
- 🔌 **易于扩展**: 组件化架构，清晰的代码结构

## 🏗️ 架构

```
llm-chat-system/
├── backend/                 # FastAPI 后端
│   ├── main.py             # 主应用和路由
│   ├── config.py           # 配置管理
│   ├── database.py         # 数据库模型
│   ├── llm_service.py      # LLM API调用
│   ├── conversation_service.py  # 对话管理
│   └── requirements.txt    # Python依赖
│
├── frontend/               # React + Next.js 前端
│   ├── app/               # Next.js页面
│   │   ├── page.tsx       # 主页面
│   │   ├── layout.tsx     # 布局
│   │   └── globals.css    # 全局样式
│   ├── components/        # React组件
│   │   ├── Sidebar.tsx
│   │   ├── ChatMessages.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── MessageInput.tsx
│   │   └── SettingsModal.tsx
│   ├── lib/              # 工具库
│   │   ├── api.ts        # API集成
│   │   └── types.ts      # 类型定义
│   └── package.json      # npm依赖
│
├── start.sh              # 一键启动脚本
└── README.md            # 项目说明（本文件）
```

## 🚀 快速开始

### 方式1: 使用一键启动脚本（推荐）

```bash
# 赋予执行权限
chmod +x start.sh

# 启动项目
./start.sh
```

脚本会自动：
1. 安装后端Python依赖
2. 安装前端npm依赖
3. 启动后端服务（端口8000）
4. 启动前端服务（端口3000）

### 方式2: 手动启动

#### 1. 启动后端

```bash
# 进入后端目录
cd backend

# 安装依赖
pip install -r requirements.txt

# 启动服务
python main.py
```

后端将运行在 http://localhost:8000

#### 2. 启动前端

打开新终端：

```bash
# 进入前端目录
cd frontend

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev
```

前端将运行在 http://localhost:3000

### 3. 访问应用

- **前端界面**: http://localhost:3000
- **后端API文档**: http://localhost:8000/docs
- **健康检查**: http://localhost:8000/api/health

## 📖 使用指南

### 创建新对话

1. 点击左上角"+ 新对话"按钮
2. 系统自动创建新会话
3. 在输入框输入消息开始对话

### 发送消息

- 输入消息后按 `Enter` 发送
- 按 `Shift + Enter` 换行
- 支持多行文本输入

### 查看历史对话

1. 在左侧边栏查看所有对话
2. 点击对话项查看历史记录
3. 每个对话显示标题、消息数和更新时间

### 删除对话

1. 将鼠标悬停在对话项上
2. 点击出现的🗑️按钮
3. 确认删除

### 配置模型

1. 点击右上角"⚙️ 设置"按钮
2. 选择预设模型或自定义模型：
   - **CodeGeex 4**: 代码生成模型
   - **GLM-4 32B**: 通用对话模型
   - **自定义模型**: 配置自己的API
3. 调整最大输出长度 (max_tokens)
4. 点击"保存配置"

## 🔧 配置说明

### 后端配置

创建 `backend/.env` 文件：

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

### 前端配置

创建 `frontend/.env.local` 文件：

```bash
# 后端API地址
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📊 技术栈

### 后端

| 技术 | 版本 | 说明 |
|------|------|------|
| Python | 3.8+ | 编程语言 |
| FastAPI | Latest | Web框架 |
| SQLAlchemy | Latest | ORM |
| SQLite | - | 数据库 |
| httpx | Latest | HTTP客户端 |
| Uvicorn | Latest | ASGI服务器 |

### 前端

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 18 | UI框架 |
| Next.js | 15 | React框架 |
| TypeScript | 5 | 类型系统 |
| Tailwind CSS | 3 | CSS框架 |
| highlight.js | 11 | 代码高亮 |
| react-markdown | Latest | Markdown渲染 |
| remark-gfm | Latest | GitHub Markdown支持 |
| rehype-highlight | Latest | 代码高亮插件 |

## 🔌 API文档

### 主要端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/conversations` | POST | 创建对话 |
| `/conversations` | GET | 获取对话列表 |
| `/conversations/{id}/history` | GET | 获取对话历史 |
| `/conversations/{id}` | DELETE | 删除对话 |
| `/chat` | POST | 发送消息 |
| `/api/config` | GET | 获取配置 |
| `/api/config` | POST | 更新配置 |

详细API文档访问: http://localhost:8000/docs

## 📦 部署

### 开发环境

```bash
# 后端
cd backend && python main.py

# 前端
cd frontend && npm run dev
```

### 生产环境

#### 后端

```bash
# 使用gunicorn
cd backend
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### 前端

```bash
# 构建
cd frontend
npm run build

# 启动
npm start
```

### Docker部署

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:///./conversation.db
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend
```

运行：

```bash
docker-compose up -d
```

## 🛠️ 开发指南

### 后端开发

```bash
cd backend

# 安装开发依赖
pip install -r requirements.txt

# 启动开发服务器（自动重载）
uvicorn main:app --reload --port 8000
```

### 前端开发

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器（热重载）
npm run dev

# 类型检查
npm run type-check

# 代码检查
npm run lint
```

## 🧪 测试

### 后端测试

```bash
cd backend
pytest tests/
```

### 前端测试

```bash
cd frontend
npm run test
```

## 📈 性能优化

### 后端

- ✅ 异步处理提高并发性能
- ✅ 流式响应减少首字节时间
- ✅ 数据库连接池
- ✅ 自动清理旧对话（保留500条）

### 前端

- ✅ Next.js自动代码分割
- ✅ 虚拟DOM优化渲染
- ✅ 图片懒加载
- ✅ CSS按需加载

## 🔒 安全建议

- [ ] 配置CORS允许的具体域名
- [ ] 添加用户认证和授权
- [ ] API请求限流
- [ ] 使用HTTPS
- [ ] 定期备份数据库
- [ ] 环境变量存储敏感信息

## 🐛 故障排查

### 后端无法启动

- 检查Python版本 (3.8+)
- 检查端口8000是否被占用
- 查看错误日志

### 前端无法连接后端

- 确认后端服务正在运行
- 检查 `NEXT_PUBLIC_API_URL` 配置
- 查看浏览器控制台错误

### 数据库错误

- 检查数据库文件权限
- 删除并重新创建数据库
- 查看 SQLite 版本

## 📚 文档

- [后端文档](backend/README.md) - 后端详细说明
- [前端文档](frontend/README.md) - 前端详细说明
- [API文档](http://localhost:8000/docs) - 在线API文档

## 🔄 更新日志

### v1.1.0 (2025-10-03)
- 🎨 **界面优化**: 重新设计聊天界面，提升用户体验
  - 优化消息布局（用户消息右对齐，AI消息左对齐）
  - 添加头像和角色标识
  - 统一背景色，增强可读性
  - 优化侧边栏配色（浅灰色主题）
- 📋 **复制功能**: 新增智能复制功能
  - 消息内容一键复制
  - 代码块独立复制按钮
  - 复制成功状态提示
- ✨ **Markdown增强**:
  - 集成react-markdown实现完整Markdown渲染
  - GitHub风格代码高亮（浅色主题）
  - 支持表格、引用块、列表等格式
- 🔧 **输入优化**:
  - 支持多行输入（Shift+Enter）
  - 保持光标焦点
  - AI回复时允许继续输入
  - 自动高度调整
  - 隐藏滚动条样式
- 💻 **代码块优化**:
  - 流式输出时使用最大宽度
  - 实时代码高亮
  - 固定复制按钮位置
- ⚙️ **设置改进**: 保存配置后自动关闭弹窗

### v1.0.0 (2025-10-02)
- ✨ 初始版本发布
- ✅ 完整的前后端功能
- ✅ 流式响应支持
- ✅ 模型配置管理
- ✅ 代码语法高亮
- ✅ 响应式设计

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 📧 联系方式

如有问题或建议，欢迎联系。

---

⭐ 如果这个项目对你有帮助，欢迎给个Star！
