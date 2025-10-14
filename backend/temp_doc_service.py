"""
临时文档问答服务
允许用户上传文档并直接提问，无需创建知识库
"""
import os
import uuid
import json
import tempfile
from typing import List, Dict, Any, Tuple
from datetime import datetime, timedelta

from document_parser import document_parser
from embedding_service import embedding_service


class TempDocService:
    """临时文档问答服务"""

    def __init__(self):
        """初始化服务"""
        # 使用内存存储临时文档（也可以改用Redis）
        self.temp_docs: Dict[str, Dict[str, Any]] = {}
        # 临时文件有效期（小时）
        self.doc_ttl_hours = 24

    def _cleanup_expired_docs(self):
        """清理过期的临时文档"""
        now = datetime.now()
        expired_ids = []

        for doc_id, doc_data in self.temp_docs.items():
            if now - doc_data['created_at'] > timedelta(hours=self.doc_ttl_hours):
                expired_ids.append(doc_id)
                # 删除临时文件
                if os.path.exists(doc_data['file_path']):
                    try:
                        os.remove(doc_data['file_path'])
                    except Exception as e:
                        print(f"[WARNING] 删除过期临时文件失败: {doc_data['file_path']}, {str(e)}")

        for doc_id in expired_ids:
            del self.temp_docs[doc_id]

        if expired_ids:
            print(f"[INFO] 清理了 {len(expired_ids)} 个过期的临时文档")

    async def upload_and_parse(self, filename: str, file_content: bytes) -> Tuple[str, Dict[str, Any]]:
        """
        上传并解析临时文档

        Args:
            filename: 文件名
            file_content: 文件内容

        Returns:
            (doc_id, doc_info) 文档ID和文档信息
        """
        try:
            # 清理过期文档
            self._cleanup_expired_docs()

            # 获取文件类型
            file_ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
            if file_ext not in ['txt', 'pdf', 'doc', 'docx']:
                raise ValueError(f"不支持的文件类型: {file_ext}")

            # 生成唯一ID
            doc_id = str(uuid.uuid4())

            # 保存临时文件
            temp_dir = tempfile.gettempdir()
            temp_file_path = os.path.join(temp_dir, f"temp_doc_{doc_id}_{filename}")

            with open(temp_file_path, 'wb') as f:
                f.write(file_content)

            # 解析文档
            print(f"[INFO] 开始解析临时文档: {filename}")
            text_content = document_parser.parse_file(temp_file_path, file_ext)

            if not text_content or len(text_content.strip()) == 0:
                raise ValueError("文档内容为空")

            # 切分并向量化
            print(f"[INFO] 开始向量化临时文档: {filename}")
            chunks_data = await embedding_service.process_document(text_content)

            # 存储文档信息
            doc_info = {
                'doc_id': doc_id,
                'filename': filename,
                'file_type': file_ext,
                'file_size': len(file_content),
                'file_path': temp_file_path,
                'text_content': text_content,
                'text_length': len(text_content),
                'chunks': chunks_data,
                'chunk_count': len(chunks_data),
                'created_at': datetime.now()
            }

            self.temp_docs[doc_id] = doc_info

            print(f"[INFO] 临时文档处理完成: {filename}, 文本长度: {len(text_content)}, 文本块数: {len(chunks_data)}")

            # 返回简化的信息给前端
            return doc_id, {
                'doc_id': doc_id,
                'filename': filename,
                'file_type': file_ext,
                'file_size': len(file_content),
                'text_length': len(text_content),
                'chunk_count': len(chunks_data),
                'created_at': doc_info['created_at'].isoformat()
            }

        except Exception as e:
            print(f"[ERROR] 处理临时文档失败: {str(e)}")
            raise Exception(f"处理文档失败: {str(e)}")

    def _calculate_similarity(self, query_embedding: List[float], doc_embedding: List[float]) -> float:
        """计算余弦相似度"""
        import math

        # 点积
        dot_product = sum(a * b for a, b in zip(query_embedding, doc_embedding))

        # 模长
        query_norm = math.sqrt(sum(a * a for a in query_embedding))
        doc_norm = math.sqrt(sum(b * b for b in doc_embedding))

        # 余弦相似度
        if query_norm == 0 or doc_norm == 0:
            return 0.0

        return dot_product / (query_norm * doc_norm)

    async def search_relevant_chunks(
        self,
        doc_id: str,
        query: str,
        top_k: int = 5,
        max_context_length: int = 24000  # 留出8k给问题和回答
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        检索文档中与问题最相关的文本块

        Args:
            doc_id: 文档ID
            query: 用户问题
            top_k: 返回前k个最相关的块
            max_context_length: 最大上下文长度（字符数）

        Returns:
            (context, chunks) 上下文文本和相关块信息
        """
        try:
            if doc_id not in self.temp_docs:
                raise ValueError("文档不存在或已过期")

            doc_info = self.temp_docs[doc_id]
            chunks = doc_info['chunks']

            # 如果文档很短，直接返回全文
            if doc_info['text_length'] <= max_context_length:
                print(f"[INFO] 文档较短，直接使用全文，长度: {doc_info['text_length']}")
                return doc_info['text_content'], []

            # 对问题进行向量化
            print(f"[INFO] 开始向量检索，问题: {query[:50]}...")
            query_embedding = await embedding_service.generate_embedding(query)

            # 计算每个块的相似度
            chunk_scores = []
            for i, chunk_data in enumerate(chunks):
                similarity = self._calculate_similarity(query_embedding, chunk_data['embedding'])
                chunk_scores.append({
                    'index': i,
                    'content': chunk_data['content'],
                    'similarity': similarity
                })

            # 按相似度排序
            chunk_scores.sort(key=lambda x: x['similarity'], reverse=True)

            # 选择top_k个最相关的块，但要控制总长度
            selected_chunks = []
            total_length = 0

            for chunk in chunk_scores[:top_k]:
                chunk_length = len(chunk['content'])
                if total_length + chunk_length <= max_context_length:
                    selected_chunks.append(chunk)
                    total_length += chunk_length
                else:
                    # 如果加上这个块会超长，尝试截取部分
                    remaining = max_context_length - total_length
                    if remaining > 500:  # 至少要有500字符才有意义
                        chunk_copy = chunk.copy()
                        chunk_copy['content'] = chunk['content'][:remaining] + '...'
                        selected_chunks.append(chunk_copy)
                        total_length += len(chunk_copy['content'])
                    break

            # 按原始顺序重新排列（可选）
            # selected_chunks.sort(key=lambda x: x['index'])

            # 合并文本
            context = '\n\n'.join([chunk['content'] for chunk in selected_chunks])

            print(f"[INFO] 检索完成，选择了 {len(selected_chunks)} 个文本块，总长度: {len(context)}")

            return context, selected_chunks

        except Exception as e:
            print(f"[ERROR] 检索相关内容失败: {str(e)}")
            raise Exception(f"检索失败: {str(e)}")

    def delete_document(self, doc_id: str) -> bool:
        """删除临时文档"""
        try:
            if doc_id not in self.temp_docs:
                return False

            doc_info = self.temp_docs[doc_id]

            # 删除临时文件
            if os.path.exists(doc_info['file_path']):
                try:
                    os.remove(doc_info['file_path'])
                except Exception as e:
                    print(f"[WARNING] 删除临时文件失败: {doc_info['file_path']}, {str(e)}")

            # 从内存中删除
            del self.temp_docs[doc_id]

            print(f"[INFO] 临时文档已删除: {doc_info['filename']}")
            return True

        except Exception as e:
            print(f"[ERROR] 删除临时文档失败: {str(e)}")
            return False

    def get_document_info(self, doc_id: str) -> Dict[str, Any]:
        """获取文档信息"""
        if doc_id not in self.temp_docs:
            raise ValueError("文档不存在或已过期")

        doc_info = self.temp_docs[doc_id]
        return {
            'doc_id': doc_info['doc_id'],
            'filename': doc_info['filename'],
            'file_type': doc_info['file_type'],
            'file_size': doc_info['file_size'],
            'text_length': doc_info['text_length'],
            'chunk_count': doc_info['chunk_count'],
            'created_at': doc_info['created_at'].isoformat()
        }


# 创建全局实例
temp_doc_service = TempDocService()
