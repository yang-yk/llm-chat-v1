#!/usr/bin/env python3
"""
非交互式创建/更新超级管理员脚本
使用方法: python set_admin.py --username admin --password Admin@2025
"""
from dotenv import load_dotenv
load_dotenv()

from database import SessionLocal, User, UserConfig, init_db
from auth import get_password_hash
import sys
import argparse

def set_admin(username: str, password: str, email: str = None):
    """创建或更新超级管理员"""
    init_db()
    db = SessionLocal()

    try:
        user = db.query(User).filter(User.username == username).first()

        if user:
            print(f"⚠️  用户 '{username}' 已存在，正在更新...")
            user.is_admin = True
            user.is_active = True
            user.hashed_password = get_password_hash(password)
            if email:
                user.email = email
            db.commit()
            print(f"✅ 用户 '{username}' 已更新为超级管理员")
        else:
            print(f"📝 创建新用户 '{username}'...")
            new_user = User(
                username=username,
                hashed_password=get_password_hash(password),
                email=email,
                is_active=True,
                is_admin=True
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)

            # 创建默认配置
            config = UserConfig(
                user_id=new_user.id,
                current_model_type="glm",
                max_tokens=8000
            )
            db.add(config)
            db.commit()
            print(f"✅ 超级管理员 '{username}' 创建成功")

        print(f"\n🔐 登录信息:")
        print(f"   用户名: {username}")
        print(f"   密码: {password}")

    except Exception as e:
        print(f"❌ 操作失败: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="创建LLM Chat超级管理员")
    parser.add_argument("-u", "--username", required=True, help="管理员用户名")
    parser.add_argument("-p", "--password", required=True, help="管理员密码")
    parser.add_argument("-e", "--email", help="管理员邮箱")

    args = parser.parse_args()
    set_admin(args.username, args.password, args.email)
