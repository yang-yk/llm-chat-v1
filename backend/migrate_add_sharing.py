"""
数据库迁移脚本：添加知识库分享功能

此脚本会：
1. 在 knowledge_bases 表中添加 is_shareable 字段
2. 创建 knowledge_base_shares 表
"""
import sys
import os
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

# 添加父目录到路径
sys.path.insert(0, os.path.dirname(__file__))

from config import DATABASE_URL
from database import Base, KnowledgeBase, KnowledgeBaseShare


def migrate_database():
    """执行数据库迁移"""
    print("=" * 60)
    print("开始数据库迁移：添加知识库分享功能")
    print("=" * 60)

    # 创建数据库引擎
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
    inspector = inspect(engine)

    # 检查 knowledge_base_shares 表是否存在
    if 'knowledge_base_shares' in inspector.get_table_names():
        print("✓ knowledge_base_shares 表已存在，跳过创建")
    else:
        print("→ 创建 knowledge_base_shares 表...")
        # 创建所有表（会自动创建不存在的表）
        Base.metadata.create_all(bind=engine)
        print("✓ knowledge_base_shares 表创建成功")

    # 检查 knowledge_bases 表的 is_shareable 字段
    with engine.connect() as conn:
        columns = inspector.get_columns('knowledge_bases')
        column_names = [col['name'] for col in columns]

        if 'is_shareable' in column_names:
            print("✓ knowledge_bases.is_shareable 字段已存在，跳过添加")
        else:
            print("→ 添加 knowledge_bases.is_shareable 字段...")
            # SQLite 和 PostgreSQL 的 ALTER TABLE 语法稍有不同
            if "sqlite" in DATABASE_URL:
                # SQLite
                conn.execute(text(
                    "ALTER TABLE knowledge_bases ADD COLUMN is_shareable BOOLEAN NOT NULL DEFAULT 0"
                ))
            else:
                # PostgreSQL/MySQL
                conn.execute(text(
                    "ALTER TABLE knowledge_bases ADD COLUMN is_shareable BOOLEAN NOT NULL DEFAULT FALSE"
                ))
            conn.commit()
            print("✓ is_shareable 字段添加成功")

    print("=" * 60)
    print("数据库迁移完成！")
    print("=" * 60)
    print("\n新增功能：")
    print("  1. 知识库可分享标记 (is_shareable 字段)")
    print("  2. 知识库分享记录表 (knowledge_base_shares)")
    print("\n后续步骤：")
    print("  1. 重启后端服务以加载新的数据库模型")
    print("  2. 使用管理员账户设置知识库为可分享状态")
    print("  3. 管理员可以将知识库分享给指定用户")
    print("=" * 60)


if __name__ == "__main__":
    try:
        migrate_database()
    except Exception as e:
        print(f"\n❌ 迁移失败: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
