"""
文档切分和向量化服务
"""
import re
import json
import httpx
import numpy as np
from typing import List, Dict, Any
from config import LLM_API_URL, LLM_API_KEY, EMBEDDING_MODEL, EMBEDDING_DEVICE
from models_config import PRESET_MODELS


class EmbeddingService:
    """向量化服务（使用Qwen3-Embedding-0.6B模型）"""

    def __init__(self):
        """初始化向量化服务"""
        print(f"[EmbeddingService] 初始化 Qwen 向量化服务")

        # 初始化Qwen embedding模型
        self._init_qwen()

        # 文本切分参数（针对RAG优化）
        self.chunk_size = 500  # 每块500字符，更细粒度的切分
        self.chunk_overlap = 100  # 块之间重叠100字符，保持上下文连贯
        self.min_chunk_size = 100  # 短文本阈值降低到100字符
        self.max_chunk_multiplier = 1.2  # 文本长度小于chunk_size的1.2倍时不切分

    def _init_qwen(self):
        """初始化Qwen embedding模型"""
        try:
            import os
            import sys

            # 添加embeddings目录到路径
            embeddings_dir = os.path.join(os.path.dirname(__file__), "embeddings")
            if embeddings_dir not in sys.path:
                sys.path.insert(0, embeddings_dir)

            from qwen_embeddings import QwenEmbeddings

            model_path = os.path.join(embeddings_dir, "models", "Qwen3-Embedding-0.6B")
            self.qwen_model = QwenEmbeddings(model_path=model_path, device=EMBEDDING_DEVICE)
            self.embedding_dim = self.qwen_model.get_embedding_dim()
            print(f"[EmbeddingService] Qwen模型加载成功，向量维度: {self.embedding_dim}")

        except Exception as e:
            print(f"[EmbeddingService ERROR] Qwen模型加载失败: {str(e)}")
            raise Exception(f"Qwen模型初始化失败，请检查模型文件和依赖: {str(e)}")

    def split_text(self, text: str, chunk_size: int = None, chunk_overlap: int = None) -> List[str]:
        """
        将长文本切分成多个小块（支持短文本自适应）

        Args:
            text: 原始文本
            chunk_size: 每个切片的字符数
            chunk_overlap: 切片之间的重叠字符数

        Returns:
            切分后的文本列表
        """
        if chunk_size is None:
            chunk_size = self.chunk_size
        if chunk_overlap is None:
            chunk_overlap = self.chunk_overlap

        # 清理文本
        text = text.strip()
        if not text:
            return []

        # 短文本自适应：如果文本长度小于阈值，直接返回不切分
        if len(text) <= self.min_chunk_size:
            print(f"[SPLIT] 文本太短({len(text)}字符)，不切分")
            return [text]

        # 如果文本长度小于chunk_size的max_chunk_multiplier倍，也不切分
        max_no_split = int(chunk_size * self.max_chunk_multiplier)
        if len(text) <= max_no_split:
            print(f"[SPLIT] 文本长度({len(text)}字符) <= {max_no_split}，不切分")
            return [text]

        print(f"[SPLIT] 文本长度({len(text)}字符)，需要切分，目标块大小: {chunk_size}字符")

        # 按段落分割
        paragraphs = re.split(r'\n\s*\n', text)
        print(f"[SPLIT] 识别到 {len(paragraphs)} 个段落")

        chunks = []
        current_chunk = ""

        for idx, paragraph in enumerate(paragraphs):
            paragraph = paragraph.strip()
            if not paragraph:
                continue

            # 如果当前段落加上之前的内容超过chunk_size
            if len(current_chunk) + len(paragraph) + 2 > chunk_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())

                # 如果单个段落就超过chunk_size，需要进一步切分
                if len(paragraph) > chunk_size:
                    # 按句子切分
                    sentences = re.split(r'[。！？.!?]', paragraph)
                    temp_chunk = ""
                    for sentence in sentences:
                        if not sentence.strip():
                            continue
                        if len(temp_chunk) + len(sentence) + 1 > chunk_size:
                            if temp_chunk:
                                chunks.append(temp_chunk.strip())
                            temp_chunk = sentence
                        else:
                            temp_chunk += sentence + "。"
                    current_chunk = temp_chunk
                else:
                    current_chunk = paragraph
            else:
                if current_chunk:
                    current_chunk += "\n\n" + paragraph
                else:
                    current_chunk = paragraph

        # 添加最后一个块
        if current_chunk:
            chunks.append(current_chunk.strip())

        print(f"[SPLIT] 初步切分完成，共 {len(chunks)} 个块")

        # 显示每个块的统计信息
        if chunks:
            chunk_lengths = [len(c) for c in chunks]
            print(f"[SPLIT] 块大小统计: 最小={min(chunk_lengths)}, 最大={max(chunk_lengths)}, "
                  f"平均={sum(chunk_lengths)//len(chunk_lengths)}")

        # 如果需要重叠，处理重叠部分（智能重叠，尽量在句子边界）
        if chunk_overlap > 0 and len(chunks) > 1:
            print(f"[SPLIT] 添加 {chunk_overlap} 字符重叠...")
            overlapped_chunks = []
            for i in range(len(chunks)):
                if i == 0:
                    overlapped_chunks.append(chunks[i])
                else:
                    # 从前一个块的末尾取overlap字符，尽量在句子边界
                    prev_chunk = chunks[i - 1]
                    if len(prev_chunk) > chunk_overlap:
                        # 寻找最后一个句子边界
                        overlap_start = len(prev_chunk) - chunk_overlap
                        # 尝试找到句子开始位置（句号、问号、感叹号之后）
                        sentence_markers = ['。', '！', '？', '.', '!', '?', '\n']
                        best_start = overlap_start
                        for j in range(overlap_start, len(prev_chunk)):
                            if prev_chunk[j] in sentence_markers and j + 1 < len(prev_chunk):
                                best_start = j + 1
                                break
                        overlap_text = prev_chunk[best_start:].strip()
                    else:
                        overlap_text = prev_chunk

                    # 只有当重叠文本有实际内容时才添加
                    if overlap_text:
                        overlapped_chunks.append(overlap_text + "\n\n" + chunks[i])
                    else:
                        overlapped_chunks.append(chunks[i])

            print(f"[SPLIT] 添加重叠后，共 {len(overlapped_chunks)} 个块")
            # 显示重叠后的统计
            overlap_lengths = [len(c) for c in overlapped_chunks]
            print(f"[SPLIT] 重叠后块大小: 最小={min(overlap_lengths)}, 最大={max(overlap_lengths)}, "
                  f"平均={sum(overlap_lengths)//len(overlap_lengths)}")
            return overlapped_chunks

        return chunks

    async def get_embedding(self, text: str) -> List[float]:
        """
        获取文本的向量表示

        Args:
            text: 要向量化的文本

        Returns:
            向量（浮点数列表）
        """
        try:
            if not text or not text.strip():
                print(f"[EMBEDDING WARNING] 空文本，返回零向量")
                return [0.0] * self.embedding_dim

            print(f"[EMBEDDING] 开始向量化")
            print(f"[EMBEDDING] 文本长度: {len(text)} 字符")
            print(f"[EMBEDDING] 文本预览: {text[:100]}...")

            embedding = await self._get_embedding_qwen(text)

            print(f"[EMBEDDING] ✓ 向量化完成，维度: {len(embedding)}")
            return embedding

        except Exception as e:
            print(f"[EMBEDDING ERROR] 向量化失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return [0.0] * self.embedding_dim

    async def _get_embedding_qwen(self, text: str) -> List[float]:
        """使用Qwen模型获取向量"""
        try:
            print(f"[QWEN] 调用Qwen模型进行向量化...")
            # 同步调用转异步
            import asyncio
            import time
            loop = asyncio.get_event_loop()

            start_time = time.time()
            embedding = await loop.run_in_executor(None, self.qwen_model.encode_single, text)
            elapsed = time.time() - start_time

            print(f"[QWEN] ✓ Qwen向量化完成，耗时: {elapsed:.2f}秒")
            return embedding.tolist()
        except Exception as e:
            print(f"[QWEN ERROR] Qwen向量化失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return [0.0] * self.embedding_dim

    async def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        批量获取文本的向量表示（优化的批处理）

        Args:
            texts: 要向量化的文本列表

        Returns:
            向量列表
        """
        try:
            if not texts:
                print(f"[EMBEDDING BATCH] 警告: 文本列表为空")
                return []

            print(f"[EMBEDDING BATCH] 开始批量向量化")
            print(f"[EMBEDDING BATCH] 文档数: {len(texts)}")
            for i, text in enumerate(texts[:3]):  # 只显示前3个
                print(f"[EMBEDDING BATCH]   文档 {i+1}: {len(text)} 字符, 预览: {text[:50]}...")
            if len(texts) > 3:
                print(f"[EMBEDDING BATCH]   ... 还有 {len(texts)-3} 个文档")

            embeddings = await self._get_embeddings_batch_qwen(texts)

            print(f"[EMBEDDING BATCH] ✓ 批量向量化完成，返回 {len(embeddings)} 个向量")
            return embeddings

        except Exception as e:
            print(f"[EMBEDDING BATCH ERROR] 批量向量化失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return [[0.0] * self.embedding_dim for _ in texts]

    async def _get_embeddings_batch_qwen(self, texts: List[str]) -> List[List[float]]:
        """使用Qwen模型批量获取向量"""
        try:
            # 过滤空文本
            print(f"[QWEN BATCH] 过滤空文本...")
            valid_texts = [t if t and t.strip() else " " for t in texts]
            print(f"[QWEN BATCH] 有效文本数: {len(valid_texts)}")

            # 同步调用转异步
            print(f"[QWEN BATCH] 调用Qwen模型批量编码...")
            import asyncio
            import time
            loop = asyncio.get_event_loop()

            start_time = time.time()
            embeddings = await loop.run_in_executor(
                None,
                self.qwen_model.encode,
                valid_texts
            )
            elapsed = time.time() - start_time

            print(f"[QWEN BATCH] ✓ Qwen批量向量化成功")
            print(f"[QWEN BATCH]   文档数: {len(embeddings)}")
            print(f"[QWEN BATCH]   向量维度: {len(embeddings[0]) if len(embeddings) > 0 else 0}")
            print(f"[QWEN BATCH]   总耗时: {elapsed:.2f}秒")
            print(f"[QWEN BATCH]   平均耗时: {elapsed/len(embeddings):.3f}秒/文档")

            return [emb.tolist() for emb in embeddings]

        except Exception as e:
            print(f"[QWEN BATCH ERROR] Qwen批量向量化失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return [[0.0] * self.embedding_dim for _ in texts]

    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """
        计算两个向量的余弦相似度

        Args:
            vec1: 向量1
            vec2: 向量2

        Returns:
            余弦相似度 (-1到1之间)
        """
        if not vec1 or not vec2 or len(vec1) != len(vec2):
            return 0.0

        # 计算点积
        dot_product = sum(a * b for a, b in zip(vec1, vec2))

        # 计算模长
        magnitude1 = sum(a * a for a in vec1) ** 0.5
        magnitude2 = sum(b * b for b in vec2) ** 0.5

        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0

        # 返回余弦相似度
        return dot_product / (magnitude1 * magnitude2)

    async def process_document(self, text: str) -> List[Dict[str, Any]]:
        """
        处理文档：切分文本并生成向量

        Args:
            text: 文档文本内容

        Returns:
            包含文本块和对应向量的列表
        """
        print(f"\n{'='*60}")
        print(f"[PROCESS DOCUMENT] 开始处理文档")
        print(f"[PROCESS DOCUMENT] 文档长度: {len(text)} 字符")
        print(f"{'='*60}")

        # 切分文本
        print(f"[PROCESS DOCUMENT] 步骤1: 切分文本...")
        chunks = self.split_text(text)
        print(f"[PROCESS DOCUMENT] ✓ 切分完成，共 {len(chunks)} 个文本块")
        for i, chunk in enumerate(chunks):
            print(f"[PROCESS DOCUMENT]   块 {i+1}: {len(chunk)} 字符")

        # 生成向量
        print(f"\n[PROCESS DOCUMENT] 步骤2: 批量生成向量...")
        embeddings = await self.get_embeddings_batch(chunks)
        print(f"[PROCESS DOCUMENT] ✓ 向量生成完成")

        # 组合结果
        print(f"\n[PROCESS DOCUMENT] 步骤3: 组合结果...")
        results = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            results.append({
                "chunk_index": i,
                "content": chunk,
                "embedding": embedding
            })

        print(f"[PROCESS DOCUMENT] ✓ 文档处理完成，返回 {len(results)} 个结果")
        print(f"{'='*60}\n")
        return results


# 创建全局实例
embedding_service = EmbeddingService()
