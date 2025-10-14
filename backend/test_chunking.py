"""
测试文档切分策略
"""
import asyncio
from embedding_service import embedding_service


async def test_chunking():
    """测试不同长度文本的切分效果"""

    print("\n" + "="*80)
    print("文档切分策略测试")
    print("="*80)

    # 测试案例1: 短文本
    short_text = "这是一个短文本，用于测试切分策略。" * 5
    print(f"\n【测试1】短文本 ({len(short_text)} 字符)")
    print("-" * 80)
    chunks1 = embedding_service.split_text(short_text)
    print(f"结果: {len(chunks1)} 个块\n")

    # 测试案例2: 中等文本
    medium_text = """
    石油化工行业是国民经济的重要支柱产业。随着科技的发展，工程设计和工业软件开发对热物理性质计算的需求日益增长。

    热力学方法是物性计算的核心。通过建立科学、系统的物性模型，可以有效提高计算精度。本研究针对石化行业的实际需求，
    探索了物性计算的总体框架和计算路径分级管理方法。

    研究团队开发了先进的物性模型计算软件，对标国际流程模拟软件。该软件构建了石油化工体系的物料、能量和反应平衡等
    三个热力学方法，实现了物性模型的管理与计算功能。

    实验结果表明，新开发的软件在计算精度和效率方面都有显著提升。这为石化行业的工程设计和科学研究提供了有力支持。
    """ * 2

    print(f"\n【测试2】中等文本 ({len(medium_text)} 字符)")
    print("-" * 80)
    chunks2 = embedding_service.split_text(medium_text)
    print(f"结果: {len(chunks2)} 个块\n")

    # 测试案例3: 长文本
    long_text = medium_text * 5
    print(f"\n【测试3】长文本 ({len(long_text)} 字符)")
    print("-" * 80)
    chunks3 = embedding_service.split_text(long_text)
    print(f"结果: {len(chunks3)} 个块")

    # 显示前3个块的预览
    print("\n前3个块预览:")
    for i, chunk in enumerate(chunks3[:3], 1):
        print(f"\n块 {i} ({len(chunk)} 字符):")
        print(chunk[:150] + "..." if len(chunk) > 150 else chunk)

    print("\n" + "="*80)
    print("当前切分参数配置:")
    print(f"  chunk_size (块大小): {embedding_service.chunk_size} 字符")
    print(f"  chunk_overlap (重叠): {embedding_service.chunk_overlap} 字符")
    print(f"  min_chunk_size (最小块): {embedding_service.min_chunk_size} 字符")
    print(f"  不切分阈值: {int(embedding_service.chunk_size * embedding_service.max_chunk_multiplier)} 字符")
    print("="*80 + "\n")


if __name__ == "__main__":
    asyncio.run(test_chunking())
