"""
Qwen3-Embedding-0.6B 向量化服务
"""
import torch
import numpy as np
from typing import List, Optional
import os


class QwenEmbeddings:
    """Qwen3 Embedding模型封装"""

    def __init__(self, model_path: str = None, device: str = None):
        """
        初始化Qwen3 Embedding模型

        Args:
            model_path: 模型路径，默认为 ./embeddings/models/Qwen3-Embedding-0.6B
            device: 运行设备 (cuda/cpu)，默认自动检测
        """
        # 设置默认模型路径
        if model_path is None:
            model_path = os.path.join(
                os.path.dirname(__file__),
                "models",
                "Qwen3-Embedding-0.6B"
            )

        self.model_path = model_path

        # 自动检测设备
        if device is None or device == "auto":
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device

        print(f"[Qwen3 Embedding] 初始化模型，路径: {model_path}")
        print(f"[Qwen3 Embedding] 使用设备: {self.device}")

        # 加载模型
        try:
            # 优先使用sentence-transformers，它能更好地处理embedding模型
            try:
                from sentence_transformers import SentenceTransformer
                self.model = SentenceTransformer(model_path, device=self.device)
                self.use_sentence_transformers = True
                print(f"[Qwen3 Embedding] 使用sentence-transformers加载模型成功")
            except ImportError:
                # 回退到transformers
                from transformers import AutoTokenizer, AutoModel
                self.tokenizer = AutoTokenizer.from_pretrained(
                    model_path,
                    trust_remote_code=True,
                    local_files_only=True
                )
                self.model = AutoModel.from_pretrained(
                    model_path,
                    trust_remote_code=True,
                    local_files_only=True
                ).to(self.device)
                self.model.eval()
                self.use_sentence_transformers = False
                print(f"[Qwen3 Embedding] 使用transformers加载模型成功")

        except Exception as e:
            print(f"[Qwen3 Embedding ERROR] 模型加载失败: {str(e)}")
            raise

    def encode(self, texts: List[str], batch_size: int = 32, show_progress: bool = False) -> np.ndarray:
        """
        批量编码文本为向量

        Args:
            texts: 文本列表
            batch_size: 批处理大小
            show_progress: 是否显示进度

        Returns:
            numpy数组，shape为 (len(texts), embedding_dim)
        """
        if not texts:
            return np.array([])

        if self.use_sentence_transformers:
            # 使用sentence-transformers (更简单)
            try:
                embeddings = self.model.encode(
                    texts,
                    batch_size=batch_size,
                    show_progress_bar=show_progress,
                    convert_to_numpy=True
                )
                return embeddings
            except Exception as e:
                print(f"[Qwen3 Embedding ERROR] 编码失败: {str(e)}")
                return np.zeros((len(texts), self.get_embedding_dim()))
        else:
            # 使用transformers (手动处理)
            embeddings = []
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]

                if show_progress:
                    print(f"[Qwen3 Embedding] 处理批次 {i // batch_size + 1}/{(len(texts) + batch_size - 1) // batch_size}")

                try:
                    inputs = self.tokenizer(
                        batch_texts,
                        padding=True,
                        truncation=True,
                        max_length=512,
                        return_tensors="pt"
                    ).to(self.device)

                    with torch.no_grad():
                        outputs = self.model(**inputs)
                        batch_embeddings = outputs.last_hidden_state[:, 0, :].cpu().numpy()

                    embeddings.append(batch_embeddings)

                except Exception as e:
                    print(f"[Qwen3 Embedding ERROR] 批次处理失败: {str(e)}")
                    batch_embeddings = np.zeros((len(batch_texts), self.get_embedding_dim()))
                    embeddings.append(batch_embeddings)

            all_embeddings = np.vstack(embeddings)
            return all_embeddings

    def encode_single(self, text: str) -> np.ndarray:
        """
        编码单个文本

        Args:
            text: 文本内容

        Returns:
            向量数组
        """
        embeddings = self.encode([text], batch_size=1)
        return embeddings[0]

    def get_embedding_dim(self) -> int:
        """
        获取向量维度

        Returns:
            向量维度
        """
        if self.use_sentence_transformers:
            # sentence-transformers返回的维度
            return self.model.get_sentence_embedding_dimension()
        else:
            # transformers模型的hidden_size
            return self.model.config.hidden_size

    def similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """
        计算两个向量的余弦相似度

        Args:
            vec1: 向量1
            vec2: 向量2

        Returns:
            相似度 (0-1)
        """
        # 归一化
        vec1_norm = vec1 / (np.linalg.norm(vec1) + 1e-8)
        vec2_norm = vec2 / (np.linalg.norm(vec2) + 1e-8)

        # 余弦相似度
        similarity = np.dot(vec1_norm, vec2_norm)

        return float(similarity)

    def __repr__(self):
        return f"QwenEmbeddings(model_path={self.model_path}, device={self.device}, dim={self.get_embedding_dim()})"
