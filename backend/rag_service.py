"""
RAG检索服务
"""
import json
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_

from database import KnowledgeBase, Document, DocumentChunk, KnowledgeBaseShare
from embedding_service import embedding_service


class RAGService:
    """RAG检索服务"""

    def __init__(self):
        """初始化RAG服务"""
        self.top_k = 10  # 默认返回前10个最相关的文档块（增加以获取更多上下文）
        self.similarity_threshold = 0.3  # 相似度阈值（降低以提高召回率，范围0-1）
        self.min_similarity_for_short = 0.2  # 短文本的相似度阈值（更低以确保短查询能匹配）

    async def search(
        self,
        db: Session,
        query: str,
        kb_ids: List[int],
        user_id: int,
        top_k: int = None,
        similarity_threshold: float = None
    ) -> List[Dict[str, Any]]:
        """
        在指定知识库中检索相关文档

        Args:
            db: 数据库会话
            query: 查询文本
            kb_ids: 知识库ID列表
            user_id: 用户ID
            top_k: 返回结果数量
            similarity_threshold: 相似度阈值

        Returns:
            相关文档块列表
        """
        if top_k is None:
            top_k = self.top_k
        if similarity_threshold is None:
            similarity_threshold = self.similarity_threshold

        try:
            # 1. 获取查询的向量表示
            query_embedding = await embedding_service.get_embedding(query)

            # 2. 根据查询长度动态调整相似度阈值（短查询使用更低阈值）
            query_length = len(query.strip())
            if query_length < 20:  # 短查询（如关键词搜索）
                effective_threshold = self.min_similarity_for_short
            else:
                effective_threshold = similarity_threshold if similarity_threshold else self.similarity_threshold

            # 3. 验证知识库权限（支持共享知识库）
            valid_kb_ids = []
            for kb_id in kb_ids:
                # 检查是否是所有者
                kb = db.query(KnowledgeBase).filter(
                    KnowledgeBase.id == kb_id,
                    KnowledgeBase.user_id == user_id
                ).first()

                if kb:
                    valid_kb_ids.append(kb_id)
                else:
                    # 检查是否有分享权限
                    share = db.query(KnowledgeBaseShare).filter(
                        KnowledgeBaseShare.knowledge_base_id == kb_id,
                        KnowledgeBaseShare.shared_to == user_id
                    ).first()
                    if share:
                        valid_kb_ids.append(kb_id)

            if not valid_kb_ids:
                return []

            # 4. 获取所有相关文档的所有块
            chunks = db.query(DocumentChunk, Document, KnowledgeBase).join(
                Document, DocumentChunk.document_id == Document.id
            ).join(
                KnowledgeBase, Document.knowledge_base_id == KnowledgeBase.id
            ).filter(
                and_(
                    KnowledgeBase.id.in_(valid_kb_ids),
                    Document.status == "completed",
                    DocumentChunk.embedding.isnot(None)
                )
            ).all()

            if not chunks:
                return []

            # 5. 计算相似度并排序
            results = []
            for chunk, document, kb in chunks:
                try:
                    # 解析向量
                    chunk_embedding = json.loads(chunk.embedding)
                    if not chunk_embedding:
                        continue

                    # 计算相似度
                    similarity = embedding_service.cosine_similarity(query_embedding, chunk_embedding)

                    # 过滤低于阈值的结果（使用动态阈值）
                    if similarity >= effective_threshold:
                        results.append({
                            "chunk_id": chunk.id,
                            "document_id": document.id,
                            "document_name": document.filename,
                            "knowledge_base_id": kb.id,
                            "knowledge_base_name": kb.name,
                            "content": chunk.content,
                            "similarity": similarity,
                            "chunk_index": chunk.chunk_index
                        })
                except Exception as e:
                    print(f"[WARNING] 处理chunk失败: {chunk.id}, {str(e)}")
                    continue

            # 6. 按相似度降序排序，取前top_k个
            results.sort(key=lambda x: x["similarity"], reverse=True)
            return results[:top_k]

        except Exception as e:
            print(f"[ERROR] RAG检索失败: {str(e)}")
            raise Exception(f"检索失败: {str(e)}")

    def format_context(self, search_results: List[Dict[str, Any]]) -> str:
        """
        将检索结果格式化为上下文文本

        Args:
            search_results: 检索结果列表

        Returns:
            格式化后的上下文文本
        """
        if not search_results:
            return ""

        context_parts = []
        context_parts.append("【参考资料】")

        for i, result in enumerate(search_results, 1):
            kb_name = result.get("knowledge_base_name", "未知知识库")
            doc_name = result.get("document_name", "未知文档")
            content = result.get("content", "")
            similarity = result.get("similarity", 0)

            context_parts.append(f"\n[资料{i}] 来源: {kb_name} - {doc_name} (相似度: {similarity:.2f})")
            context_parts.append(content)

        context_parts.append("\n【以上为参考资料，请基于这些内容回答用户问题】\n")

        return "\n".join(context_parts)

    async def retrieve_and_format(
        self,
        db: Session,
        query: str,
        kb_ids: List[int],
        user_id: int,
        top_k: int = None
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        检索并格式化上下文（使用混合检索）

        Args:
            db: 数据库会话
            query: 查询文本
            kb_ids: 知识库ID列表
            user_id: 用户ID
            top_k: 返回结果数量

        Returns:
            (格式化的上下文文本, 检索结果列表)
        """
        # 使用混合检索（向量+关键词）
        print(f"[RAG] 开始混合检索，查询: {query[:50]}..., 知识库IDs: {kb_ids}")
        search_results = await self.search_with_keywords(db, query, kb_ids, user_id, top_k, keyword_weight=0.3)

        print(f"[RAG] 检索完成，找到 {len(search_results)} 个结果")
        if search_results:
            for i, result in enumerate(search_results[:3]):  # 只打印前3个
                print(f"[RAG] 结果 {i+1}: 相似度={result.get('similarity', 0):.3f}, "
                      f"关键词分数={result.get('keyword_score', 0):.3f}, "
                      f"混合分数={result.get('hybrid_score', 0):.3f}, "
                      f"文档={result.get('document_name', 'unknown')}")

        # 格式化上下文
        context = self.format_context(search_results)

        return context, search_results

    def build_rag_prompt(self, context: str, user_query: str) -> str:
        """
        构建RAG提示词

        Args:
            context: 检索到的上下文
            user_query: 用户问题

        Returns:
            完整的提示词
        """
        if not context:
            return user_query

        prompt = f"""{context}

用户问题: {user_query}

请根据上述参考资料回答用户问题。如果参考资料中没有相关信息，请明确告知用户。"""

        return prompt

    @staticmethod
    def extract_keywords(text: str) -> List[str]:
        """
        从文本中提取关键词（简单实现）

        Args:
            text: 输入文本

        Returns:
            关键词列表
        """
        import re

        # 移除标点符号，按空格和中文分词
        text = text.lower()
        # 保留中英文和数字
        text = re.sub(r'[^\w\s\u4e00-\u9fff]', ' ', text)

        # 分词（简单按空格分割）
        words = text.split()

        # 过滤停用词和短词
        stop_words = {'的', '了', '是', '在', '和', '与', '或', '等', '有', '为', '以', '于', '及',
                     'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
                     'and', 'or', 'but', 'if', 'to', 'of', 'in', 'on', 'at', 'for', 'with'}

        keywords = [w for w in words if len(w) > 1 and w not in stop_words]

        return keywords

    @staticmethod
    def keyword_match_score(query_keywords: List[str], content: str) -> float:
        """
        计算关键词匹配分数

        Args:
            query_keywords: 查询关键词列表
            content: 文档内容

        Returns:
            匹配分数 (0-1之间)
        """
        if not query_keywords:
            return 0.0

        content_lower = content.lower()
        matches = sum(1 for kw in query_keywords if kw in content_lower)

        # 归一化为0-1之间的分数
        return matches / len(query_keywords)

    async def search_with_keywords(
        self,
        db: Session,
        query: str,
        kb_ids: List[int],
        user_id: int,
        top_k: int = None,
        similarity_threshold: float = None,
        keyword_weight: float = 0.3  # 关键词权重
    ) -> List[Dict[str, Any]]:
        """
        结合向量相似度和关键词匹配的混合检索

        Args:
            db: 数据库会话
            query: 查询文本
            kb_ids: 知识库ID列表
            user_id: 用户ID
            top_k: 返回结果数量
            similarity_threshold: 相似度阈值
            keyword_weight: 关键词匹配的权重 (0-1)

        Returns:
            相关文档块列表
        """
        if top_k is None:
            top_k = self.top_k
        if similarity_threshold is None:
            similarity_threshold = self.similarity_threshold

        try:
            # 1. 获取查询的向量表示
            print(f"[RAG] 步骤1: 开始生成查询向量...")
            query_embedding = await embedding_service.get_embedding(query)
            print(f"[RAG] 查询向量生成成功，维度: {len(query_embedding)}")

            # 2. 提取查询关键词
            query_keywords = self.extract_keywords(query)
            print(f"[RAG] 步骤2: 提取到关键词: {query_keywords}")

            # 3. 根据查询长度动态调整相似度阈值
            query_length = len(query.strip())
            if query_length < 20:
                effective_threshold = self.min_similarity_for_short
            else:
                effective_threshold = similarity_threshold
            print(f"[RAG] 步骤3: 查询长度={query_length}, 使用阈值={effective_threshold}")

            # 4. 验证知识库权限（支持共享知识库）
            valid_kb_ids = []
            for kb_id in kb_ids:
                # 检查是否是所有者
                kb = db.query(KnowledgeBase).filter(
                    KnowledgeBase.id == kb_id,
                    KnowledgeBase.user_id == user_id
                ).first()

                if kb:
                    valid_kb_ids.append(kb_id)
                    print(f"[RAG] 知识库 {kb_id} ({kb.name}) 验证通过（所有者）")
                else:
                    # 检查是否有分享权限
                    share = db.query(KnowledgeBaseShare).filter(
                        KnowledgeBaseShare.knowledge_base_id == kb_id,
                        KnowledgeBaseShare.shared_to == user_id
                    ).first()
                    if share:
                        kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
                        valid_kb_ids.append(kb_id)
                        print(f"[RAG] 知识库 {kb_id} ({kb.name if kb else 'unknown'}) 验证通过（共享 - {share.permission}）")

            if not valid_kb_ids:
                print(f"[RAG ERROR] 没有有效的知识库ID")
                return []

            # 5. 获取所有相关文档的所有块
            chunks = db.query(DocumentChunk, Document, KnowledgeBase).join(
                Document, DocumentChunk.document_id == Document.id
            ).join(
                KnowledgeBase, Document.knowledge_base_id == KnowledgeBase.id
            ).filter(
                and_(
                    KnowledgeBase.id.in_(valid_kb_ids),
                    Document.status == "completed",
                    DocumentChunk.embedding.isnot(None)
                )
            ).all()

            print(f"[RAG] 步骤5: 从数据库查询到 {len(chunks)} 个文档块")
            if not chunks:
                print(f"[RAG WARNING] 知识库中没有可用的文档块")
                return []

            # 6. 计算混合分数（向量相似度 + 关键词匹配）
            results = []
            filtered_count = 0
            max_similarity = 0.0
            for idx, (chunk, document, kb) in enumerate(chunks):
                try:
                    # 解析向量
                    chunk_embedding = json.loads(chunk.embedding)
                    if not chunk_embedding:
                        print(f"[RAG WARNING] Chunk {chunk.id} 没有有效的向量")
                        continue

                    # 计算向量相似度
                    vector_similarity = embedding_service.cosine_similarity(query_embedding, chunk_embedding)
                    max_similarity = max(max_similarity, vector_similarity)

                    # 计算关键词匹配分数
                    keyword_score = self.keyword_match_score(query_keywords, chunk.content)

                    # 混合分数
                    hybrid_score = (1 - keyword_weight) * vector_similarity + keyword_weight * keyword_score

                    # 只在前几个chunk打印详细信息
                    if idx < 3:
                        print(f"[RAG] Chunk {idx+1}: 向量相似度={vector_similarity:.3f}, "
                              f"关键词={keyword_score:.3f}, 混合={hybrid_score:.3f}, "
                              f"文档={document.filename}")

                    # 过滤低于阈值的结果（仍然基于向量相似度阈值）
                    if vector_similarity >= effective_threshold:
                        results.append({
                            "chunk_id": chunk.id,
                            "document_id": document.id,
                            "document_name": document.filename,
                            "knowledge_base_id": kb.id,
                            "knowledge_base_name": kb.name,
                            "content": chunk.content,
                            "similarity": vector_similarity,
                            "keyword_score": keyword_score,
                            "hybrid_score": hybrid_score,
                            "chunk_index": chunk.chunk_index
                        })
                    else:
                        filtered_count += 1
                except Exception as e:
                    print(f"[WARNING] 处理chunk失败: {chunk.id}, {str(e)}")
                    continue

            print(f"[RAG] 步骤6: 计算完成。最高相似度={max_similarity:.3f}, "
                  f"通过阈值={len(results)}, 被过滤={filtered_count}")

            if filtered_count > 0 and len(results) == 0:
                print(f"[RAG WARNING] 所有文档块都被阈值过滤了！最高相似度{max_similarity:.3f} < 阈值{effective_threshold}")
                print(f"[RAG] 建议: 尝试降低相似度阈值或检查文档内容是否与查询相关")

            # 7. 按混合分数降序排序，取前top_k个
            results.sort(key=lambda x: x["hybrid_score"], reverse=True)
            return results[:top_k]

        except Exception as e:
            print(f"[ERROR] 混合检索失败: {str(e)}")
            raise Exception(f"检索失败: {str(e)}")


# 创建全局实例
rag_service = RAGService()
