# 更新日志

## 2025-10-05

### 项目迁移
- **项目路径变更**: 从 `/home/yangyk/llm-chat/llm-chat-v1` 迁移到 `/home/data2/yangyk/llm-chat-v1`
- **原因**: 原磁盘空间不足（98% 使用率），新位置有 2.3T 可用空间

### 功能更新

#### 1. 复制功能优化
- **文件**: `frontend/components/ChatMessage.tsx`, `frontend/components/CodeBlock.tsx`
- **改进**:
  - 添加双重复制机制（Clipboard API + execCommand 降级方案）
  - 提升浏览器兼容性
  - 添加错误提示

#### 2. 点赞点踩功能增强
- **文件**: `frontend/components/ChatMessage.tsx`
- **新功能**:
  - 点击已点赞/已点踩按钮可以取消反馈
  - 取消时向后端发送 DELETE 请求
  - 出错时自动从后端重新获取状态，保证前后端同步

#### 3. 管理后台优化
- **文件**: `frontend/app/admin/page.tsx`
- **新功能**:
  - 点击"管理后台"在新标签页打开
  - 用户列表智能排序（admin > 管理员 > 普通用户，同类按字母排序）
  - 用户搜索功能（按用户名）
  - 分页显示（每页 10 个用户）
  - 手动刷新按钮
  - ~~自动刷新功能（已移除）~~

#### 4. Docker 网络配置修复
- **文件**: `frontend/next.config.js`, `nginx/default.conf`
- **修复**:
  - 前端 API 代理配置改用 `http://172.17.0.1:8000`（Docker 宿主机 IP）
  - Nginx 前端代理改用 `http://127.0.0.1:3000`
  - 解决 Docker 容器间通信问题

### 配置文件更新
- `frontend/next.config.js`: 更新后端 API 地址配置
- `nginx/default.conf`: 修复前端服务地址
- `QUICK_FIX_MODEL_ACCESS.md`: 更新项目路径

### 技术细节

#### Docker 网络架构
- **后端**: 使用 `host` 网络模式，直接访问宿主机服务
- **前端**: 使用桥接网络，通过宿主机 IP 访问后端
- **Nginx**: 使用 `host` 网络模式，通过 localhost 转发流量

#### 磁盘使用优化
- 清理 Docker 构建缓存（释放 14.63GB）
- 项目迁移到更大容量磁盘

### 部署说明

#### 新部署路径
所有部署命令需要在新路径下执行：
```bash
cd /home/data2/yangyk/llm-chat-v1
```

#### 启动服务
```bash
docker compose up -d
```

#### 重新构建
```bash
docker compose build frontend
docker compose up -d frontend
```

#### 查看日志
```bash
docker compose logs -f
```

### 已知问题
- 无

### 下一步计划
- 添加更多统计功能
- 优化用户管理界面
- 性能监控和优化
