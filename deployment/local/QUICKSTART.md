# 🚀 快速开始指南

## 最快启动方式（推荐）

```bash
# 1. 赋予执行权限
chmod +x start.sh

# 2. 运行启动脚本
./start.sh
```

脚本会自动完成以下操作：
- ✅ 检查Python和Node.js环境
- ✅ 安装后端依赖
- ✅ 安装前端依赖
- ✅ 启动后端服务（端口8000）
- ✅ 启动前端服务（端口3000）

## 访问应用

启动完成后，在浏览器中访问：

- **前端应用**: http://localhost:3000
- **后端API文档**: http://localhost:8000/docs

## 停止服务

```bash
./stop.sh
```

## 手动启动（备选方案）

### 终端1 - 启动后端

```bash
cd backend
pip install -r requirements.txt
python main.py
```

### 终端2 - 启动前端

```bash
cd frontend
npm install
npm run dev
```

## 环境要求

- **Python**: 3.8+
- **Node.js**: 18+
- **操作系统**: macOS / Linux / Windows

## 常见问题

### Q: 端口被占用怎么办？

A: 启动脚本会自动关闭占用端口的进程，或手动运行：
```bash
# 关闭8000端口
lsof -ti:8000 | xargs kill -9

# 关闭3000端口
lsof -ti:3000 | xargs kill -9
```

### Q: Python依赖安装失败？

A: 尝试使用虚拟环境：
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Q: npm安装很慢？

A: 使用国内镜像：
```bash
npm config set registry https://registry.npmmirror.com
```

### Q: 前端无法连接后端？

A: 检查：
1. 后端服务是否正在运行
2. 前端 `.env.local` 中的 `NEXT_PUBLIC_API_URL` 是否正确

## 查看日志

```bash
# 后端日志
tail -f logs/backend.log

# 前端日志
tail -f logs/frontend.log
```

## 功能测试清单

启动后测试以下功能：

- [ ] 点击"+ 新对话"创建对话
- [ ] 发送消息并接收AI回复
- [ ] 查看对话历史
- [ ] 删除对话
- [ ] 打开设置面板
- [ ] 切换模型配置
- [ ] 代码块语法高亮

## 下一步

- 阅读 [README.md](README.md) 了解详细功能
- 查看 [backend/README.md](backend/README.md) 了解后端API
- 查看 [frontend/README.md](frontend/README.md) 了解前端开发

## 获取帮助

- 查看完整文档: [README.md](README.md)
- 查看API文档: http://localhost:8000/docs
- 查看日志文件排查问题

---

🎉 祝你使用愉快！
