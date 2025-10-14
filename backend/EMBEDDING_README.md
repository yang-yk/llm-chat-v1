# Embedding配置说明

## 概述

系统使用 **Qwen3-Embedding-0.6B** 模型进行文本向量化，提供高质量的语义检索能力。

| 特性 | 说明 |
|------|------|
| **模型** | Qwen3-Embedding-0.6B |
| **向量维度** | 896 |
| **优势** | 语义理解强、检索准确、支持中英文 |
| **模型大小** | 约1.2GB |
| **适用场景** | RAG检索、语义搜索、文档问答 |

## 配置方法

### 环境变量配置

在 `.env` 文件或环境变量中设置：

```bash
# Embedding模型选择（默认为qwen）
EMBEDDING_MODEL=qwen

# 设备选择 (cuda, cpu, auto)
EMBEDDING_DEVICE=auto
```

### 配置选项说明

#### EMBEDDING_MODEL
- `qwen` (默认): 使用Qwen3-Embedding-0.6B模型

#### EMBEDDING_DEVICE
- `auto` (默认): 自动检测，优先使用CUDA
- `cuda`: 强制使用GPU
- `cpu`: 强制使用CPU

## 模型文件

Qwen3-Embedding-0.6B模型位置：
```
backend/embeddings/models/Qwen3-Embedding-0.6B/
├── model.safetensors      # 模型权重 (1.2GB)
├── config.json            # 模型配置
├── tokenizer.json         # Tokenizer
├── vocab.json             # 词表
└── ...
```

## 依赖要求

### Qwen模型依赖
```bash
torch>=2.0.0
transformers>=4.40.0
sentence-transformers>=2.5.0
protobuf>=3.20.0
```

**注意**: Qwen3模型需要 `transformers>=4.47` 和 `Python>=3.9`

## 使用示例

### 代码中使用

```python
from embedding_service import embedding_service

# 单个文本向量化
text = "这是一个测试文本"
embedding = await embedding_service.get_embedding(text)
print(f"向量维度: {len(embedding)}")

# 批量向量化
texts = ["文本1", "文本2", "文本3"]
embeddings = await embedding_service.get_embeddings_batch(texts)
print(f"向量数量: {len(embeddings)}")

# 文档处理（切分+向量化）
document = "长文档内容..."
chunks = await embedding_service.process_document(document)
for chunk in chunks:
    print(f"块{chunk['chunk_index']}: {chunk['content'][:50]}...")
```

### 测试embedding功能

```bash
cd /home/data2/yangyk/llm-chat-v2/backend
python test_embedding.py
```

## 系统要求

### Python环境
- **Python 3.9+** (必需)
- 低于Python 3.9的版本将无法加载Qwen3模型

### 硬件要求
- **内存**: 至少 2GB 可用内存
- **存储**: 至少 2GB 可用磁盘空间
- **GPU**: 可选，推荐使用CUDA加速

## 性能指标

### 向量化速度
- CPU: ~50-100ms/文本
- GPU (CUDA): ~10-20ms/文本

### 批量处理
批量处理可显著提升效率，建议一次处理多个文本块。

### 检索质量
- 支持语义理解，适合模糊匹配
- 中英文支持良好
- 向量维度高（896维），检索精度高

## 故障排查

### 问题1: Qwen模型加载失败
```
ValueError: The checkpoint has model type `qwen3` but Transformers does not recognize this architecture
```
**解决**: Python版本过低，需要升级到Python 3.9+

### 问题2: tokenizer.json文件错误
```
Exception: expected value at line 1 column 1
```
**解决**: tokenizer.json是Git LFS占位符，需要重新下载模型文件

### 问题3: CUDA out of memory
```
RuntimeError: CUDA out of memory
```
**解决**: 设置 `EMBEDDING_DEVICE=cpu` 使用CPU模式

### 问题4: 缺少依赖
```
ModuleNotFoundError: No module named 'sentence_transformers'
```
**解决**: 安装所需依赖
```bash
pip install sentence-transformers transformers torch
```

## 升级到Python 3.9+

如果当前环境Python版本低于3.9，建议升级：

```bash
# 创建新的Python 3.9+环境
conda create -n llm-chat-py39 python=3.9
conda activate llm-chat-py39

# 安装依赖
pip install -r requirements.txt

# 测试Qwen模型
python test_embedding.py
```

## 部署建议

### 开发环境
- 可使用CPU模式
- 适当降低批量大小

### 生产环境
- 推荐使用GPU加速
- 增加批量大小以提升吞吐量
- 预留足够内存（建议4GB+）

## 更多信息

- Qwen3-Embedding模型: https://huggingface.co/Qwen/Qwen3-Embedding-0.6B
- sentence-transformers文档: https://www.sbert.net/
- Transformers文档: https://huggingface.co/docs/transformers/
