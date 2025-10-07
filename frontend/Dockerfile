# Frontend Dockerfile
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制应用代码
COPY . .

# 接收构建参数
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# 构建应用
RUN npm run build

# 生产环境镜像
FROM node:18-alpine AS runner

WORKDIR /app

# 设置环境变量
ENV NODE_ENV production

# 复制必要的文件
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 修改文件所有者
RUN chown -R nextjs:nodejs /app

USER nextjs

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["npm", "start"]
