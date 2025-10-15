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
    is_admin = Column(Boolean, default=False, nullable=False)  # 是否为管理员
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
    sources = Column(Text, nullable=True)  # 引用来源（JSON格式，仅AI消息）
    created_at = Column(DateTime, default=get_beijing_time)

    # 关联会话
    conversation = relationship("Conversation", back_populates="messages")


class UserConfig(Base):
    """用户配置表"""
    __tablename__ = "user_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)  # 用户ID
    current_model_type = Column(String(50), default="glm", nullable=False)  # 当前模型类型: codegeex/glm/custom
    max_tokens = Column(Integer, default=8000, nullable=False)  # 最大token数

    # 自定义模型配置(JSON格式存储)
    custom_api_url = Column(String(500), default="")
    custom_model = Column(String(100), default="")
    custom_api_key = Column(String(200), default="")

    created_at = Column(DateTime, default=get_beijing_time)
    updated_at = Column(DateTime, default=get_beijing_time, onupdate=get_beijing_time)

    # 关联用户
    user = relationship("User", back_populates="config")


class MessageFeedback(Base):
    """消息反馈表"""
    __tablename__ = "message_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)  # 消息ID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # 用户ID
    feedback_type = Column(String(20), nullable=False)  # 'like' 或 'dislike'
    created_at = Column(DateTime, default=get_beijing_time)

    # 关联消息和用户
    message = relationship("Message")
    user = relationship("User")


class ModelUsage(Base):
    """模型调用记录表"""
    __tablename__ = "model_usages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # 用户ID
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)  # 对话ID
    model_type = Column(String(50), nullable=False)  # 模型类型: codegeex/glm/custom
    model_name = Column(String(200), nullable=False)  # 模型名称
    api_url = Column(String(500), nullable=True)  # API地址（自定义模型）
    tokens_used = Column(Integer, default=0)  # 使用的token数（如果有）
    created_at = Column(DateTime, default=get_beijing_time, index=True)

    # 关联用户和对话
    user = relationship("User")
    conversation = relationship("Conversation")


class KnowledgeBase(Base):
    """知识库表"""
    __tablename__ = "knowledge_bases"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # 所属用户ID
    name = Column(String(200), nullable=False)  # 知识库名称
    description = Column(Text, nullable=True)  # 知识库描述
    is_shareable = Column(Boolean, default=False, nullable=False)  # 是否可分享（仅管理员可设置）
    created_at = Column(DateTime, default=get_beijing_time)
    updated_at = Column(DateTime, default=get_beijing_time, onupdate=get_beijing_time)

    # 关联用户和文档
    user = relationship("User")
    documents = relationship("Document", back_populates="knowledge_base", cascade="all, delete-orphan")
    # 关联分享记录
    shares = relationship("KnowledgeBaseShare", back_populates="knowledge_base", cascade="all, delete-orphan", foreign_keys="[KnowledgeBaseShare.knowledge_base_id]")


class Document(Base):
    """文档表"""
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    knowledge_base_id = Column(Integer, ForeignKey("knowledge_bases.id"), nullable=False)  # 所属知识库ID
    filename = Column(String(500), nullable=False)  # 文件名
    file_type = Column(String(50), nullable=False)  # 文件类型: txt/pdf/doc/docx
    file_size = Column(Integer, nullable=False)  # 文件大小（字节）
    file_path = Column(String(1000), nullable=False)  # 文件存储路径
    status = Column(String(50), default="processing")  # 处理状态: processing/completed/failed
    error_message = Column(Text, nullable=True)  # 错误信息（如果处理失败）
    created_at = Column(DateTime, default=get_beijing_time)
    updated_at = Column(DateTime, default=get_beijing_time, onupdate=get_beijing_time)

    # 关联知识库和文档块
    knowledge_base = relationship("KnowledgeBase", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    """文档切片表（存储向量化后的文本块）"""
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)  # 所属文档ID
    chunk_index = Column(Integer, nullable=False)  # 切片序号
    content = Column(Text, nullable=False)  # 文本内容
    embedding = Column(Text, nullable=True)  # 向量表示（JSON格式存储）
    created_at = Column(DateTime, default=get_beijing_time)

    # 关联文档
    document = relationship("Document", back_populates="chunks")


class KnowledgeBaseShare(Base):
    """知识库分享表"""
    __tablename__ = "knowledge_base_shares"

    id = Column(Integer, primary_key=True, index=True)
    knowledge_base_id = Column(Integer, ForeignKey("knowledge_bases.id"), nullable=False)  # 知识库ID
    shared_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # 分享者ID（通常是管理员）
    shared_to = Column(Integer, ForeignKey("users.id"), nullable=False)  # 被分享者ID
    permission = Column(String(20), default="read", nullable=False)  # 权限：read/none (read=可读, none=不可读)
    created_at = Column(DateTime, default=get_beijing_time)

    # 关联
    knowledge_base = relationship("KnowledgeBase", back_populates="shares", foreign_keys=[knowledge_base_id])
    sharer = relationship("User", foreign_keys=[shared_by])
    shared_user = relationship("User", foreign_keys=[shared_to])


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
