# LLM Chat System - 前端应用

基于 React + Next.js + TypeScript + Tailwind CSS 的现代化大模型对话前端应用。

## 技术栈

- **框架**: Next.js 15 (App Router)
- **UI库**: React 18
- **语言**: TypeScript 5
- **样式**: Tailwind CSS 3
- **代码高亮**: highlight.js
- **HTTP**: Fetch API + Server-Sent Events

## 功能特性

- ✨ **现代化界面**: 简洁美观的用户界面
- 💬 **实时对话**: 支持流式响应，实时显示AI回复
- 📝 **对话管理**: 创建、查看、删除对话会话
- ⚙️ **模型配置**: 支持多种预设模型和自定义模型
- 🔍 **代码高亮**: 自动识别和高亮代码块
- 📱 **响应式设计**: 完美支持桌面和移动设备
- ⌨️ **快捷键**: Shift+Enter换行，Enter发送
- 🎨 **优雅动画**: 流畅的过渡效果

## 项目结构

```
frontend/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 主页面
│   ├── layout.tsx         # 根布局
│   └── globals.css        # 全局样式
├── components/            # React组件
│   ├── Sidebar.tsx        # 侧边栏（对话列表）
│   ├── ChatMessages.tsx   # 消息列表
│   ├── ChatMessage.tsx    # 单条消息
│   ├── MessageInput.tsx   # 消息输入框
│   └── SettingsModal.tsx  # 设置模态框
├── lib/                   # 工具库
│   ├── api.ts            # API集成层
│   └── types.ts          # TypeScript类型定义
└── public/               # 静态资源
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量（可选）

创建 `.env.local` 文件：

```bash
# 后端API地址
NEXT_PUBLIC_API_URL=http://localhost:8000
```

如果不配置，默认使用 `http://localhost:8000`

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 构建生产版本

```bash
npm run build
npm start
```

## 组件说明

### Sidebar（侧边栏）

对话列表管理组件。

**功能**:
- 显示所有对话会话
- 创建新对话
- 选择对话
- 删除对话
- 折叠/展开

**Props**:
```typescript
interface SidebarProps {
  conversations: Conversation[];
  currentSessionId: string | null;
  isOpen: boolean;
  onNewChat: () => void;
  onSelectConversation: (sessionId: string) => void;
  onDeleteConversation: (sessionId: string) => void;
  onToggleSidebar: () => void;
}
```

### ChatMessages（消息列表）

显示对话历史的组件。

**功能**:
- 渲染所有消息
- 自动滚动到底部
- 显示加载状态
- 欢迎页面

**Props**:
```typescript
interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}
```

### ChatMessage（单条消息）

单条消息渲染组件。

**功能**:
- 区分用户/助手消息
- 代码语法高亮
- Markdown格式支持
- 保留换行

**Props**:
```typescript
interface ChatMessageProps {
  message: Message;
}
```

### MessageInput（消息输入）

消息输入和发送组件。

**功能**:
- 自适应高度
- 快捷键支持（Enter发送，Shift+Enter换行）
- 禁用状态管理
- 自动清空

**Props**:
```typescript
interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}
```

### SettingsModal（设置弹窗）

模型配置管理组件。

**功能**:
- 预设模型选择
- 自定义模型配置
- Max Tokens调节
- 配置保存

**Props**:
```typescript
interface SettingsModalProps {
  isOpen: boolean;
  config: ConfigResponse | null;
  onClose: () => void;
  onSave: (settings: any) => void;
}
```

## API集成

所有API调用都封装在 `lib/api.ts`：

### 对话管理

```typescript
// 创建对话
const sessionId = await createConversation();

// 获取对话列表
const conversations = await getConversations();

// 获取对话历史
const history = await getConversationHistory(sessionId);

// 删除对话
await deleteConversation(sessionId);
```

### 消息发送

```typescript
// 非流式
const response = await sendMessage({
  user_id: userId,
  session_id: sessionId,
  message: "你好",
  stream: false
});

// 流式
for await (const chunk of sendMessageStream({
  user_id: userId,
  session_id: sessionId,
  message: "你好",
  stream: true
})) {
  console.log(chunk);
}
```

### 配置管理

```typescript
// 获取配置
const config = await getConfig(userId);

// 更新配置
await updateConfig({
  user_id: userId,
  model_type: "codegeex",
  max_tokens: 2000
});
```

## 类型定义

完整的TypeScript类型定义在 `lib/types.ts`：

```typescript
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface ConfigResponse {
  llm_api_url: string;
  llm_model: string;
  llm_api_key: string;
  preset_models: PresetModel[];
  current_model_type: string;
  max_tokens: number;
}
```

## 样式定制

### Tailwind CSS

在 `tailwind.config.ts` 中自定义主题：

```typescript
theme: {
  extend: {
    colors: {
      // 自定义颜色
      primary: '#3b82f6',
      secondary: '#8b5cf6',
    },
  },
}
```

### 全局样式

在 `app/globals.css` 中添加全局CSS：

```css
/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}
```

## 开发指南

### 添加新组件

1. 在 `components/` 创建新组件
2. 定义Props接口
3. 导出组件

```typescript
// components/NewComponent.tsx
'use client';

interface NewComponentProps {
  // props定义
}

export default function NewComponent(props: NewComponentProps) {
  return <div>...</div>;
}
```

### 添加新API

1. 在 `lib/types.ts` 定义类型
2. 在 `lib/api.ts` 实现API调用

```typescript
// lib/api.ts
export async function newApiCall(): Promise<ResponseType> {
  const response = await fetch(`${API_BASE_URL}/endpoint`);
  return response.json();
}
```

### 状态管理

使用React Hooks：

```typescript
const [state, setState] = useState<Type>(initialValue);

useEffect(() => {
  // 副作用
}, [dependencies]);
```

## 性能优化

- **代码分割**: Next.js自动进行代码分割
- **图片优化**: 使用next/image组件
- **懒加载**: 动态导入大型组件
- **Memo化**: 使用React.memo避免不必要渲染

```typescript
import { memo } from 'react';

export default memo(function Component() {
  // ...
});
```

## 调试技巧

### React DevTools

安装Chrome扩展查看组件树和状态。

### TypeScript错误

```bash
# 类型检查
npm run type-check

# 或在VSCode中自动检查
```

### 网络请求

在浏览器DevTools的Network面板查看API调用。

## 构建优化

### 生产构建

```bash
npm run build
```

### 分析打包体积

```bash
npm install @next/bundle-analyzer
```

在 `next.config.js` 中启用：

```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
```

## 部署

### Vercel（推荐）

```bash
npm i -g vercel
vercel
```

### 自托管

```bash
npm run build
npm start
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### Nginx反向代理

```nginx
server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
  }
}
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| NEXT_PUBLIC_API_URL | 后端API地址 | http://localhost:8000 |

## 浏览器支持

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)

## 常见问题

### 1. API连接失败

检查 `NEXT_PUBLIC_API_URL` 环境变量和后端服务状态。

### 2. 流式响应不工作

确保后端支持SSE，浏览器支持EventSource。

### 3. 样式不生效

检查Tailwind配置和类名是否正确。

### 4. 构建失败

清除缓存后重试：

```bash
rm -rf .next node_modules
npm install
npm run build
```

## 开发脚本

```json
{
  "dev": "next dev",           // 开发模式
  "build": "next build",        // 构建生产版本
  "start": "next start",        // 启动生产服务器
  "lint": "next lint"          // 代码检查
}
```

## 依赖说明

主要依赖：
- `react` / `react-dom` - React核心
- `next` - Next.js框架
- `typescript` - TypeScript支持
- `tailwindcss` - CSS框架
- `highlight.js` - 代码高亮

## 更新日志

### v1.0.0
- ✅ 初始版本发布
- ✅ 完整功能实现
- ✅ TypeScript支持
- ✅ 响应式设计

## 贡献指南

欢迎提交Issue和Pull Request！

## 许可证

MIT License
