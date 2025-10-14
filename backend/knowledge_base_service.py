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

from database import KnowledgeBase, Document, DocumentChunk, get_beijing_time
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

    def get_knowledge_bases(self, db: Session, user_id: int) -> List[Dict[str, Any]]:
        """
        获取用户的所有知识库

        Args:
            db: 数据库会话
            user_id: 用户ID

        Returns:
            知识库列表
        """
        try:
            kbs = db.query(KnowledgeBase).filter(KnowledgeBase.user_id == user_id).all()

            result = []
            for kb in kbs:
                # 统计文档数
                doc_count = db.query(func.count(Document.id)).filter(
                    Document.knowledge_base_id == kb.id
                ).scalar()

                # 统计处理中的文档数
                processing_count = db.query(func.count(Document.id)).filter(
                    Document.knowledge_base_id == kb.id,
                    Document.status == "processing"
                ).scalar()

                result.append({
                    "id": kb.id,
                    "name": kb.name,
                    "description": kb.description,
                    "document_count": doc_count,
                    "has_processing_docs": processing_count > 0,  # 是否有处理中的文档
                    "created_at": kb.created_at.isoformat() if kb.created_at else None,
                    "updated_at": kb.updated_at.isoformat() if kb.updated_at else None
                })

            return result
        except Exception as e:
            raise Exception(f"获取知识库列表失败: {str(e)}")

    def get_knowledge_base(self, db: Session, kb_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """
        获取单个知识库详情

        Args:
            db: 数据库会话
            kb_id: 知识库ID
            user_id: 用户ID

        Returns:
            知识库详情
        """
        try:
            kb = db.query(KnowledgeBase).filter(
                KnowledgeBase.id == kb_id,
                KnowledgeBase.user_id == user_id
            ).first()

            if not kb:
                return None

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
            with open(file_path, 'wb') as f:
                f.write(file_content)

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
        获取知识库的所有文档

        Args:
            db: 数据库会话
            kb_id: 知识库ID
            user_id: 用户ID

        Returns:
            文档列表
        """
        try:
            # 验证权限
            kb = db.query(KnowledgeBase).filter(
                KnowledgeBase.id == kb_id,
                KnowledgeBase.user_id == user_id
            ).first()

            if not kb:
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


# 创建全局实例
knowledge_base_service = KnowledgeBaseService()
