"""
管理后台服务逻辑
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from datetime import datetime, timedelta
from database import User, Conversation, Message, MessageFeedback, ModelUsage, get_beijing_time, BEIJING_TZ


def get_all_users_with_stats(db: Session) -> List[Dict[str, Any]]:
    """获取所有用户及其使用统计"""
    users = db.query(User).all()

    # 分离 admin 用户和其他用户
    admin_user = None
    other_users = []

    for user in users:
        if user.username == "admin":
            admin_user = user
        else:
            other_users.append(user)

    # 其他用户按用户名首字母排序
    other_users.sort(key=lambda u: u.username.lower())

    # admin 用户放在最前面
    sorted_users = []
    if admin_user:
        sorted_users.append(admin_user)
    sorted_users.extend(other_users)

    result = []
    for user in sorted_users:
        # 统计对话数
        conversation_count = db.query(func.count(Conversation.id)).filter(
            Conversation.user_id == user.id
        ).scalar()

        # 统计消息数
        message_count = db.query(func.count(Message.id)).join(
            Conversation
        ).filter(
            Conversation.user_id == user.id
        ).scalar()

        # 统计用户消息数（只算用户发送的）
        user_message_count = db.query(func.count(Message.id)).join(
            Conversation
        ).filter(
            Conversation.user_id == user.id,
            Message.role == "user"
        ).scalar()

        # 统计AI消息数
        ai_message_count = db.query(func.count(Message.id)).join(
            Conversation
        ).filter(
            Conversation.user_id == user.id,
            Message.role == "assistant"
        ).scalar()

        # 获取最后活跃时间（最近一条消息的时间）
        last_message = db.query(Message).join(
            Conversation
        ).filter(
            Conversation.user_id == user.id
        ).order_by(Message.created_at.desc()).first()

        last_active = last_message.created_at if last_message else user.created_at

        result.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_active": last_active.isoformat() if last_active else None,
            "stats": {
                "conversation_count": conversation_count,
                "total_message_count": message_count,
                "user_message_count": user_message_count,
                "ai_message_count": ai_message_count
            }
        })

    return result


def get_user_detail(db: Session, user_id: int) -> Dict[str, Any]:
    """获取用户详细信息"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    # 统计各类数据
    conversations = db.query(Conversation).filter(
        Conversation.user_id == user_id
    ).order_by(Conversation.updated_at.desc()).all()

    conversation_details = []
    for conv in conversations:
        msg_count = db.query(func.count(Message.id)).filter(
            Message.conversation_id == conv.id
        ).scalar()

        conversation_details.append({
            "id": conv.id,
            "session_id": conv.session_id,
            "title": conv.title,
            "message_count": msg_count,
            "created_at": conv.created_at.isoformat() if conv.created_at else None,
            "updated_at": conv.updated_at.isoformat() if conv.updated_at else None
        })

    # 反馈统计
    like_count = db.query(func.count(MessageFeedback.id)).filter(
        MessageFeedback.user_id == user_id,
        MessageFeedback.feedback_type == "like"
    ).scalar()

    dislike_count = db.query(func.count(MessageFeedback.id)).filter(
        MessageFeedback.user_id == user_id,
        MessageFeedback.feedback_type == "dislike"
    ).scalar()

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_active": user.is_active,
        "is_admin": user.is_admin,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "conversations": conversation_details,
        "feedback_stats": {
            "like_count": like_count,
            "dislike_count": dislike_count
        }
    }


def get_system_stats(db: Session) -> Dict[str, Any]:
    """获取系统整体统计"""
    # 用户统计
    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
    admin_users = db.query(func.count(User.id)).filter(User.is_admin == True).scalar()

    # 对话统计
    total_conversations = db.query(func.count(Conversation.id)).scalar()

    # 消息统计
    total_messages = db.query(func.count(Message.id)).scalar()
    user_messages = db.query(func.count(Message.id)).filter(Message.role == "user").scalar()
    ai_messages = db.query(func.count(Message.id)).filter(Message.role == "assistant").scalar()

    # 反馈统计
    total_likes = db.query(func.count(MessageFeedback.id)).filter(
        MessageFeedback.feedback_type == "like"
    ).scalar()
    total_dislikes = db.query(func.count(MessageFeedback.id)).filter(
        MessageFeedback.feedback_type == "dislike"
    ).scalar()

    # 今日统计（北京时间）
    beijing_now = get_beijing_time()
    today_start = beijing_now.replace(hour=0, minute=0, second=0, microsecond=0)

    today_users = db.query(func.count(User.id)).filter(
        User.created_at >= today_start
    ).scalar()

    today_conversations = db.query(func.count(Conversation.id)).filter(
        Conversation.created_at >= today_start
    ).scalar()

    today_messages = db.query(func.count(Message.id)).filter(
        Message.created_at >= today_start
    ).scalar()

    # 最近7天活跃用户（发送过消息的用户）
    seven_days_ago = beijing_now - timedelta(days=7)
    active_user_ids = db.query(Conversation.user_id).join(Message).filter(
        Message.created_at >= seven_days_ago
    ).distinct().all()
    weekly_active_users = len(active_user_ids)

    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "admin": admin_users,
            "today_new": today_users,
            "weekly_active": weekly_active_users
        },
        "conversations": {
            "total": total_conversations,
            "today_new": today_conversations
        },
        "messages": {
            "total": total_messages,
            "user_messages": user_messages,
            "ai_messages": ai_messages,
            "today_new": today_messages
        },
        "feedback": {
            "total_likes": total_likes,
            "total_dislikes": total_dislikes,
            "satisfaction_rate": round(total_likes / (total_likes + total_dislikes) * 100, 2) if (total_likes + total_dislikes) > 0 else 0
        }
    }


def toggle_user_status(db: Session, user_id: int) -> Dict[str, Any]:
    """切换用户激活状态"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    # admin 用户无法被禁用
    if user.username == "admin":
        raise ValueError("admin 用户无法被禁用")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "username": user.username,
        "is_active": user.is_active
    }


def set_user_admin(db: Session, user_id: int, is_admin: bool) -> Dict[str, Any]:
    """设置用户管理员权限"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    # admin 用户的管理员权限无法被取消
    if user.username == "admin" and not is_admin:
        raise ValueError("admin 用户的管理员权限无法被取消")

    user.is_admin = is_admin
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "username": user.username,
        "is_admin": user.is_admin
    }


def get_overall_model_stats(db: Session) -> Dict[str, Any]:
    """获取系统整体模型调用统计"""
    # 按模型类型统计调用次数
    model_type_stats = db.query(
        ModelUsage.model_type,
        func.count(ModelUsage.id).label('count')
    ).group_by(ModelUsage.model_type).all()

    # 按具体模型统计调用次数
    model_name_stats = db.query(
        ModelUsage.model_name,
        ModelUsage.model_type,
        func.count(ModelUsage.id).label('count')
    ).group_by(ModelUsage.model_name, ModelUsage.model_type).all()

    # 总调用次数
    total_calls = db.query(func.count(ModelUsage.id)).scalar()

    # 今日调用次数
    beijing_now = get_beijing_time()
    today_start = beijing_now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_calls = db.query(func.count(ModelUsage.id)).filter(
        ModelUsage.created_at >= today_start
    ).scalar()

    # 最近7天每天的调用次数
    seven_days_ago = beijing_now - timedelta(days=7)
    daily_calls = []
    for i in range(7):
        day_start = (beijing_now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = db.query(func.count(ModelUsage.id)).filter(
            ModelUsage.created_at >= day_start,
            ModelUsage.created_at < day_end
        ).scalar()
        daily_calls.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "count": count
        })

    # 按模型类型分组
    by_type = {}
    for model_type, count in model_type_stats:
        by_type[model_type] = count

    # 按具体模型分组
    by_model = []
    for model_name, model_type, count in model_name_stats:
        by_model.append({
            "model_name": model_name,
            "model_type": model_type,
            "count": count,
            "percentage": round(count / total_calls * 100, 2) if total_calls > 0 else 0
        })

    return {
        "total_calls": total_calls,
        "today_calls": today_calls,
        "by_type": by_type,
        "by_model": sorted(by_model, key=lambda x: x['count'], reverse=True),
        "daily_calls": list(reversed(daily_calls))  # 从旧到新排序
    }


def get_user_model_stats(db: Session, user_id: int) -> Dict[str, Any]:
    """获取指定用户的模型调用统计"""
    # 按模型类型统计
    model_type_stats = db.query(
        ModelUsage.model_type,
        func.count(ModelUsage.id).label('count')
    ).filter(ModelUsage.user_id == user_id).group_by(ModelUsage.model_type).all()

    # 按具体模型统计
    model_name_stats = db.query(
        ModelUsage.model_name,
        ModelUsage.model_type,
        func.count(ModelUsage.id).label('count')
    ).filter(ModelUsage.user_id == user_id).group_by(
        ModelUsage.model_name, ModelUsage.model_type
    ).all()

    # 总调用次数
    total_calls = db.query(func.count(ModelUsage.id)).filter(
        ModelUsage.user_id == user_id
    ).scalar()

    # 最近一次调用时间
    last_usage = db.query(ModelUsage).filter(
        ModelUsage.user_id == user_id
    ).order_by(ModelUsage.created_at.desc()).first()

    # 按模型类型分组
    by_type = {}
    for model_type, count in model_type_stats:
        by_type[model_type] = count

    # 按具体模型分组
    by_model = []
    for model_name, model_type, count in model_name_stats:
        by_model.append({
            "model_name": model_name,
            "model_type": model_type,
            "count": count,
            "percentage": round(count / total_calls * 100, 2) if total_calls > 0 else 0
        })

    return {
        "user_id": user_id,
        "total_calls": total_calls,
        "last_usage": last_usage.created_at.isoformat() if last_usage else None,
        "by_type": by_type,
        "by_model": sorted(by_model, key=lambda x: x['count'], reverse=True)
    }
