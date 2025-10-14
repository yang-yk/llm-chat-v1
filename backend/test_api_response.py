#!/usr/bin/env python3
"""测试API返回的历史记录格式"""
import sys
sys.path.insert(0, '/home/data2/yangyk/llm-chat-v2/backend')

from database import SessionLocal
from conversation_service import conversation_service

db = SessionLocal()

# 获取最新的会话ID
session_id = "db7d2402-6e70-4990-8d46-ec9dc0bfb491"  # 最新的会话

print(f"测试会话: {session_id}")
print("=" * 80)

# 测试 get_conversation_history 方法
history = conversation_service.get_conversation_history(db, session_id, include_id=True)

print(f"\n返回的消息数量: {len(history)}")
print("\n" + "=" * 80)

for msg in history:
    print(f"\n消息ID: {msg.get('id')}")
    print(f"角色: {msg.get('role')}")
    print(f"内容预览: {msg.get('content', '')[:100]}")
    print(f"是否有sources: {'sources' in msg}")
    if 'sources' in msg:
        print(f"Sources内容: {msg['sources']}")
    print("-" * 80)

db.close()
