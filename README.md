# 🤖 LLM Chat System

一个完整的大语言模型对话系统，包含 FastAPI 后端和 React + Next.js 前端。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-green.svg)
![Node](https://img.shields.io/badge/node-18+-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue.svg)

> **📢 项目路径已更新**
> 项目已从 `/home/yangyk/llm-chat/llm-chat-v1` 迁移到 `/home/data2/yangyk/llm-chat-v1`
> 详见 [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) 和 [CHANGELOG.md](CHANGELOG.md)

## ✨ 特性

### 核心功能

- 👤 **用户认证系统**: 完整的注册、登录、JWT身份验证
- 🛡️ **管理后台**: 系统管理员可查看用户列表、使用统计、管理用户权限
  - 用户搜索功能（按用户名）
  - 分页显示（每页 10 个用户）
  - 智能排序（admin > 管理员 > 普通用户，同类按字母排序）
  - 手动刷新按钮
  - 新标签页打开
- 📊 **模型调用统计**: 自动记录每次模型调用，支持查看个人和全局统计数据
- 🎨 **HTML预览**: HTML代码实时预览，支持全屏查看和一键下载
- 💬 **多轮对话**: 支持上下文连贯的智能对话
- 📝 **对话管理**: 创建、查看、删除对话会话
- 🔄 **流式响应**: 实时显示AI生成内容，流式输出代码块
- 🔍 **消息搜索**: 全文搜索对话内容和标题
- 📤 **对话导出**: 支持导出为Markdown、PDF、TXT格式
- ⏸️ **AI暂停控制**: 生成过程中可随时停止，已生成内容保留
- 👍 **消息反馈**: 对AI回复点赞或点踩，支持反馈管理，可取消已提交的反馈
- 🔁 **重新生成**: 对不满意的回复可以重新生成
- ⚙️ **模型配置**: 支持多种预设模型和自定义配置
- 🎯 **代码高亮**: GitHub风格代码高亮，支持30+种编程语言
- 💾 **持久化**: 所有对话自动保存到数据库
- 🏷️ **智能标题**: 根据对话内容自动生成标题
- 👥 **用户配置**: 每个用户独立的模型配置和对话隔离
- 📋 **一键复制**: 支持复制消息内容和代码块，双重机制确保兼容性
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
│   ├── main.py             # 主应用和路由（含管理后台API）
│   ├── config.py           # 配置管理
│   ├── database.py         # 数据库模型（用户、对话、消息、反馈、模型调用）
│   ├── auth.py             # 用户认证和JWT处理（含管理员认证）
│   ├── admin_service.py    # 管理后台业务逻辑和模型统计
│   ├── llm_service.py      # LLM API调用
│   ├── conversation_service.py  # 对话管理
│   ├── create_admin.py     # 管理员创建脚本
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
│   │   ├── ChatMessage.tsx  # 支持点赞点踩和重新生成
│   │   ├── MessageInput.tsx
│   │   ├── SettingsModal.tsx
│   │   ├── CodeBlock.tsx  # 代码块和HTML预览
│   │   ├── HtmlPreview.tsx # HTML预览组件
│   │   └── ExportMenu.tsx # 导出菜单
│   ├── app/
│   │   ├── auth/          # 认证页面
│   │   │   └── page.tsx   # 登录/注册页面
│   │   ├── admin/         # 管理后台页面
│   │   │   └── page.tsx   # 用户管理和系统统计
│   │   └── page.tsx       # 主应用页面
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

### 用户注册与登录

1. 首次使用需要注册账号
2. 输入用户名、密码（可选邮箱）
3. 注册成功后自动登录
4. 下次访问直接登录即可

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

### 消息反馈

1. AI回复后，每条消息下方显示点赞/点踩按钮
2. 点击👍表示满意，点击👎表示不满意
3. 反馈状态会被保存并高亮显示
4. 点击已选中的按钮可以取消反馈

### 重新生成回复

1. 对最后一条AI回复不满意时
2. 点击消息下方的🔄"重新生成"按钮
3. 系统会基于同样的问题生成新的回复
4. 旧的反馈会自动清除

### 配置模型

1. 点击右上角"⚙️ 设置"按钮
2. 选择预设模型或自定义模型：
   - **CodeGeex 4**: 代码生成模型
   - **GLM-4 32B**: 通用对话模型
   - **自定义模型**: 配置自己的API
3. 调整最大输出长度 (max_tokens)
4. 点击"保存配置"

### 管理后台（管理员功能）

**访问条件**: 需要管理员权限

#### 创建管理员
```bash
# 方法1: 使用脚本
cd backend
python3 create_admin.py

# 方法2: 手动设置
sqlite3 conversation.db "UPDATE users SET is_admin = 1 WHERE username = '你的用户名';"
```

#### 访问管理后台
1. 以管理员身份登录
2. 点击顶部"🛡️ 管理后台"按钮
3. 进入管理页面查看系统统计和用户列表

#### 管理功能
- **系统统计**: 查看用户数、对话数、消息数、满意度等实时数据
- **模型调用统计**:
  - 查看系统整体模型调用次数和今日调用
  - 按模型类型（CodeGeex/GLM/自定义）分类统计
  - 热门模型排行和使用占比
  - 所有模型的详细调用情况
- **用户管理**:
  - 查看所有用户及其使用情况（对话数、消息数）
  - 启用/禁用用户账户
  - 设置/取消管理员权限
- **用户详情**: 查看单个用户的详细信息、对话列表、反馈统计

**安全特性**:
- 只有管理员可以访问管理后台
- 管理员不能修改自己的状态和权限
- 所有操作都有权限验证

### 模型使用统计（普通用户功能）

1. 点击顶部"📊 统计"按钮
2. 查看个人模型使用情况：
   - 总调用次数和最后使用时间
   - 按模型类型的使用分布
   - 各个模型的详细使用次数和占比
3. 可视化进度条展示使用比例

## 🔧 配置说明

### 后端配置

创建 `backend/.env` 文件：

```bash
# 大模型API配置（默认 GLM-4）
LLM_API_URL=http://111.19.168.151:11553/v1/chat/completions
LLM_MODEL=glm4_32B_chat
LLM_API_KEY=glm432b

# 数据库配置
DATABASE_URL=sqlite:///./conversation.db

# JWT认证配置
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# 服务器配置
HOST=0.0.0.0
PORT=8000
```

**安全提示**: 生产环境务必修改 `SECRET_KEY` 为强随机字符串！

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

#### 认证相关
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/me` | GET | 获取当前用户信息 |

#### 对话管理
| 端点 | 方法 | 说明 |
|------|------|------|
| `/conversations` | POST | 创建对话 |
| `/conversations` | GET | 获取对话列表 |
| `/conversations/{id}/history` | GET | 获取对话历史 |
| `/conversations/{id}` | DELETE | 删除对话 |
| `/conversations/search` | GET | 搜索对话 |

#### 消息交互
| 端点 | 方法 | 说明 |
|------|------|------|
| `/chat` | POST | 发送消息（支持流式） |

#### 反馈系统
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/feedback` | POST | 提交点赞/点踩 |
| `/api/feedback/{message_id}` | GET | 获取反馈状态 |
| `/api/feedback/{message_id}` | DELETE | 删除反馈 |

#### 配置管理
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/config` | GET | 获取配置 |
| `/api/config` | POST | 更新配置 |

#### 管理后台（需要管理员权限）
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/admin/check` | GET | 检查管理员权限 |
| `/api/admin/stats` | GET | 获取系统统计 |
| `/api/admin/users` | GET | 获取用户列表及统计 |
| `/api/admin/users/{id}` | GET | 获取用户详情 |
| `/api/admin/users/{id}/toggle-status` | POST | 切换用户激活状态 |
| `/api/admin/users/{id}/set-admin` | POST | 设置管理员权限 |

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

## 🔒 安全特性

已实现：
- ✅ JWT身份认证
- ✅ 密码加密存储（bcrypt）
- ✅ 用户数据隔离
- ✅ Token过期机制
- ✅ 环境变量存储敏感信息

生产环境建议：
- [ ] 配置CORS允许的具体域名
- [ ] API请求限流
- [ ] 使用HTTPS
- [ ] 定期备份数据库
- [ ] 修改默认SECRET_KEY
- [ ] 启用日志审计

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

### 部署文档
- **[在线部署指南](online-deployment/ONLINE_DEPLOYMENT_GUIDE.md)** ⭐ - 有网络环境快速部署
- **[离线部署指南](offline-deployment/OFFLINE_DEPLOYMENT_GUIDE.md)** ⭐ - 无网络环境离线部署
- **[依赖清单](online-deployment/DEPENDENCIES.md)** - 完整依赖包和版本信息
- [Docker部署指南](DOCKER_DEPLOYMENT_GUIDE.md) - Docker 完整部署方案
- [生产环境部署](PRODUCTION_DEPLOYMENT_GUIDE.md) - 生产环境部署指南

### 项目文档
- [快速参考](QUICK_REFERENCE.md) - 常用命令和配置速查
- [更新日志](CHANGELOG.md) - 详细更新历史
- [迁移指南](MIGRATION_GUIDE.md) - 项目迁移说明
- [文档索引](DOCUMENTATION_INDEX.md) - 完整文档导航
- [后端文档](backend/README.md) - 后端详细说明
- [前端文档](frontend/README.md) - 前端详细说明
- [API文档](http://localhost:8000/docs) - 在线API文档

## 🔄 更新日志

### v1.5.0 (2025-10-03)
- 👤 **用户认证系统**: 完整的注册登录功能
  - JWT token身份验证
  - 密码加密存储（bcrypt）
  - 用户会话管理
  - 自动跳转登录页
- 👍 **消息反馈系统**: 点赞点踩功能
  - 增强的视觉效果（粗边框、文字标识、图标填充）
  - 反馈状态持久化
  - 支持取消反馈
  - 点赞点踩互斥
- 🔁 **重新生成功能**: 优化AI回复体验
  - 最后一条回复支持重新生成
  - 自动清除旧反馈
  - 保持上下文连贯
- 🐛 **问题修复**:
  - 修复对话历史加载Pydantic验证错误
  - 修复流式生成后无法点赞点踩的问题
  - 优化消息ID获取逻辑
- 🔒 **安全增强**:
  - 所有API端点添加认证保护
  - 用户数据完全隔离
  - Token过期自动处理

### v1.4.0 (2025-10-03)
- 🎨 **HTML预览功能**: 全新代码预览体验
  - HTML代码实时预览，支持完整文档和代码片段
  - 安全沙箱环境运行
  - 支持全屏查看
  - 智能浮动工具栏，代码块滚动时按钮跟随
  - 所有代码支持一键下载为对应格式文件
  - 统一的 CodeBlock 组件管理所有代码块
- 🔒 **AI生成限制**: 优化用户交互体验
  - AI生成时禁止切换、创建、删除对话
  - 视觉禁用状态（灰色透明）温和提示
  - 鼠标悬停显示"AI 正在回复中，请稍候..."
  - 设置和清空对话按钮同步禁用
- 🛡️ **错误处理优化**: 更友好的错误提示
  - 针对不同HTTP状态码的详细错误说明
  - 错误信息直接显示在聊天界面，不再弹窗打断
  - 增加网络超时和连接错误的专门提示
  - 后端增加详细调试日志
- ⚙️ **配置优化**:
  - 设置表单增加验证，防止无效配置
  - 显示各模型的token限制说明
  - 优化配置保存错误提示

### v1.3.0 (2025-10-03)
- 🔍 **消息搜索**: 支持全文搜索对话标题和内容
- 📤 **对话导出**: 支持导出为Markdown、PDF、TXT格式
- ⏸️ **AI暂停控制**: 可随时停止AI生成，保留已生成内容

### v1.2.0 (2025-10-03)
- ⏸️ **AI输出暂停**: 添加停止按钮中断流式输出
- 🎯 **语言检测**: 自动识别25+种编程语言

### v1.1.0 (2025-10-03)
- 🎨 **界面优化**: 重新设计聊天界面，提升用户体验
- 📋 **复制功能**: 新增智能复制功能
- ✨ **Markdown增强**: 完整Markdown渲染和GitHub风格代码高亮
- 🔧 **输入优化**: 多行输入、自动高度调整
- 💻 **代码块优化**: 实时代码高亮、固定复制按钮

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
