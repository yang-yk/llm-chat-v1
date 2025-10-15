"""
数据库迁移脚本：更新知识库分享权限模型

此脚本会：
1. 将所有 'read_only' 权限更新为 'read'
2. 将所有 'editable' 权限更新为 'read' (因为新模型不再支持编辑权限)
3. 确保新的权限模型为：read（可读）/ none（不可读）
"""
import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# 添加父目录到路径
sys.path.insert(0, os.path.dirname(__file__))

from config import DATABASE_URL


def migrate_permissions():
    """执行权限迁移"""
    print("=" * 60)
    print("开始数据库迁移：更新知识库分享权限模型")
    print("=" * 60)

    # 创建数据库引擎
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})

    with engine.connect() as conn:
        # 1. 统计当前权限分布
        print("\n→ 统计当前权限分布...")
        result = conn.execute(text(
            "SELECT permission, COUNT(*) as count FROM knowledge_base_shares GROUP BY permission"
        ))
        current_permissions = result.fetchall()

        if current_permissions:
            print("  当前权限分布：")
            for perm, count in current_permissions:
                print(f"    - {perm}: {count} 条记录")
        else:
            print("  暂无分享记录")

        # 2. 更新 'read_only' 为 'read'
        print("\n→ 更新 'read_only' 权限为 'read'...")
        result = conn.execute(text(
            "UPDATE knowledge_base_shares SET permission = 'read' WHERE permission = 'read_only'"
        ))
        read_only_count = result.rowcount
        print(f"  ✓ 已更新 {read_only_count} 条记录")

        # 3. 更新 'editable' 为 'read'（新模型不支持编辑权限，统一改为可读）
        print("\n→ 更新 'editable' 权限为 'read'...")
        result = conn.execute(text(
            "UPDATE knowledge_base_shares SET permission = 'read' WHERE permission = 'editable'"
        ))
        editable_count = result.rowcount
        print(f"  ✓ 已更新 {editable_count} 条记录")

        # 提交更改
        conn.commit()

        # 4. 验证更新结果
        print("\n→ 验证更新结果...")
        result = conn.execute(text(
            "SELECT permission, COUNT(*) as count FROM knowledge_base_shares GROUP BY permission"
        ))
        new_permissions = result.fetchall()

        if new_permissions:
            print("  更新后权限分布：")
            for perm, count in new_permissions:
                print(f"    - {perm}: {count} 条记录")
        else:
            print("  暂无分享记录")

    print("\n" + "=" * 60)
    print("权限迁移完成！")
    print("=" * 60)
    print("\n新权限模型说明：")
    print("  - read: 可读权限，可以查看知识库和文档名")
    print("  - none: 不可读权限，看不到知识库详情")
    print("\n重要变更：")
    print("  ✓ 所有 'read_only' 权限已更新为 'read'")
    print("  ✓ 所有 'editable' 权限已更新为 'read'")
    print("  ✓ 只有知识库所有者可以修改知识库（增删改文档）")
    print("  ✓ 被分享的用户只有查看权限，无修改权限")
    print("=" * 60)


if __name__ == "__main__":
    try:
        migrate_permissions()
    except Exception as e:
        print(f"\n❌ 迁移失败: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
