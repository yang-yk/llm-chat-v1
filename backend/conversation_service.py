"""
对话管理服务
"""
import uuid
from typing import List, Dict, Optional, AsyncGenerator
from sqlalchemy.orm import Session
from database import Conversation, Message
from llm_service import llm_service


class ConversationService:
    """对话管理服务类"""

    @staticmethod
    def create_conversation(db: Session, user_id: int) -> str:
        """
        创建新的对话会话

        Args:
            db: 数据库会话
            user_id: 用户ID

        Returns:
            新创建的session_id
        """
        session_id = str(uuid.uuid4())
        conversation = Conversation(session_id=session_id, user_id=user_id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

        # 每次创建新对话时检查并清理旧对话
        ConversationService.cleanup_old_conversations(db, user_id)

        return session_id

    @staticmethod
    def get_conversation_history(db: Session, session_id: str, include_id: bool = False) -> List[Dict]:
        """
        获取对话历史记录

        Args:
            db: 数据库会话
            session_id: 会话ID
            include_id: 是否包含message_id（用于前端显示）

        Returns:
            消息列表，格式为 [{"role": "user", "content": "..."}] 或 [{"id": 1, "role": "user", "content": "..."}]
        """
        conversation = db.query(Conversation).filter(Conversation.session_id == session_id).first()
        if not conversation:
            return []

        messages = db.query(Message).filter(Message.conversation_id == conversation.id).order_by(Message.created_at).all()

        if include_id:
            return [{"id": msg.id, "role": msg.role, "content": msg.content} for msg in messages]
        else:
            return [{"role": msg.role, "content": msg.content} for msg in messages]

    @staticmethod
    def save_message(db: Session, session_id: str, role: str, content: str):
        """
        保存消息到数据库

        Args:
            db: 数据库会话
            session_id: 会话ID
            role: 角色（user 或 assistant）
            content: 消息内容
        """
        conversation = db.query(Conversation).filter(Conversation.session_id == session_id).first()
        if not conversation:
            raise ValueError(f"会话 {session_id} 不存在")

        message = Message(conversation_id=conversation.id, role=role, content=content)
        db.add(message)
        db.commit()

    @staticmethod
    async def generate_title(db: Session, session_id: str) -> str:
        """
        根据对话内容生成标题

        Args:
            db: 数据库会话
            session_id: 会话ID

        Returns:
            生成的标题
        """
        conversation = db.query(Conversation).filter(Conversation.session_id == session_id).first()
        if not conversation:
            raise ValueError(f"会话 {session_id} 不存在")

        # 获取前几条消息用于生成标题
        messages = db.query(Message).filter(Message.conversation_id == conversation.id).order_by(Message.created_at).limit(4).all()

        if not messages:
            return "新对话"

        # 构建用于生成标题的提示
        conversation_text = "\n".join([f"{msg.role}: {msg.content[:100]}" for msg in messages])

        title_prompt = [
            {"role": "system", "content": "你是一个助手，需要根据对话内容生成一个简洁的标题（不超过20个字）。只返回标题文本，不要有其他内容。"},
            {"role": "user", "content": f"请为以下对话生成一个简洁的标题（不超过20个字）：\n\n{conversation_text}"}
        ]

        try:
            title = await llm_service.chat_completion(title_prompt, temperature=0.5, max_tokens=50)
            title = title.strip().strip('"').strip("'")[:50]  # 清理和限制长度

            # 更新对话标题
            conversation.title = title
            db.commit()

            return title
        except Exception as e:
            print(f"生成标题失败: {str(e)}")
            return "新对话"

    @staticmethod
    async def chat(db: Session, session_id: str, user_message: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        """
        进行多轮对话

        Args:
            db: 数据库会话
            session_id: 会话ID
            user_message: 用户消息
            temperature: 温度参数
            max_tokens: 最大生成token数

        Returns:
            助手的回复
        """
        # 获取历史对话
        history = ConversationService.get_conversation_history(db, session_id)

        # 添加用户当前消息
        history.append({"role": "user", "content": user_message})

        # 调用大模型API
        assistant_reply = await llm_service.chat_completion(history, temperature, max_tokens)

        # 保存用户消息和助手回复到数据库
        ConversationService.save_message(db, session_id, "user", user_message)
        ConversationService.save_message(db, session_id, "assistant", assistant_reply)

        # 如果是第一轮对话，自动生成标题
        conversation = db.query(Conversation).filter(Conversation.session_id == session_id).first()
        if conversation and conversation.title == "新对话":
            # 异步生成标题（不阻塞返回）
            import asyncio
            asyncio.create_task(ConversationService.generate_title(db, session_id))

        return assistant_reply

    @staticmethod
    async def chat_stream(db: Session, session_id: str, user_message: str, temperature: float = 0.7, max_tokens: int = 2000) -> AsyncGenerator[str, None]:
        """
        进行流式多轮对话

        Args:
            db: 数据库会话
            session_id: 会话ID
            user_message: 用户消息
            temperature: 温度参数
            max_tokens: 最大生成token数

        Yields:
            逐步生成的文本片段
        """
        # 获取历史对话
        history = ConversationService.get_conversation_history(db, session_id)

        # 添加用户当前消息
        history.append({"role": "user", "content": user_message})

        # 保存用户消息
        ConversationService.save_message(db, session_id, "user", user_message)

        # 调用大模型API流式生成
        full_response = ""
        async for chunk in llm_service.chat_completion_stream(history, temperature, max_tokens):
            full_response += chunk
            yield chunk

        # 保存完整的助手回复
        ConversationService.save_message(db, session_id, "assistant", full_response)

        # 如果是第一轮对话，自动生成标题（同步执行确保生成）
        conversation = db.query(Conversation).filter(Conversation.session_id == session_id).first()
        if conversation and conversation.title == "新对话":
            try:
                await ConversationService.generate_title(db, session_id)
            except Exception as e:
                print(f"生成标题失败: {str(e)}")

    @staticmethod
    def delete_conversation(db: Session, session_id: str):
        """
        删除对话会话

        Args:
            db: 数据库会话
            session_id: 会话ID
        """
        conversation = db.query(Conversation).filter(Conversation.session_id == session_id).first()
        if conversation:
            db.delete(conversation)
            db.commit()

    @staticmethod
    def list_conversations(db: Session, user_id: int) -> List[Dict]:
        """
        获取用户的所有对话会话列表(只返回最近500条)

        Args:
            db: 数据库会话
            user_id: 用户ID

        Returns:
            会话列表(最多500条)
        """
        # 只获取该用户最近更新的500条对话
        conversations = db.query(Conversation).filter(
            Conversation.user_id == user_id
        ).order_by(Conversation.updated_at.desc()).limit(500).all()
        return [
            {
                "session_id": conv.session_id,
                "title": conv.title,
                "created_at": conv.created_at.isoformat(),
                "updated_at": conv.updated_at.isoformat(),
                "message_count": len(conv.messages)
            }
            for conv in conversations
        ]

    @staticmethod
    def cleanup_old_conversations(db: Session, user_id: int):
        """
        清理用户超过500条的旧对话记录

        Args:
            db: 数据库会话
            user_id: 用户ID
        """
        # 获取该用户的总对话数
        total_count = db.query(Conversation).filter(Conversation.user_id == user_id).count()

        if total_count > 500:
            # 获取第500条之后的所有对话ID
            old_conversations = db.query(Conversation).filter(
                Conversation.user_id == user_id
            ).order_by(
                Conversation.updated_at.desc()
            ).offset(500).all()

            # 删除旧对话
            for conv in old_conversations:
                db.delete(conv)

            db.commit()
            print(f"已清理用户 {user_id} 的 {len(old_conversations)} 条旧对话记录")

    @staticmethod
    def search_conversations(db: Session, user_id: int, query: str) -> List[Dict]:
        """
        在用户的对话中搜索包含关键词的对话

        Args:
            db: 数据库会话
            user_id: 用户ID
            query: 搜索关键词

        Returns:
            包含关键词的对话列表
        """
        if not query or not query.strip():
            return []

        # 搜索标题或消息内容中包含关键词的对话
        search_pattern = f"%{query}%"

        # 查找标题匹配的对话（仅限该用户）
        title_matches = db.query(Conversation).filter(
            Conversation.user_id == user_id,
            Conversation.title.like(search_pattern)
        ).order_by(Conversation.updated_at.desc()).limit(100).all()

        # 查找消息内容匹配的对话（仅限该用户）
        message_matches = db.query(Conversation).join(Message).filter(
            Conversation.user_id == user_id,
            Message.content.like(search_pattern)
        ).order_by(Conversation.updated_at.desc()).limit(100).all()

        # 合并结果并去重
        conversation_dict = {}
        for conv in title_matches + message_matches:
            if conv.session_id not in conversation_dict:
                # 统计匹配的消息数
                match_count = db.query(Message).filter(
                    Message.conversation_id == conv.id,
                    Message.content.like(search_pattern)
                ).count()

                # 获取第一条匹配的消息片段
                first_match = db.query(Message).filter(
                    Message.conversation_id == conv.id,
                    Message.content.like(search_pattern)
                ).first()

                preview = ""
                if first_match:
                    content = first_match.content
                    index = content.lower().find(query.lower())
                    if index != -1:
                        start = max(0, index - 50)
                        end = min(len(content), index + len(query) + 50)
                        preview = content[start:end]

                conversation_dict[conv.session_id] = {
                    "session_id": conv.session_id,
                    "title": conv.title,
                    "created_at": conv.created_at.isoformat(),
                    "updated_at": conv.updated_at.isoformat(),
                    "message_count": len(conv.messages),
                    "match_count": match_count,
                    "preview": preview
                }

        # 按更新时间排序
        return sorted(conversation_dict.values(), key=lambda x: x["updated_at"], reverse=True)


# 创建全局对话服务实例
conversation_service = ConversationService()
