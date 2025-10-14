"""
测试Qwen Embedding功能
"""
import asyncio
import os
import sys

# 添加backend目录到路径
sys.path.insert(0, os.path.dirname(__file__))


async def test_qwen():
    """测试Qwen embedding"""
    print("\n" + "="*60)
    print("测试: Qwen Embedding")
    print("="*60)

    # 设置环境变量使用Qwen
    os.environ["EMBEDDING_MODEL"] = "qwen"
    os.environ["EMBEDDING_DEVICE"] = "auto"

    # 重新导入以应用新配置
    if "embedding_service" in sys.modules:
        del sys.modules["embedding_service"]
    if "config" in sys.modules:
        del sys.modules["config"]

    from embedding_service import embedding_service

    # 测试单个文本
    test_text = "这是一个测试文本，用于验证Qwen embedding模型是否正常工作。"
    print(f"\n测试单个文本: {test_text}")

    embedding = await embedding_service.get_embedding(test_text)
    print(f"向量维度: {len(embedding)}")
    print(f"向量前10个值: {embedding[:10]}")

    # 测试批量
    test_texts = ["第一段测试文本", "第二段测试文本", "第三段测试文本"]
    print(f"\n批量测试，文本数: {len(test_texts)}")

    embeddings = await embedding_service.get_embeddings_batch(test_texts)
    print(f"返回向量数: {len(embeddings)}")
    print(f"每个向量维度: {len(embeddings[0]) if embeddings else 0}")

    # 测试文档处理（切分+向量化）
    long_text = "这是一段较长的文本。" * 100
    print(f"\n测试文档处理，文本长度: {len(long_text)} 字符")

    chunks = await embedding_service.process_document(long_text)
    print(f"文档切分成 {len(chunks)} 个块")
    for i, chunk in enumerate(chunks[:3]):
        print(f"  块 {i+1}: {len(chunk['content'])} 字符")

    return True


async def main():
    """主测试函数"""
    print("开始测试Qwen Embedding功能...")

    try:
        success = await test_qwen()

        if success:
            print("\n" + "="*60)
            print("✓ 测试通过！")
            print("="*60)
        else:
            print("\n" + "="*60)
            print("✗ 测试失败")
            print("="*60)

    except Exception as e:
        print(f"\n✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

    return True


if __name__ == "__main__":
    asyncio.run(main())
