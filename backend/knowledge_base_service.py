"""
知识库管理服务
"""
import os
import json
import shutil
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from pathlib import Path

from database import KnowledgeBase, Document, DocumentChunk, KnowledgeBaseShare, User, get_beijing_time
from document_parser import document_parser
from embedding_service import embedding_service


class KnowledgeBaseService:
    """知识库服务"""

    def __init__(self):
        """初始化知识库服务"""
        # 设置文档存储目录
        self.upload_dir = os.path.join(os.path.dirname(__file__), "uploads")
        if not os.path.exists(self.upload_dir):
            os.makedirs(self.upload_dir)

    def check_kb_access(self, db: Session, kb_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """
        检查用户是否有权访问知识库

        Args:
            db: 数据库会话
            kb_id: 知识库ID
            user_id: 用户ID

        Returns:
            如果有权限，返回 {"is_owner": bool, "permission": str}，否则返回 None
            permission 可能的值: "owner", "read", "none"
        """
        # 首先检查是否是所有者
        kb = db.query(KnowledgeBase).filter(
            KnowledgeBase.id == kb_id,
            KnowledgeBase.user_id == user_id
        ).first()

        if kb:
            return {"is_owner": True, "permission": "owner"}

        # 检查是否有分享权限
        share = db.query(KnowledgeBaseShare).filter(
            KnowledgeBaseShare.knowledge_base_id == kb_id,
            KnowledgeBaseShare.shared_to == user_id
        ).first()

        if share:
            return {"is_owner": False, "permission": share.permission}

        return None

    def create_knowledge_base(self, db: Session, user_id: int, name: str, description: str = None) -> KnowledgeBase:
        """
        创建知识库

        Args:
            db: 数据库会话
            user_id: 用户ID
            name: 知识库名称
            description: 知识库描述

        Returns:
            创建的知识库对象
        """
        try:
            # 检查该用户是否已有同名知识库
            existing_kb = db.query(KnowledgeBase).filter(
                KnowledgeBase.user_id == user_id,
                KnowledgeBase.name == name
            ).first()

            if existing_kb:
                raise Exception(f"知识库名称 '{name}' 已存在，请使用其他名称")

            kb = KnowledgeBase(
                user_id=user_id,
                name=name,
                description=description or ""
            )
            db.add(kb)
            db.commit()
            db.refresh(kb)
            return kb
        except Exception as e:
            db.rollback()
            raise Exception(f"创建知识库失败: {str(e)}")

    def get_knowledge_bases(self, db: Session, user_id: int, include_shared: bool = True) -> Dict[str, List[Dict[str, Any]]]:
        """
        获取用户的所有知识库（包括自己的和共享给自己的）

        Args:
            db: 数据库会话
            user_id: 用户ID
            include_shared: 是否包含共享的知识库

        Returns:
            知识库列表（包含自己的和共享的）
        """
        try:
            # 获取用户自己的知识库
            own_kbs = db.query(KnowledgeBase).filter(KnowledgeBase.user_id == user_id).all()

            own_result = []
            for kb in own_kbs:
                # 统计文档数
                doc_count = db.query(func.count(Document.id)).filter(
                    Document.knowledge_base_id == kb.id
                ).scalar()

                # 统计处理中的文档数
                processing_count = db.query(func.count(Document.id)).filter(
                    Document.knowledge_base_id == kb.id,
                    Document.status == "processing"
                ).scalar()

                own_result.append({
                    "id": kb.id,
                    "name": kb.name,
                    "description": kb.description,
                    "document_count": doc_count,
                    "has_processing_docs": processing_count > 0,
                    "is_owner": True,  # 标记为自己的知识库
                    "user_id": kb.user_id,  # 所有者ID
                    "is_shareable": kb.is_shareable,  # 是否可分享
                    "created_at": kb.created_at.isoformat() if kb.created_at else None,
                    "updated_at": kb.updated_at.isoformat() if kb.updated_at else None
                })

            # 如果需要包含共享的知识库
            shared_result = []
            if include_shared:
                shared_result = self.get_shared_knowledge_bases(db, user_id)

            return {
                "own": own_result,
                "shared": shared_result
            }

        except Exception as e:
            raise Exception(f"获取知识库列表失败: {str(e)}")

    def get_knowledge_base(self, db: Session, kb_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """
        获取单个知识库详情（支持共享知识库）

        Args:
            db: 数据库会话
            kb_id: 知识库ID
            user_id: 用户ID

        Returns:
            知识库详情，根据权限返回不同的信息
            - owner/read: 返回完整信息（所有者和可读权限）
            - none: 返回基本信息，不返回文档列表
        """
        try:
            # 检查用户是否有权限访问该知识库
            access = self.check_kb_access(db, kb_id, user_id)
            if not access:
                return None

            # 获取知识库信息
            kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
            if not kb:
                return None

            # 如果权限是 none，只返回基本信息，不返回文档列表
            if access["permission"] == "none":
                return {
                    "id": kb.id,
                    "name": kb.name,
                    "description": "此知识库不可读",
                    "documents": [],
                    "is_owner": False,
                    "permission": "none",
                    "created_at": kb.created_at.isoformat() if kb.created_at else None,
                    "updated_at": kb.updated_at.isoformat() if kb.updated_at else None
                }

            # owner 或 read 权限：返回完整信息
            # 获取文档列表
            documents = db.query(Document).filter(Document.knowledge_base_id == kb_id).all()

            doc_list = []
            for doc in documents:
                # 统计文档块数
                chunk_count = db.query(func.count(DocumentChunk.id)).filter(
                    DocumentChunk.document_id == doc.id
                ).scalar()

                doc_list.append({
                    "id": doc.id,
                    "filename": doc.filename,
                    "file_type": doc.file_type,
                    "file_size": doc.file_size,
                    "status": doc.status,
                    "error_message": doc.error_message,
                    "chunk_count": chunk_count,
                    "created_at": doc.created_at.isoformat() if doc.created_at else None
                })

            return {
                "id": kb.id,
                "name": kb.name,
                "description": kb.description,
                "documents": doc_list,
                "is_owner": access["is_owner"],
                "permission": access["permission"],
                "created_at": kb.created_at.isoformat() if kb.created_at else None,
                "updated_at": kb.updated_at.isoformat() if kb.updated_at else None
            }
        except Exception as e:
            raise Exception(f"获取知识库详情失败: {str(e)}")

    def update_knowledge_base(self, db: Session, kb_id: int, user_id: int, name: str = None, description: str = None) -> Optional[KnowledgeBase]:
        """
        更新知识库

        Args:
            db: 数据库会话
            kb_id: 知识库ID
            user_id: 用户ID
            name: 新名称
            description: 新描述

        Returns:
            更新后的知识库对象
        """
        try:
            kb = db.query(KnowledgeBase).filter(
                KnowledgeBase.id == kb_id,
                KnowledgeBase.user_id == user_id
            ).first()

            if not kb:
                return None

            if name is not None:
                # 检查新名称是否与该用户的其他知识库重名（排除自己）
                existing_kb = db.query(KnowledgeBase).filter(
                    KnowledgeBase.user_id == user_id,
                    KnowledgeBase.name == name,
                    KnowledgeBase.id != kb_id
                ).first()

                if existing_kb:
                    raise Exception(f"知识库名称 '{name}' 已存在，请使用其他名称")

                kb.name = name
            if description is not None:
                kb.description = description

            kb.updated_at = get_beijing_time()
            db.commit()
            db.refresh(kb)
            return kb
        except Exception as e:
            db.rollback()
            raise Exception(f"更新知识库失败: {str(e)}")

    async def copy_knowledge_base(self, db: Session, kb_id: int, user_id: int, new_name: str) -> KnowledgeBase:
        """
        复制知识库（包括所有文档和向量数据）

        Args:
            db: 数据库会话
            kb_id: 要复制的知识库ID
            user_id: 用户ID
            new_name: 新知识库的名称

        Returns:
            复制后的新知识库对象
        """
        try:
            # 验证原知识库是否属于用户
            original_kb = db.query(KnowledgeBase).filter(
                KnowledgeBase.id == kb_id,
                KnowledgeBase.user_id == user_id
            ).first()

            if not original_kb:
                raise Exception("知识库不存在或无权访问")

            # 检查新名称是否已存在
            existing_kb = db.query(KnowledgeBase).filter(
                KnowledgeBase.user_id == user_id,
                KnowledgeBase.name == new_name
            ).first()

            if existing_kb:
                raise Exception(f"知识库名称 '{new_name}' 已存在，请使用其他名称")

            print(f"[INFO] 开始复制知识库: {original_kb.name} -> {new_name}")

            # 1. 创建新知识库
            new_kb = KnowledgeBase(
                user_id=user_id,
                name=new_name,
                description=f"{original_kb.description} (复制)" if original_kb.description else "复制的知识库"
            )
            db.add(new_kb)
            db.commit()
            db.refresh(new_kb)

            print(f"[INFO] 新知识库已创建，ID: {new_kb.id}")

            # 2. 获取原知识库的所有文档
            original_docs = db.query(Document).filter(
                Document.knowledge_base_id == kb_id,
                Document.status == "completed"  # 只复制已完成的文档
            ).all()

            print(f"[INFO] 找到 {len(original_docs)} 个文档需要复制")

            # 3. 创建新的文档目录
            new_upload_dir = os.path.join(self.upload_dir, f"user_{user_id}", f"kb_{new_kb.id}")
            if not os.path.exists(new_upload_dir):
                os.makedirs(new_upload_dir)

            # 4. 复制每个文档
            for original_doc in original_docs:
                try:
                    print(f"[INFO] 复制文档: {original_doc.filename}")

                    # 复制文件
                    new_file_path = os.path.join(new_upload_dir, original_doc.filename)
                    if os.path.exists(original_doc.file_path):
                        shutil.copy2(original_doc.file_path, new_file_path)
                    else:
                        print(f"[WARNING] 原文件不存在: {original_doc.file_path}，跳过")
                        continue

                    # 创建新文档记录
                    new_doc = Document(
                        knowledge_base_id=new_kb.id,
                        filename=original_doc.filename,
                        file_type=original_doc.file_type,
                        file_size=original_doc.file_size,
                        file_path=new_file_path,
                        status="completed"  # 直接标记为完成
                    )
                    db.add(new_doc)
                    db.flush()  # 获取新文档的ID

                    # 复制文档块和向量
                    original_chunks = db.query(DocumentChunk).filter(
                        DocumentChunk.document_id == original_doc.id
                    ).all()

                    print(f"[INFO] 复制 {len(original_chunks)} 个文档块")

                    for original_chunk in original_chunks:
                        new_chunk = DocumentChunk(
                            document_id=new_doc.id,
                            chunk_index=original_chunk.chunk_index,
                            content=original_chunk.content,
                            embedding=original_chunk.embedding  # 直接复制向量
                        )
                        db.add(new_chunk)

                    print(f"[INFO] 文档复制完成: {original_doc.filename}")

                except Exception as e:
                    print(f"[ERROR] 复制文档失败: {original_doc.filename}, {str(e)}")
                    continue

            db.commit()
            db.refresh(new_kb)

            print(f"[INFO] 知识库复制完成: {original_kb.name} -> {new_name}")

            return new_kb

        except Exception as e:
            db.rollback()
            # 如果复制失败，删除可能已创建的文件
            if 'new_upload_dir' in locals() and os.path.exists(new_upload_dir):
                try:
                    shutil.rmtree(new_upload_dir)
                except:
                    pass
            raise Exception(f"复制知识库失败: {str(e)}")

    def delete_knowledge_base(self, db: Session, kb_id: int, user_id: int) -> bool:
        """
        删除知识库（会删除相关的所有文档和文件）

        Args:
            db: 数据库会话
            kb_id: 知识库ID
            user_id: 用户ID

        Returns:
            是否删除成功
        """
        try:
            kb = db.query(KnowledgeBase).filter(
                KnowledgeBase.id == kb_id,
                KnowledgeBase.user_id == user_id
            ).first()

            if not kb:
                return False

            # 删除所有文档文件
            documents = db.query(Document).filter(Document.knowledge_base_id == kb_id).all()
            for doc in documents:
                if os.path.exists(doc.file_path):
                    try:
                        os.remove(doc.file_path)
                    except Exception as e:
                        print(f"[WARNING] 删除文件失败: {doc.file_path}, {str(e)}")

            # 删除知识库（会级联删除文档和文档块）
            db.delete(kb)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            raise Exception(f"删除知识库失败: {str(e)}")

    async def add_document(
        self,
        db: Session,
        kb_id: int,
        user_id: int,
        filename: str,
        file_content: bytes,
        file_type: str
    ) -> Document:
        """
        添加文档到知识库

        Args:
            db: 数据库会话
            kb_id: 知识库ID
            user_id: 用户ID
            filename: 文件名
            file_content: 文件内容（字节）
            file_type: 文件类型

        Returns:
            创建的文档对象
        """
        try:
            # 验证知识库是否属于用户
            kb = db.query(KnowledgeBase).filter(
                KnowledgeBase.id == kb_id,
                KnowledgeBase.user_id == user_id
            ).first()

            if not kb:
                raise Exception("知识库不存在或无权访问")

            # 创建用户特定的上传目录
            user_upload_dir = os.path.join(self.upload_dir, f"user_{user_id}", f"kb_{kb_id}")
            if not os.path.exists(user_upload_dir):
                os.makedirs(user_upload_dir)

            # 保存文件
            file_path = os.path.join(user_upload_dir, filename)
            print(f"[INFO] 保存文件到: {file_path}")
            with open(file_path, 'wb') as f:
                f.write(file_content)

            # 验证文件已保存
            if not os.path.exists(file_path):
                raise Exception(f"文件保存失败: {file_path}")

            file_size_on_disk = os.path.getsize(file_path)
            print(f"[INFO] 文件已保存，大小: {file_size_on_disk} 字节")

            # 创建文档记录
            doc = Document(
                knowledge_base_id=kb_id,
                filename=filename,
                file_type=file_type,
                file_size=len(file_content),
                file_path=file_path,
                status="processing"
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)

            # 异步处理文档（解析、切分、向量化）
            try:
                await self._process_document(db, doc)
            except Exception as e:
                print(f"[ERROR] 处理文档失败: {str(e)}")
                doc.status = "failed"
                doc.error_message = str(e)
                db.commit()

            return doc
        except Exception as e:
            db.rollback()
            raise Exception(f"添加文档失败: {str(e)}")

    async def _process_document(self, db: Session, doc: Document):
        """
        处理文档：解析、切分、向量化

        Args:
            db: 数据库会话
            doc: 文档对象
        """
        try:
            # 1. 解析文档
            print(f"[INFO] 开始解析文档: {doc.filename}")
            text_content = document_parser.parse_file(doc.file_path, doc.file_type)

            if not text_content or len(text_content.strip()) == 0:
                raise Exception("文档内容为空")

            # 2. 切分并向量化
            print(f"[INFO] 开始切分和向量化: {doc.filename}")
            chunks_data = await embedding_service.process_document(text_content)

            # 3. 保存文档块和向量
            for chunk_data in chunks_data:
                chunk = DocumentChunk(
                    document_id=doc.id,
                    chunk_index=chunk_data["chunk_index"],
                    content=chunk_data["content"],
                    embedding=json.dumps(chunk_data["embedding"])  # 将向量序列化为JSON
                )
                db.add(chunk)

            # 4. 更新文档状态
            doc.status = "completed"
            db.commit()
            print(f"[INFO] 文档处理完成: {doc.filename}, 共{len(chunks_data)}个块")

        except Exception as e:
            print(f"[ERROR] 处理文档失败: {str(e)}")
            doc.status = "failed"
            doc.error_message = str(e)
            db.commit()
            raise

    def delete_document(self, db: Session, doc_id: int, user_id: int) -> bool:
        """
        删除文档

        Args:
            db: 数据库会话
            doc_id: 文档ID
            user_id: 用户ID

        Returns:
            是否删除成功
        """
        try:
            # 查找文档并验证权限
            doc = db.query(Document).join(KnowledgeBase).filter(
                Document.id == doc_id,
                KnowledgeBase.user_id == user_id
            ).first()

            if not doc:
                return False

            # 删除文件
            if os.path.exists(doc.file_path):
                try:
                    os.remove(doc.file_path)
                except Exception as e:
                    print(f"[WARNING] 删除文件失败: {doc.file_path}, {str(e)}")

            # 删除文档记录（会级联删除文档块）
            db.delete(doc)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            raise Exception(f"删除文档失败: {str(e)}")

    def get_documents(self, db: Session, kb_id: int, user_id: int) -> List[Dict[str, Any]]:
        """
        获取知识库的所有文档（支持共享知识库）

        Args:
            db: 数据库会话
            kb_id: 知识库ID
            user_id: 用户ID

        Returns:
            文档列表
        """
        try:
            # 验证权限（支持共享知识库）
            access = self.check_kb_access(db, kb_id, user_id)
            if not access:
                raise Exception("知识库不存在或无权访问")

            documents = db.query(Document).filter(Document.knowledge_base_id == kb_id).all()

            result = []
            for doc in documents:
                chunk_count = db.query(func.count(DocumentChunk.id)).filter(
                    DocumentChunk.document_id == doc.id
                ).scalar()

                result.append({
                    "id": doc.id,
                    "filename": doc.filename,
                    "file_type": doc.file_type,
                    "file_size": doc.file_size,
                    "status": doc.status,
                    "error_message": doc.error_message,
                    "chunk_count": chunk_count,
                    "created_at": doc.created_at.isoformat() if doc.created_at else None
                })

            return result
        except Exception as e:
            raise Exception(f"获取文档列表失败: {str(e)}")

    # ==================== 知识库分享相关功能 ====================

    def share_knowledge_base(
        self,
        db: Session,
        kb_id: int,
        admin_user_id: int,
        target_user_ids: List[int],
        permission: str = "read"
    ) -> Dict[str, Any]:
        """
        管理员分享知识库给指定用户

        Args:
            db: 数据库会话
            kb_id: 知识库ID
            admin_user_id: 管理员用户ID
            target_user_ids: 目标用户ID列表
            permission: 权限类型 (read=可读/none=不可读)

        Returns:
            分享结果
        """
        try:
            # 验证管理员权限
            admin_user = db.query(User).filter(User.id == admin_user_id).first()
            if not admin_user or not admin_user.is_admin:
                raise Exception("需要管理员权限")

            # 验证知识库存在
            kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
            if not kb:
                raise Exception("知识库不存在")

            # 验证权限类型（只支持 read 和 none）
            if permission not in ["read", "none"]:
                raise Exception("权限类型必须是 read（可读）或 none（不可读）")

            shared_count = 0
            already_shared = []
            skipped_owner = False

            for user_id in target_user_ids:
                # 不能分享给知识库所有者自己
                if user_id == kb.user_id:
                    skipped_owner = True
                    print(f"[INFO] 跳过知识库所有者: user_id={user_id}")
                    continue

                # 验证目标用户存在
                target_user = db.query(User).filter(User.id == user_id).first()
                if not target_user:
                    continue

                # 检查是否已分享
                existing_share = db.query(KnowledgeBaseShare).filter(
                    KnowledgeBaseShare.knowledge_base_id == kb_id,
                    KnowledgeBaseShare.shared_to == user_id
                ).first()

                if existing_share:
                    # 更新权限
                    existing_share.permission = permission
                    already_shared.append(target_user.username)
                else:
                    # 创建新的分享记录
                    share = KnowledgeBaseShare(
                        knowledge_base_id=kb_id,
                        shared_by=admin_user_id,
                        shared_to=user_id,
                        permission=permission
                    )
                    db.add(share)
                    shared_count += 1

            db.commit()

            # 构建返回消息
            message = f"成功分享给 {shared_count} 个用户，更新 {len(already_shared)} 个用户的权限"
            if skipped_owner:
                message += "（已自动跳过知识库所有者）"

            return {
                "success": True,
                "shared_count": shared_count,
                "updated_count": len(already_shared),
                "already_shared": already_shared,
                "skipped_owner": skipped_owner,
                "message": message
            }

        except Exception as e:
            db.rollback()
            raise Exception(f"分享知识库失败: {str(e)}")

    def unshare_knowledge_base(
        self,
        db: Session,
        kb_id: int,
        admin_user_id: int,
        target_user_ids: List[int]
    ) -> Dict[str, Any]:
        """
        管理员取消知识库分享

        Args:
            db: 数据库会话
            kb_id: 知识库ID
            admin_user_id: 管理员用户ID
            target_user_ids: 要取消分享的用户ID列表

        Returns:
            取消分享结果
        """
        try:
            # 验证管理员权限
            admin_user = db.query(User).filter(User.id == admin_user_id).first()
            if not admin_user or not admin_user.is_admin:
                raise Exception("需要管理员权限")

            # 验证知识库存在
            kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
            if not kb:
                raise Exception("知识库不存在")

            removed_count = 0
            for user_id in target_user_ids:
                # 删除分享记录
                share = db.query(KnowledgeBaseShare).filter(
                    KnowledgeBaseShare.knowledge_base_id == kb_id,
                    KnowledgeBaseShare.shared_to == user_id
                ).first()

                if share:
                    db.delete(share)
                    removed_count += 1

            db.commit()

            return {
                "success": True,
                "removed_count": removed_count,
                "message": f"成功取消 {removed_count} 个用户的分享"
            }

        except Exception as e:
            db.rollback()
            raise Exception(f"取消分享失败: {str(e)}")

    def get_shared_knowledge_bases(self, db: Session, user_id: int) -> List[Dict[str, Any]]:
        """
        获取分享给用户的知识库列表

        Args:
            db: 数据库会话
            user_id: 用户ID

        Returns:
            分享的知识库列表
        """
        try:
            # 查询分享给该用户的知识库
            shares = db.query(KnowledgeBaseShare).filter(
                KnowledgeBaseShare.shared_to == user_id
            ).all()

            result = []
            for share in shares:
                kb = share.knowledge_base

                # 统计文档数
                doc_count = db.query(func.count(Document.id)).filter(
                    Document.knowledge_base_id == kb.id
                ).scalar()

                # 获取所有者信息
                owner = db.query(User).filter(User.id == kb.user_id).first()

                result.append({
                    "id": kb.id,
                    "name": kb.name,
                    "description": kb.description,
                    "owner_username": owner.username if owner else "unknown",
                    "permission": share.permission,
                    "document_count": doc_count,
                    "shared_at": share.created_at.isoformat() if share.created_at else None,
                    "is_shared": True  # 标记为共享知识库
                })

            return result

        except Exception as e:
            raise Exception(f"获取共享知识库列表失败: {str(e)}")

    def get_kb_share_list(self, db: Session, kb_id: int, admin_user_id: int) -> List[Dict[str, Any]]:
        """
        获取知识库的分享列表（管理员）

        Args:
            db: 数据库会话
            kb_id: 知识库ID
            admin_user_id: 管理员用户ID

        Returns:
            分享列表
        """
        try:
            # 验证管理员权限
            admin_user = db.query(User).filter(User.id == admin_user_id).first()
            if not admin_user or not admin_user.is_admin:
                raise Exception("需要管理员权限")

            # 验证知识库存在
            kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
            if not kb:
                raise Exception("知识库不存在")

            # 获取所有分享记录
            shares = db.query(KnowledgeBaseShare).filter(
                KnowledgeBaseShare.knowledge_base_id == kb_id
            ).all()

            result = []
            for share in shares:
                user = share.shared_user
                result.append({
                    "user_id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "permission": share.permission,
                    "shared_at": share.created_at.isoformat() if share.created_at else None
                })

            return result

        except Exception as e:
            raise Exception(f"获取分享列表失败: {str(e)}")

    def update_share_permission(
        self,
        db: Session,
        kb_id: int,
        admin_user_id: int,
        target_user_id: int,
        permission: str
    ) -> Dict[str, Any]:
        """
        更新分享权限（管理员）

        Args:
            db: 数据库会话
            kb_id: 知识库ID
            admin_user_id: 管理员用户ID
            target_user_id: 目标用户ID
            permission: 新权限 (read=可读/none=不可读)

        Returns:
            更新结果
        """
        try:
            # 验证管理员权限
            admin_user = db.query(User).filter(User.id == admin_user_id).first()
            if not admin_user or not admin_user.is_admin:
                raise Exception("需要管理员权限")

            # 验证权限类型（只支持 read 和 none）
            if permission not in ["read", "none"]:
                raise Exception("权限类型必须是 read（可读）或 none（不可读）")

            # 查找分享记录
            share = db.query(KnowledgeBaseShare).filter(
                KnowledgeBaseShare.knowledge_base_id == kb_id,
                KnowledgeBaseShare.shared_to == target_user_id
            ).first()

            if not share:
                raise Exception("分享记录不存在")

            # 更新权限
            share.permission = permission
            db.commit()

            return {
                "success": True,
                "message": f"权限已更新为 {permission}"
            }

        except Exception as e:
            db.rollback()
            raise Exception(f"更新权限失败: {str(e)}")

    def set_knowledge_base_shareable(
        self,
        db: Session,
        kb_id: int,
        admin_user_id: int,
        is_shareable: bool
    ) -> Dict[str, Any]:
        """
        设置知识库是否可分享（管理员）

        Args:
            db: 数据库会话
            kb_id: 知识库ID
            admin_user_id: 管理员用户ID
            is_shareable: 是否可分享

        Returns:
            设置结果
        """
        try:
            # 验证管理员权限
            admin_user = db.query(User).filter(User.id == admin_user_id).first()
            if not admin_user or not admin_user.is_admin:
                raise Exception("需要管理员权限")

            # 查找知识库
            kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
            if not kb:
                raise Exception("知识库不存在")

            # 更新is_shareable字段
            kb.is_shareable = is_shareable
            db.commit()
            db.refresh(kb)

            return {
                "success": True,
                "is_shareable": kb.is_shareable,
                "message": f"知识库已{'可分享' if is_shareable else '设为不可分享'}"
            }

        except Exception as e:
            db.rollback()
            raise Exception(f"设置失败: {str(e)}")


# 创建全局实例
knowledge_base_service = KnowledgeBaseService()
