#!/usr/bin/env python3
"""
管理员账户创建脚本
Usage: python3 create_admin.py
"""

from database import SessionLocal, User, init_db
from auth import get_password_hash
import getpass


def create_admin_user():
    """创建管理员用户"""
    print("=" * 50)
    print("  LLM Chat System - 创建管理员账户")
    print("=" * 50)
    print()

    # 初始化数据库
    init_db()
    db = SessionLocal()

    try:
        # 检查是否已有管理员
        existing_admins = db.query(User).filter(User.is_admin == True).all()
        if existing_admins:
            print("现有管理员账户:")
            for admin in existing_admins:
                print(f"  - {admin.username} (ID: {admin.id}, Email: {admin.email or 'N/A'})")
            print()

            choice = input("是否继续创建新的管理员? (y/N): ").lower()
            if choice != 'y':
                print("操作已取消")
                return

        # 获取用户输入
        print("\n请输入新管理员账户信息:")
        username = input("用户名: ").strip()

        if not username:
            print("错误: 用户名不能为空")
            return

        # 检查用户名是否已存在
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            print(f"用户 '{username}' 已存在")

            if existing_user.is_admin:
                print("该用户已经是管理员")
                return
            else:
                choice = input("是否将此用户设置为管理员? (y/N): ").lower()
                if choice == 'y':
                    existing_user.is_admin = True
                    db.commit()
                    print(f"✓ 用户 '{username}' 已被设置为管理员")
                else:
                    print("操作已取消")
                return

        # 获取密码
        while True:
            password = getpass.getpass("密码: ")
            if not password:
                print("错误: 密码不能为空")
                continue

            password_confirm = getpass.getpass("确认密码: ")
            if password != password_confirm:
                print("错误: 两次输入的密码不一致，请重新输入")
                continue

            if len(password) < 6:
                print("错误: 密码长度至少为6个字符")
                continue

            break

        # 获取邮箱（可选）
        email = input("邮箱 (可选，直接回车跳过): ").strip()
        if email == "":
            email = None

        # 创建管理员用户
        admin_user = User(
            username=username,
            hashed_password=get_password_hash(password),
            email=email,
            is_active=True,
            is_admin=True
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print()
        print("=" * 50)
        print("✓ 管理员账户创建成功！")
        print("=" * 50)
        print(f"用户名: {admin_user.username}")
        print(f"用户ID: {admin_user.id}")
        print(f"邮箱: {admin_user.email or 'N/A'}")
        print(f"管理员: {'是' if admin_user.is_admin else '否'}")
        print()
        print("您现在可以使用此账户登录并访问管理后台")
        print("管理后台路径: /admin")
        print()

    except KeyboardInterrupt:
        print("\n\n操作已取消")
    except Exception as e:
        print(f"\n错误: {str(e)}")
        db.rollback()
    finally:
        db.close()


def list_admins():
    """列出所有管理员"""
    print("=" * 50)
    print("  所有管理员账户")
    print("=" * 50)
    print()

    init_db()
    db = SessionLocal()

    try:
        admins = db.query(User).filter(User.is_admin == True).all()

        if not admins:
            print("当前没有管理员账户")
            print()
            choice = input("是否创建新的管理员? (y/N): ").lower()
            if choice == 'y':
                create_admin_user()
            return

        print(f"共找到 {len(admins)} 个管理员账户:\n")
        for admin in admins:
            status = "激活" if admin.is_active else "禁用"
            print(f"ID: {admin.id}")
            print(f"  用户名: {admin.username}")
            print(f"  邮箱: {admin.email or 'N/A'}")
            print(f"  状态: {status}")
            print(f"  创建时间: {admin.created_at}")
            print()

    except Exception as e:
        print(f"错误: {str(e)}")
    finally:
        db.close()


def set_existing_user_as_admin():
    """将现有用户设置为管理员"""
    print("=" * 50)
    print("  设置现有用户为管理员")
    print("=" * 50)
    print()

    init_db()
    db = SessionLocal()

    try:
        username = input("请输入用户名: ").strip()

        if not username:
            print("错误: 用户名不能为空")
            return

        user = db.query(User).filter(User.username == username).first()

        if not user:
            print(f"错误: 用户 '{username}' 不存在")
            return

        if user.is_admin:
            print(f"用户 '{username}' 已经是管理员")
            return

        print(f"\n用户信息:")
        print(f"  用户名: {user.username}")
        print(f"  邮箱: {user.email or 'N/A'}")
        print(f"  状态: {'激活' if user.is_active else '禁用'}")
        print()

        choice = input("确认将此用户设置为管理员? (y/N): ").lower()
        if choice == 'y':
            user.is_admin = True
            db.commit()
            print(f"✓ 用户 '{username}' 已被设置为管理员")
        else:
            print("操作已取消")

    except Exception as e:
        print(f"错误: {str(e)}")
        db.rollback()
    finally:
        db.close()


def main():
    """主函数"""
    while True:
        print("\n" + "=" * 50)
        print("  管理员账户管理")
        print("=" * 50)
        print("\n请选择操作:")
        print("  1. 创建新的管理员账户")
        print("  2. 查看所有管理员")
        print("  3. 将现有用户设置为管理员")
        print("  4. 退出")
        print()

        try:
            choice = input("请输入选项 (1-4): ").strip()

            if choice == '1':
                create_admin_user()
            elif choice == '2':
                list_admins()
            elif choice == '3':
                set_existing_user_as_admin()
            elif choice == '4':
                print("再见！")
                break
            else:
                print("无效的选项，请重新输入")

        except KeyboardInterrupt:
            print("\n\n再见！")
            break
        except Exception as e:
            print(f"\n错误: {str(e)}")


if __name__ == "__main__":
    main()
