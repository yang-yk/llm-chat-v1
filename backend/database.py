"""
数据库模型和会话管理
"""
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, timezone, timedelta
from config import DATABASE_URL

Base = declarative_base()

# 北京时间时区 (UTC+8)
BEIJING_TZ = timezone(timedelta(hours=8))

def get_beijing_time():
    """获取当前北京时间"""
    return datetime.now(BEIJING_TZ)


class User(Base):
    """用户表"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)  # 用户名，唯一
    hashed_password = Column(String(200), nullable=False)  # 加密后的密码
    email = Column(String(100), unique=True, index=True, nullable=True)  # 邮箱（可选）
    is_active = Column(Boolean, default=True, nullable=False)  # 是否激活
    created_at = Column(DateTime, default=get_beijing_time)
    updated_at = Column(DateTime, default=get_beijing_time, onupdate=get_beijing_time)

    # 关联对话和配置
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    config = relationship("UserConfig", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Conversation(Base):
    """对话会话表"""
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # 所属用户ID
    title = Column(String(200), default="新对话", nullable=False)  # 对话标题
    created_at = Column(DateTime, default=get_beijing_time)
    updated_at = Column(DateTime, default=get_beijing_time, onupdate=get_beijing_time)

    # 关联用户和消息
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    """消息表"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)  # user 或 assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=get_beijing_time)

    # 关联会话
    conversation = relationship("Conversation", back_populates="messages")


class UserConfig(Base):
    """用户配置表"""
    __tablename__ = "user_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)  # 用户ID
    current_model_type = Column(String(50), default="codegeex", nullable=False)  # 当前模型类型: codegeex/glm/custom
    max_tokens = Column(Integer, default=2000, nullable=False)  # 最大token数

    # 自定义模型配置(JSON格式存储)
    custom_api_url = Column(String(500), default="")
    custom_model = Column(String(100), default="")
    custom_api_key = Column(String(200), default="")

    created_at = Column(DateTime, default=get_beijing_time)
    updated_at = Column(DateTime, default=get_beijing_time, onupdate=get_beijing_time)

    # 关联用户
    user = relationship("User", back_populates="config")


# 创建数据库引擎
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """初始化数据库，创建所有表"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
