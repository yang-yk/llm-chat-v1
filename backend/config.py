"""
配置文件
"""
import os

# 大模型API配置
LLM_API_URL = os.getenv("LLM_API_URL", "http://111.19.168.151:11551/v1/chat/completions")
LLM_MODEL = os.getenv("LLM_MODEL", "codegeex4-all-9b")
LLM_API_KEY = os.getenv("LLM_API_KEY", "codegeex")

# 数据库配置
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./conversation.db")

# 服务器配置
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
