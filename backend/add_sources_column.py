#!/usr/bin/env python3
"""
添加sources列到messages表
"""
import sqlite3
import os
from config import DATABASE_URL

# 从DATABASE_URL提取文件路径
if DATABASE_URL.startswith("sqlite:///"):
    db_path = DATABASE_URL.replace("sqlite:///", "").replace("./", "")
    # 确保路径是绝对路径
    if not os.path.isabs(db_path):
        db_path = os.path.join(os.path.dirname(__file__), db_path)

    print(f"数据库文件路径: {db_path}")

    if not os.path.exists(db_path):
        print(f"⚠️  数据库文件不存在: {db_path}")
        print("后端启动时会自动创建")
        exit(0)

    # 连接数据库
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 检查sources列是否已存在
    cursor.execute("PRAGMA table_info(messages)")
    columns = [row[1] for row in cursor.fetchall()]

    if 'sources' in columns:
        print("✓ sources列已存在")
    else:
        print("正在添加sources列...")
        try:
            cursor.execute("ALTER TABLE messages ADD COLUMN sources TEXT")
            conn.commit()
            print("✓ sources列添加成功")
        except Exception as e:
            print(f"⚠️  添加列失败: {e}")

    conn.close()
else:
    print(f"不支持的数据库类型: {DATABASE_URL}")
