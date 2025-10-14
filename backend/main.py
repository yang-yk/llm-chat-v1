"""
FastAPI主应用和路由
"""
from dotenv import load_dotenv
load_dotenv()  # 必须在导入config之前加载环境变量

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
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

from database import get_db, init_db, UserConfig, User, MessageFeedback, Message, Conversation, ModelUsage, SessionLocal
from conversation_service import conversation_service
from config import HOST, PORT
from auth import (
    get_password_hash,
    authenticate_user,
    create_access_token,
    get_current_active_user,
    get_current_user,
    get_current_admin_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from admin_service import (
    get_all_users_with_stats,
    get_user_detail,
    get_system_stats,
    toggle_user_status,
    set_user_admin,
    get_overall_model_stats,
    get_user_model_stats,
    get_all_knowledge_base_stats
)
from knowledge_base_service import knowledge_base_service
from rag_service import rag_service
from temp_doc_service import temp_doc_service

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
    knowledge_base_ids: Optional[List[int]] = None  # 要使用的知识库ID列表


class ChatResponse(BaseModel):
    session_id: str
    user_message: str
    assistant_reply: str


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    sources: Optional[List[Dict[str, Any]]] = None  # 引用来源（仅AI消息）


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


# 知识库相关模型
class KnowledgeBaseCreate(BaseModel):
    name: str
    description: Optional[str] = None


class KnowledgeBaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


# 临时文档问答相关模型
class TempDocChatRequest(BaseModel):
    doc_id: str
    message: str
    temperature: Optional[float] = 0.7


# 启动事件：初始化数据库
@app.on_event("startup")
async def startup_event():
    init_db()
    print("数据库初始化完成")

    # 自动创建默认超级管理员（如果不存在）
    db = SessionLocal()
    try:
        # 检查是否存在admin用户
        admin_user = db.query(User).filter(User.username == "admin").first()

        if not admin_user:
            print("检测到没有admin管理员，正在创建默认管理员...")
            # 创建默认管理员
            default_admin = User(
                username="admin",
                hashed_password=get_password_hash("Admin@2025"),
                email="admin@example.com",
                is_active=True,
                is_admin=True
            )
            db.add(default_admin)
            db.commit()
            db.refresh(default_admin)

            # 为管理员创建默认配置
            admin_config = UserConfig(
                user_id=default_admin.id,
                current_model_type="glm",
                max_tokens=8000
            )
            db.add(admin_config)
            db.commit()

            print("✅ 默认管理员创建成功 (用户名: admin, 密码: Admin@2025)")
        else:
            print(f"✓ 管理员账户已存在: {admin_user.username}")
    except Exception as e:
        print(f"⚠️  管理员初始化失败: {e}")
        db.rollback()
    finally:
        db.close()


# 从配置文件导入预设模型配置
from models_config import PRESET_MODELS, DEFAULT_MODEL_TYPE

# 当前模型类型（默认使用配置文件中的DEFAULT_MODEL_TYPE）
current_model_type = DEFAULT_MODEL_TYPE

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


def record_model_usage(db: Session, user_id: int, session_id: str, model_type: str, model_name: str, api_url: str = None):
    """记录模型调用"""
    try:
        # 获取conversation_id
        conversation = db.query(Conversation).filter_by(session_id=session_id).first()
        if not conversation:
            print(f"[WARNING] 无法记录模型使用：会话不存在 {session_id}")
            return

        usage = ModelUsage(
            user_id=user_id,
            conversation_id=conversation.id,
            model_type=model_type,
            model_name=model_name,
            api_url=api_url
        )
        db.add(usage)
        db.commit()
        print(f"[MODEL USAGE] 已记录: user_id={user_id}, model={model_name}, type={model_type}")
    except Exception as e:
        print(f"[ERROR] 记录模型使用失败: {str(e)}")
        db.rollback()


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

        # 根据用户配置设置LLM服务，并记录模型信息
        model_type = None
        model_name = None
        api_url = None

        if user_config:
            model_type = user_config.current_model_type
            print(f"[DEBUG] 使用用户配置，模型类型: {model_type}, user_id: {request.user_id}")
            if model_type == "codegeex":
                llm_service.api_url = PRESET_MODELS["codegeex"]["url"]
                llm_service.model = PRESET_MODELS["codegeex"]["model"]
                llm_service.api_key = PRESET_MODELS["codegeex"]["key"]
                model_name = PRESET_MODELS["codegeex"]["model"]
                api_url = PRESET_MODELS["codegeex"]["url"]
            elif model_type == "glm":
                llm_service.api_url = PRESET_MODELS["glm"]["url"]
                llm_service.model = PRESET_MODELS["glm"]["model"]
                llm_service.api_key = PRESET_MODELS["glm"]["key"]
                model_name = PRESET_MODELS["glm"]["model"]
                api_url = PRESET_MODELS["glm"]["url"]
            elif model_type == "custom":
                llm_service.api_url = user_config.custom_api_url
                llm_service.model = user_config.custom_model
                llm_service.api_key = user_config.custom_api_key
                model_name = user_config.custom_model
                api_url = user_config.custom_api_url
        else:
            # 没有用户配置时，使用全局当前模型类型
            model_type = current_model_type
            print(f"[DEBUG] 没有用户配置，使用全局默认: {current_model_type}, user_id: {request.user_id}")
            if current_model_type == "codegeex":
                llm_service.api_url = PRESET_MODELS["codegeex"]["url"]
                llm_service.model = PRESET_MODELS["codegeex"]["model"]
                llm_service.api_key = PRESET_MODELS["codegeex"]["key"]
                model_name = PRESET_MODELS["codegeex"]["model"]
                api_url = PRESET_MODELS["codegeex"]["url"]
            elif current_model_type == "glm":
                llm_service.api_url = PRESET_MODELS["glm"]["url"]
                llm_service.model = PRESET_MODELS["glm"]["model"]
                llm_service.api_key = PRESET_MODELS["glm"]["key"]
                model_name = PRESET_MODELS["glm"]["model"]
                api_url = PRESET_MODELS["glm"]["url"]

        print(f"[MODEL CONFIG] API: {llm_service.api_url}, Model: {llm_service.model}")

        # 处理RAG：如果指定了知识库，则检索相关内容
        rag_context = ""
        search_results = []
        if request.knowledge_base_ids and len(request.knowledge_base_ids) > 0:
            try:
                print(f"[RAG] 用户选择了知识库: {request.knowledge_base_ids}")
                print(f"[RAG] 查询内容: {request.message}")
                rag_context, search_results = await rag_service.retrieve_and_format(
                    db=db,
                    query=request.message,
                    kb_ids=request.knowledge_base_ids,
                    user_id=current_user.id,
                    top_k=10  # 增加返回结果数量
                )
                if rag_context:
                    print(f"[RAG] ✓ 成功检索到 {len(search_results)} 个相关文档块")
                else:
                    print(f"[RAG] ✗ 没有检索到相关内容")
            except Exception as e:
                print(f"[RAG ERROR] 检索失败: {str(e)}")
                import traceback
                traceback.print_exc()
                # RAG失败不影响对话继续

        # 如果有RAG上下文，构建增强的提示词
        enhanced_message = request.message
        if rag_context:
            enhanced_message = rag_service.build_rag_prompt(rag_context, request.message)
            print(f"[RAG] 使用增强提示词，长度: {len(enhanced_message)}")

        # 如果请求流式响应
        if request.stream:
            async def event_generator():
                """生成SSE事件流"""
                try:
                    # 先输出大模型回答
                    print(f"[CHAT] 开始调用大模型，temperature={request.temperature}, max_tokens={max_tokens}")
                    chunk_count = 0
                    assistant_response = ""

                    # 如果有RAG结果，需要手动保存消息（带sources）
                    has_rag = search_results and len(search_results) > 0

                    async for chunk in conversation_service.chat_stream(
                        db=db,
                        session_id=request.session_id,
                        user_message=enhanced_message,  # 使用增强后的消息发送给LLM
                        temperature=request.temperature,
                        max_tokens=max_tokens,
                        auto_save=not has_rag,  # 如果有RAG，不自动保存，后面手动保存带sources的消息
                        save_user_message=request.message  # 但保存原始用户消息到数据库
                    ):
                        chunk_count += 1
                        assistant_response += chunk
                        # 发送SSE格式的数据
                        yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"

                        # 每100个chunk打印一次进度
                        if chunk_count % 100 == 0:
                            print(f"[CHAT] 已发送 {chunk_count} 个chunks...")

                    print(f"[CHAT] ✓ 流式响应完成，共发送 {chunk_count} 个chunks")

                    # 大模型回答完成后，处理引用来源
                    sources = None
                    if has_rag:
                        # 只取第一个（相似度最高的）
                        top_result = search_results[0]
                        sources = [{
                            "knowledge_base_name": top_result.get("knowledge_base_name", ""),
                            "document_name": top_result.get("document_name", ""),
                            "similarity": round(top_result.get("similarity", 0), 2),
                            "chunk_index": top_result.get("chunk_index", 0),
                            "content": top_result.get("content", "")  # 包含匹配的文本内容
                        }]

                        # 手动保存带sources的assistant消息
                        conversation_service.save_message(db, request.session_id, "assistant", assistant_response, sources=sources)
                        print(f"[RAG] 保存消息时附加引用来源: {top_result.get('document_name', 'unknown')}")

                        # 发送引用来源信息给前端
                        yield f"data: {json.dumps({'sources': sources}, ensure_ascii=False)}\n\n"
                        print(f"[RAG] 发送引用来源: {top_result.get('document_name', 'unknown')}, 相似度: {top_result.get('similarity', 0):.3f}, 内容长度: {len(top_result.get('content', ''))} 字符")

                    # 记录模型调用
                    record_model_usage(db, current_user.id, request.session_id, model_type, model_name, api_url)

                    # 发送完成信号
                    yield f"data: {json.dumps({'done': True}, ensure_ascii=False)}\n\n"

                except Exception as e:
                    print(f"[STREAM ERROR] 流式响应异常: {str(e)}")
                    import traceback
                    traceback.print_exc()
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
                user_message=enhanced_message,  # 使用增强后的消息
                temperature=request.temperature,
                max_tokens=max_tokens
            )

            # 记录模型调用
            record_model_usage(db, current_user.id, request.session_id, model_type, model_name, api_url)

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


# ==================== 管理后台API ====================

@app.get("/api/admin/users")
async def admin_get_users(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """获取所有用户列表及统计信息（需要管理员权限）"""
    try:
        users = get_all_users_with_stats(db)
        return {"users": users, "total": len(users)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取用户列表失败: {str(e)}")


@app.get("/api/admin/users/{user_id}")
async def admin_get_user_detail(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """获取用户详细信息（需要管理员权限）"""
    try:
        user_detail = get_user_detail(db, user_id)
        if not user_detail:
            raise HTTPException(status_code=404, detail="用户不存在")
        return user_detail
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取用户详情失败: {str(e)}")


@app.get("/api/admin/stats")
async def admin_get_system_stats(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """获取系统整体统计信息（需要管理员权限）"""
    try:
        stats = get_system_stats(db)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取系统统计失败: {str(e)}")


@app.post("/api/admin/users/{user_id}/toggle-status")
async def admin_toggle_user_status(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """切换用户激活状态（需要管理员权限）"""
    try:
        # 不能禁用自己
        if user_id == current_admin.id:
            raise HTTPException(status_code=400, detail="不能修改自己的状态")

        result = toggle_user_status(db, user_id)
        if not result:
            raise HTTPException(status_code=404, detail="用户不存在")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"切换用户状态失败: {str(e)}")


@app.post("/api/admin/users/{user_id}/set-admin")
async def admin_set_user_admin(
    user_id: int,
    is_admin: bool,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """设置用户管理员权限（需要管理员权限）"""
    try:
        # 不能修改自己的权限
        if user_id == current_admin.id:
            raise HTTPException(status_code=400, detail="不能修改自己的管理员权限")

        result = set_user_admin(db, user_id, is_admin)
        if not result:
            raise HTTPException(status_code=404, detail="用户不存在")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"设置管理员权限失败: {str(e)}")


@app.get("/api/admin/model-stats")
async def admin_get_model_stats(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """获取系统整体模型调用统计（管理员）"""
    try:
        stats = get_overall_model_stats(db)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取模型统计失败: {str(e)}")


@app.get("/api/admin/users/{user_id}/model-stats")
async def admin_get_user_model_stats(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """获取指定用户的模型调用统计（管理员）"""
    try:
        # 验证用户是否存在
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")

        stats = get_user_model_stats(db, user_id)
        return stats
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取用户模型统计失败: {str(e)}")


@app.get("/api/users/me/model-stats")
async def get_my_model_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取当前用户的模型调用统计"""
    try:
        stats = get_user_model_stats(db, current_user.id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取模型统计失败: {str(e)}")


@app.get("/api/admin/check")
async def admin_check_permission(
    current_user: User = Depends(get_current_active_user)
):
    """检查当前用户是否有管理员权限"""
    return {
        "is_admin": current_user.is_admin,
        "username": current_user.username
    }


@app.get("/api/admin/knowledge-bases")
async def admin_get_knowledge_base_stats(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """获取所有用户的知识库统计信息（需要管理员权限）"""
    try:
        stats = get_all_knowledge_base_stats(db)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取知识库统计失败: {str(e)}")


# ==================== 知识库管理API ====================

@app.post("/api/knowledge-bases")
async def create_knowledge_base(
    kb_data: KnowledgeBaseCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """创建知识库"""
    try:
        kb = knowledge_base_service.create_knowledge_base(
            db=db,
            user_id=current_user.id,
            name=kb_data.name,
            description=kb_data.description
        )
        return {
            "id": kb.id,
            "name": kb.name,
            "description": kb.description,
            "created_at": kb.created_at.isoformat() if kb.created_at else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/knowledge-bases")
async def list_knowledge_bases(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取用户的所有知识库"""
    try:
        kbs = knowledge_base_service.get_knowledge_bases(db, current_user.id)
        return {"knowledge_bases": kbs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/knowledge-bases/{kb_id}")
async def get_knowledge_base(
    kb_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取知识库详情"""
    try:
        kb = knowledge_base_service.get_knowledge_base(db, kb_id, current_user.id)
        if not kb:
            raise HTTPException(status_code=404, detail="知识库不存在")
        return kb
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/knowledge-bases/{kb_id}")
async def update_knowledge_base(
    kb_id: int,
    kb_data: KnowledgeBaseUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新知识库"""
    try:
        kb = knowledge_base_service.update_knowledge_base(
            db=db,
            kb_id=kb_id,
            user_id=current_user.id,
            name=kb_data.name,
            description=kb_data.description
        )
        if not kb:
            raise HTTPException(status_code=404, detail="知识库不存在")
        return {
            "id": kb.id,
            "name": kb.name,
            "description": kb.description,
            "updated_at": kb.updated_at.isoformat() if kb.updated_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/knowledge-bases/{kb_id}")
async def delete_knowledge_base(
    kb_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """删除知识库"""
    try:
        success = knowledge_base_service.delete_knowledge_base(db, kb_id, current_user.id)
        if not success:
            raise HTTPException(status_code=404, detail="知识库不存在")
        return {"message": "知识库已删除"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/knowledge-bases/{kb_id}/documents")
async def upload_document(
    kb_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """上传文档到知识库"""
    try:
        # 验证文件类型
        filename = file.filename
        if not filename:
            raise HTTPException(status_code=400, detail="文件名不能为空")

        # 获取文件扩展名
        file_ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        if file_ext not in ['txt', 'pdf', 'doc', 'docx']:
            raise HTTPException(status_code=400, detail=f"不支持的文件类型: {file_ext}")

        # 读取文件内容
        file_content = await file.read()

        # 添加文档
        doc = await knowledge_base_service.add_document(
            db=db,
            kb_id=kb_id,
            user_id=current_user.id,
            filename=filename,
            file_content=file_content,
            file_type=file_ext
        )

        return {
            "id": doc.id,
            "filename": doc.filename,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "status": doc.status,
            "created_at": doc.created_at.isoformat() if doc.created_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传文档失败: {str(e)}")


@app.get("/api/knowledge-bases/{kb_id}/documents")
async def list_documents(
    kb_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取知识库的所有文档"""
    try:
        documents = knowledge_base_service.get_documents(db, kb_id, current_user.id)
        return {"documents": documents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/documents/{doc_id}")
async def delete_document(
    doc_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """删除文档"""
    try:
        success = knowledge_base_service.delete_document(db, doc_id, current_user.id)
        if not success:
            raise HTTPException(status_code=404, detail="文档不存在")
        return {"message": "文档已删除"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 临时文档问答API ====================

@app.post("/api/temp-docs/upload")
async def upload_temp_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """上传临时文档并解析"""
    try:
        # 验证文件名
        filename = file.filename
        if not filename:
            raise HTTPException(status_code=400, detail="文件名不能为空")

        # 读取文件内容
        file_content = await file.read()
        if len(file_content) == 0:
            raise HTTPException(status_code=400, detail="文件内容为空")

        # 上传并解析文档
        doc_id, doc_info = await temp_doc_service.upload_and_parse(filename, file_content)

        return {
            "message": "文档上传成功",
            "doc_id": doc_id,
            "doc_info": doc_info
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[ERROR] 上传临时文档失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"上传文档失败: {str(e)}")


@app.post("/api/temp-docs/{doc_id}/chat")
async def chat_with_temp_doc(
    doc_id: str,
    request: TempDocChatRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """基于临时文档进行问答（支持流式响应）"""
    try:
        from llm_service import llm_service

        print(f"\n[TEMP DOC CHAT] doc_id: {doc_id}, question: {request.message[:50]}...")

        # 获取用户配置
        user_config = db.query(UserConfig).filter_by(user_id=current_user.id).first()

        # 配置LLM服务
        if user_config:
            model_type = user_config.current_model_type
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

        # 检索相关文档内容
        context, relevant_chunks = await temp_doc_service.search_relevant_chunks(
            doc_id=doc_id,
            query=request.message,
            top_k=5,
            max_context_length=24000  # 留出8k给问题和回答
        )

        # 构建提示词
        if context:
            prompt = f"""请基于以下文档内容回答问题。

文档内容：
{context}

问题：{request.message}

请根据文档内容给出详细、准确的回答。如果文档中没有相关信息，请明确说明。"""
        else:
            prompt = request.message

        print(f"[TEMP DOC CHAT] 检索到的上下文长度: {len(context)}, 提示词总长度: {len(prompt)}")

        # 流式响应
        async def event_generator():
            """生成SSE事件流"""
            try:
                chunk_count = 0
                assistant_response = ""

                # 调用LLM生成回答
                async for chunk in llm_service.chat_completion_stream(
                    messages=[{"role": "user", "content": prompt}],
                    temperature=request.temperature,
                    max_tokens=8000  # 为回答预留8k token
                ):
                    chunk_count += 1
                    assistant_response += chunk
                    # 发送SSE格式的数据
                    yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"

                    if chunk_count % 100 == 0:
                        print(f"[TEMP DOC CHAT] 已发送 {chunk_count} 个chunks...")

                print(f"[TEMP DOC CHAT] ✓ 流式响应完成，共发送 {chunk_count} 个chunks")

                # 如果有引用来源，发送给前端
                if relevant_chunks and len(relevant_chunks) > 0:
                    top_chunk = relevant_chunks[0]
                    source_info = {
                        "similarity": round(top_chunk.get("similarity", 0), 2),
                        "content_preview": top_chunk.get("content", "")[:200] + "..."
                    }
                    yield f"data: {json.dumps({'source': source_info}, ensure_ascii=False)}\n\n"

                # 发送完成信号
                yield f"data: {json.dumps({'done': True}, ensure_ascii=False)}\n\n"

            except Exception as e:
                print(f"[TEMP DOC CHAT ERROR] 流式响应异常: {str(e)}")
                import traceback
                traceback.print_exc()
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

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"[ERROR] 临时文档问答失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"问答失败: {str(e)}")


@app.delete("/api/temp-docs/{doc_id}")
async def delete_temp_document(
    doc_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """删除临时文档"""
    try:
        success = temp_doc_service.delete_document(doc_id)
        if not success:
            raise HTTPException(status_code=404, detail="文档不存在或已过期")
        return {"message": "临时文档已删除"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除文档失败: {str(e)}")


@app.get("/api/temp-docs/{doc_id}")
async def get_temp_document_info(
    doc_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """获取临时文档信息"""
    try:
        doc_info = temp_doc_service.get_document_info(doc_id)
        return doc_info
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取文档信息失败: {str(e)}")


# 主程序入口
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
