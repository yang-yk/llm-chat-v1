"""
FastAPI主应用和路由
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from datetime import timedelta
import os
import json

from database import get_db, init_db, UserConfig, User, MessageFeedback, Message, Conversation
from conversation_service import conversation_service
from config import HOST, PORT
from auth import (
    get_password_hash,
    authenticate_user,
    create_access_token,
    get_current_active_user,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# 创建FastAPI应用
app = FastAPI(
    title="大模型对话后端",
    description="基于CodeGeex的多轮对话后端服务",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境建议配置具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic模型定义
class CreateConversationResponse(BaseModel):
    session_id: str
    message: str


class ChatRequest(BaseModel):
    user_id: str  # 用户标识
    session_id: str
    message: str
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None  # 如果为None,使用用户配置的max_tokens
    stream: Optional[bool] = False  # 是否使用流式响应


class ChatResponse(BaseModel):
    session_id: str
    user_message: str
    assistant_reply: str


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str


class ConversationHistoryResponse(BaseModel):
    session_id: str
    messages: List[MessageResponse]


class ConfigResponse(BaseModel):
    llm_api_url: str
    llm_model: str
    llm_api_key: str
    preset_models: List[Dict[str, str]]  # 预设模型列表
    current_model_type: str  # 当前使用的模型类型：codegeex/glm/custom
    max_tokens: int  # 最大输出token数


class ConfigUpdateRequest(BaseModel):
    user_id: str  # 用户标识
    model_type: str  # codegeex/glm/custom
    llm_api_url: Optional[str] = None  # 仅custom时需要
    llm_model: Optional[str] = None  # 仅custom时需要
    llm_api_key: Optional[str] = None  # 仅custom时需要
    max_tokens: Optional[int] = None  # 最大输出token数


# 认证相关模型
class UserRegister(BaseModel):
    username: str
    password: str
    email: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]


class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str]
    is_active: bool
    created_at: str


class FeedbackRequest(BaseModel):
    message_id: int
    feedback_type: str  # 'like' 或 'dislike'


# 启动事件：初始化数据库
@app.on_event("startup")
async def startup_event():
    init_db()
    print("数据库初始化完成")


# 预设模型配置
PRESET_MODELS = {
    "codegeex": {
        "name": "CodeGeex",
        "url": "http://111.19.168.151:11551/v1/chat/completions",
        "model": "codegeex4-all-9b",
        "key": "codegeex"
    },
    "glm": {
        "name": "GLM-4",
        "url": "http://111.19.168.151:11553/v1/chat/completions",
        "model": "glm4_32B_chat",
        "key": "glm432b"
    }
}

# 当前模型类型（默认使用glm）
current_model_type = "glm"

# 全局配置
global_config = {
    "max_tokens": 8000  # 默认最大token数
}

# 自定义模型配置存储
custom_model_config = {
    "url": "",
    "model": "",
    "key": ""
}


# 挂载静态文件目录
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


# API路由
@app.get("/")
async def root():
    """根路径 - 返回Web界面"""
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "大模型对话后端服务运行中", "version": "1.0.0"}


@app.get("/api/health")
async def health():
    """健康检查接口"""
    return {"status": "ok", "message": "大模型对话后端服务运行中", "version": "1.0.0"}


# ==================== 认证相关API ====================

@app.post("/api/auth/register", response_model=Token)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """用户注册"""
    # 检查用户名是否已存在
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )

    # 检查邮箱是否已存在
    if user_data.email:
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="邮箱已被注册"
            )

    # 创建新用户
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        hashed_password=hashed_password,
        email=user_data.email
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 为新用户创建默认配置
    user_config = UserConfig(
        user_id=new_user.id,
        current_model_type="glm",
        max_tokens=8000
    )
    db.add(user_config)
    db.commit()

    # 生成访问令牌
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(new_user.id)}, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email
        }
    }


@app.post("/api/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """用户登录"""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户已被禁用"
        )

    # 生成访问令牌
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
    }


@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """获取当前用户信息"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat()
    }


# ==================== 对话相关API ====================

@app.post("/conversations", response_model=CreateConversationResponse)
async def create_conversation(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """创建新的对话会话"""
    try:
        session_id = conversation_service.create_conversation(db, current_user.id)
        return CreateConversationResponse(
            session_id=session_id,
            message="对话会话创建成功"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建会话失败: {str(e)}")


@app.post("/chat")
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    统一的对话接口
    - 支持流式和非流式响应（通过stream参数控制）
    - 流式响应返回 Server-Sent Events
    - 非流式响应返回 JSON
    """
    try:
        from llm_service import llm_service

        print(f"\n[CHAT REQUEST] user_id: {request.user_id}, session_id: {request.session_id}, stream: {request.stream}")

        # 获取用户配置
        user_config = db.query(UserConfig).filter_by(user_id=current_user.id).first()
        print(f"[USER CONFIG] Found: {user_config is not None}")

        # 确定使用的 max_tokens 和模型配置
        if request.max_tokens:
            max_tokens = request.max_tokens
        elif user_config:
            max_tokens = user_config.max_tokens
        else:
            max_tokens = global_config["max_tokens"]

        # 根据用户配置设置LLM服务
        if user_config:
            model_type = user_config.current_model_type
            print(f"[DEBUG] 使用用户配置，模型类型: {model_type}, user_id: {request.user_id}")
            if model_type == "codegeex":
                llm_service.api_url = PRESET_MODELS["codegeex"]["url"]
                llm_service.model = PRESET_MODELS["codegeex"]["model"]
                llm_service.api_key = PRESET_MODELS["codegeex"]["key"]
            elif model_type == "glm":
                llm_service.api_url = PRESET_MODELS["glm"]["url"]
                llm_service.model = PRESET_MODELS["glm"]["model"]
                llm_service.api_key = PRESET_MODELS["glm"]["key"]
            elif model_type == "custom":
                llm_service.api_url = user_config.custom_api_url
                llm_service.model = user_config.custom_model
                llm_service.api_key = user_config.custom_api_key
        else:
            # 没有用户配置时，使用全局当前模型类型
            print(f"[DEBUG] 没有用户配置，使用全局默认: {current_model_type}, user_id: {request.user_id}")
            if current_model_type == "codegeex":
                llm_service.api_url = PRESET_MODELS["codegeex"]["url"]
                llm_service.model = PRESET_MODELS["codegeex"]["model"]
                llm_service.api_key = PRESET_MODELS["codegeex"]["key"]
            elif current_model_type == "glm":
                llm_service.api_url = PRESET_MODELS["glm"]["url"]
                llm_service.model = PRESET_MODELS["glm"]["model"]
                llm_service.api_key = PRESET_MODELS["glm"]["key"]

        print(f"[MODEL CONFIG] API: {llm_service.api_url}, Model: {llm_service.model}")

        # 如果请求流式响应
        if request.stream:
            async def event_generator():
                """生成SSE事件流"""
                try:
                    chunk_count = 0
                    async for chunk in conversation_service.chat_stream(
                        db=db,
                        session_id=request.session_id,
                        user_message=request.message,
                        temperature=request.temperature,
                        max_tokens=max_tokens
                    ):
                        chunk_count += 1
                        # 发送SSE格式的数据
                        yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"

                    print(f"[STREAM COMPLETE] Sent {chunk_count} chunks")
                    # 发送完成信号
                    yield f"data: {json.dumps({'done': True}, ensure_ascii=False)}\n\n"

                except Exception as e:
                    print(f"[STREAM ERROR] {str(e)}")
                    # 发送错误信息
                    yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"

            return StreamingResponse(
                event_generator(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no"
                }
            )

        # 非流式响应
        else:
            assistant_reply = await conversation_service.chat(
                db=db,
                session_id=request.session_id,
                user_message=request.message,
                temperature=request.temperature,
                max_tokens=max_tokens
            )
            return ChatResponse(
                session_id=request.session_id,
                user_message=request.message,
                assistant_reply=assistant_reply
            )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"对话失败: {str(e)}")


@app.get("/conversations/{session_id}/history", response_model=ConversationHistoryResponse)
async def get_conversation_history(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取对话历史"""
    try:
        # 验证对话是否属于当前用户
        conversation = db.query(Conversation).filter_by(session_id=session_id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail=f"会话 {session_id} 不存在")

        if conversation.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="无权访问此会话")

        # 传递include_id=True以便前端可以获取message_id用于点赞点踩
        messages = conversation_service.get_conversation_history(db, session_id, include_id=True)

        return ConversationHistoryResponse(
            session_id=session_id,
            messages=messages
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取历史记录失败: {str(e)}")


@app.delete("/conversations/{session_id}")
async def delete_conversation(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """删除对话会话"""
    try:
        # 验证对话是否属于当前用户
        conversation = db.query(Conversation).filter_by(session_id=session_id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail=f"会话 {session_id} 不存在")

        if conversation.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="无权删除此会话")

        conversation_service.delete_conversation(db, session_id)
        return {"message": f"会话 {session_id} 已删除"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除会话失败: {str(e)}")


@app.get("/conversations")
async def list_conversations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取用户的所有对话会话列表"""
    try:
        conversations = conversation_service.list_conversations(db, current_user.id)
        return {"conversations": conversations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取会话列表失败: {str(e)}")


@app.get("/conversations/search")
async def search_conversations(
    q: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    搜索用户的对话

    Args:
        q: 搜索关键词
        current_user: 当前登录用户
        db: 数据库会话

    Returns:
        包含关键词的对话列表
    """
    try:
        results = conversation_service.search_conversations(db, current_user.id, q)
        return {"results": results, "query": q, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"搜索失败: {str(e)}")


@app.get("/api/config")
async def get_config(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取用户LLM配置"""
    from llm_service import llm_service

    # 构建预设模型列表
    preset_models = [
        {
            "type": "codegeex",
            "name": PRESET_MODELS["codegeex"]["name"],
            "url": PRESET_MODELS["codegeex"]["url"],
            "model": PRESET_MODELS["codegeex"]["model"],
            "key": PRESET_MODELS["codegeex"]["key"]
        },
        {
            "type": "glm",
            "name": PRESET_MODELS["glm"]["name"],
            "url": PRESET_MODELS["glm"]["url"],
            "model": PRESET_MODELS["glm"]["model"],
            "key": PRESET_MODELS["glm"]["key"]
        }
    ]

    # 从数据库获取用户配置
    user_config = db.query(UserConfig).filter_by(user_id=current_user.id).first()

    if user_config:
        # 返回数据库中的配置
        model_type = user_config.current_model_type
        max_tokens = user_config.max_tokens

        if model_type == "codegeex":
            api_url = PRESET_MODELS["codegeex"]["url"]
            model = PRESET_MODELS["codegeex"]["model"]
            api_key = PRESET_MODELS["codegeex"]["key"]
        elif model_type == "glm":
            api_url = PRESET_MODELS["glm"]["url"]
            model = PRESET_MODELS["glm"]["model"]
            api_key = PRESET_MODELS["glm"]["key"]
        else:  # custom
            api_url = user_config.custom_api_url
            model = user_config.custom_model
            api_key = user_config.custom_api_key
    else:
        # 返回默认配置
        model_type = current_model_type
        max_tokens = global_config["max_tokens"]
        api_url = llm_service.api_url
        model = llm_service.model
        api_key = llm_service.api_key

    return ConfigResponse(
        llm_api_url=api_url,
        llm_model=model,
        llm_api_key=api_key,
        preset_models=preset_models,
        current_model_type=model_type,
        max_tokens=max_tokens
    )


@app.post("/api/config")
async def update_config(
    config: ConfigUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新用户LLM配置"""
    try:
        model_type = config.model_type
        max_tokens = config.max_tokens if config.max_tokens else 8000

        # 验证 max_tokens
        if max_tokens < 1 or max_tokens > 100000:
            raise HTTPException(status_code=400, detail="max_tokens 必须在 1 到 100000 之间")

        # 验证自定义模型配置
        if model_type == "custom":
            if not config.llm_api_url or not config.llm_model:
                raise HTTPException(status_code=400, detail="自定义模型需要提供URL和Model")

        # 查找或创建用户配置
        user_config = db.query(UserConfig).filter_by(user_id=current_user.id).first()

        if user_config:
            # 更新现有配置
            user_config.current_model_type = model_type
            user_config.max_tokens = max_tokens

            if model_type == "custom":
                user_config.custom_api_url = config.llm_api_url or ""
                user_config.custom_model = config.llm_model or ""
                user_config.custom_api_key = config.llm_api_key or ""
            else:
                # 清空自定义配置
                user_config.custom_api_url = ""
                user_config.custom_model = ""
                user_config.custom_api_key = ""
        else:
            # 创建新配置
            user_config = UserConfig(
                user_id=current_user.id,
                current_model_type=model_type,
                max_tokens=max_tokens,
                custom_api_url=config.llm_api_url or "",
                custom_model=config.llm_model or "",
                custom_api_key=config.llm_api_key or ""
            )
            db.add(user_config)

        db.commit()
        db.refresh(user_config)

        # 返回配置信息
        if model_type == "codegeex":
            api_url = PRESET_MODELS["codegeex"]["url"]
            model = PRESET_MODELS["codegeex"]["model"]
        elif model_type == "glm":
            api_url = PRESET_MODELS["glm"]["url"]
            model = PRESET_MODELS["glm"]["model"]
        else:
            api_url = user_config.custom_api_url
            model = user_config.custom_model

        return {
            "message": "配置已更新",
            "current_config": {
                "model_type": model_type,
                "api_url": api_url,
                "model": model,
                "max_tokens": max_tokens
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"更新配置失败: {str(e)}")


@app.post("/api/feedback")
async def submit_feedback(
    feedback: FeedbackRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """提交消息反馈（点赞/点踩）"""
    try:
        # 验证feedback_type
        if feedback.feedback_type not in ['like', 'dislike']:
            raise HTTPException(status_code=400, detail="feedback_type 必须是 'like' 或 'dislike'")

        # 验证消息是否存在
        message = db.query(Message).filter(Message.id == feedback.message_id).first()
        if not message:
            raise HTTPException(status_code=404, detail="消息不存在")

        # 检查是否已经存在反馈
        existing_feedback = db.query(MessageFeedback).filter(
            MessageFeedback.message_id == feedback.message_id,
            MessageFeedback.user_id == current_user.id
        ).first()

        if existing_feedback:
            # 更新现有反馈
            existing_feedback.feedback_type = feedback.feedback_type
        else:
            # 创建新反馈
            new_feedback = MessageFeedback(
                message_id=feedback.message_id,
                user_id=current_user.id,
                feedback_type=feedback.feedback_type
            )
            db.add(new_feedback)

        db.commit()

        return {
            "message": "反馈已提交",
            "feedback_type": feedback.feedback_type
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"提交反馈失败: {str(e)}")


@app.get("/api/feedback/{message_id}")
async def get_feedback(
    message_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取消息的反馈状态"""
    try:
        feedback = db.query(MessageFeedback).filter(
            MessageFeedback.message_id == message_id,
            MessageFeedback.user_id == current_user.id
        ).first()

        if feedback:
            return {
                "message_id": message_id,
                "feedback_type": feedback.feedback_type,
                "has_feedback": True
            }
        else:
            return {
                "message_id": message_id,
                "feedback_type": None,
                "has_feedback": False
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取反馈失败: {str(e)}")


@app.delete("/api/feedback/{message_id}")
async def delete_feedback(
    message_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """删除消息的反馈"""
    try:
        feedback = db.query(MessageFeedback).filter(
            MessageFeedback.message_id == message_id,
            MessageFeedback.user_id == current_user.id
        ).first()

        if not feedback:
            raise HTTPException(status_code=404, detail="未找到反馈记录")

        db.delete(feedback)
        db.commit()

        return {"message": "反馈已删除"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"删除反馈失败: {str(e)}")


# 主程序入口
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
