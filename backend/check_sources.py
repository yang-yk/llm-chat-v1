#!/usr/bin/env python3
"""检查数据库中消息的sources字段"""
import sqlite3
import json

db_path = "/home/data2/yangyk/llm-chat-v1/db/conversation.db"

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 获取最新的5条消息
cursor.execute("""
    SELECT id, role, substr(content, 1, 100) as content_preview, sources
    FROM messages
    ORDER BY id DESC
    LIMIT 5
""")

print("=" * 80)
print("最新的5条消息：")
print("=" * 80)

for row in cursor.fetchall():
    msg_id, role, content_preview, sources = row
    print(f"\n消息ID: {msg_id}")
    print(f"角色: {role}")
    print(f"内容预览: {content_preview}")
    print(f"Sources字段: {sources if sources else '(空)'}")

    if sources:
        try:
            sources_obj = json.loads(sources)
            print(f"Sources解析成功: {json.dumps(sources_obj, ensure_ascii=False, indent=2)}")
        except Exception as e:
            print(f"Sources解析失败: {e}")
    print("-" * 80)

conn.close()
