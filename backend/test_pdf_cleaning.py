#!/usr/bin/env python3
"""
测试PDF文本清理功能
"""
import sys
from document_parser import DocumentParser

def test_clean_pdf_text():
    """测试clean_pdf_text函数"""

    # 测试用例1：段落内换行（应该被合并）
    test_text_1 = """这是一段测试
文本内容在PDF中
被分成了多行
但实际上应该是连续的。"""

    print("=" * 60)
    print("测试用例1：段落内换行（无句尾标点）")
    print("-" * 60)
    print("原文本：")
    print(repr(test_text_1))
    print("\n清理后：")
    cleaned_1 = DocumentParser.clean_pdf_text(test_text_1)
    print(repr(cleaned_1))
    print("\n显示效果：")
    print(cleaned_1)

    # 测试用例2：多个段落（应该保留换行）
    test_text_2 = """第一段内容结束了。
第二段内容开始了。
第三段内容也来了！
第四段内容在这里？"""

    print("\n" + "=" * 60)
    print("测试用例2：多个独立句子（有句尾标点）")
    print("-" * 60)
    print("原文本：")
    print(repr(test_text_2))
    print("\n清理后：")
    cleaned_2 = DocumentParser.clean_pdf_text(test_text_2)
    print(repr(cleaned_2))
    print("\n显示效果：")
    print(cleaned_2)

    # 测试用例3：混合场景
    test_text_3 = """项目申请指南

一、申请条件
申请人应具有博士学位
或副高级以上专业技术职务。

二、资助强度
重点项目资助强度为
100-300万元。

三、申请截止时间是2024年12月31日。"""

    print("\n" + "=" * 60)
    print("测试用例3：混合场景（段落内+独立句）")
    print("-" * 60)
    print("原文本：")
    print(repr(test_text_3))
    print("\n清理后：")
    cleaned_3 = DocumentParser.clean_pdf_text(test_text_3)
    print(repr(cleaned_3))
    print("\n显示效果：")
    print(cleaned_3)

    # 测试用例4：英文文本
    test_text_4 = """This is a paragraph
that has been broken
into multiple lines
in the PDF file.

This is another paragraph.
It should be preserved."""

    print("\n" + "=" * 60)
    print("测试用例4：英文文本")
    print("-" * 60)
    print("原文本：")
    print(repr(test_text_4))
    print("\n清理后：")
    cleaned_4 = DocumentParser.clean_pdf_text(test_text_4)
    print(repr(cleaned_4))
    print("\n显示效果：")
    print(cleaned_4)

def test_real_pdf():
    """测试真实PDF文件"""
    pdf_file = "uploads/user_1/kb_1/1.2024年度北京市杰出青年科学基金项目申请指南.pdf"

    print("\n" + "=" * 60)
    print("测试真实PDF文件")
    print("-" * 60)
    print(f"文件: {pdf_file}")

    try:
        # 解析PDF（会自动应用clean_pdf_text）
        content = DocumentParser.parse_pdf(pdf_file)

        print(f"\n提取文本长度: {len(content)} 字符")
        print("\n前500字符预览：")
        print("-" * 60)
        print(content[:500])
        print("-" * 60)

        # 检查是否还有不必要的换行
        lines = content.split('\n')
        print(f"\n总行数: {len(lines)}")
        print("\n检查前10行：")
        for i, line in enumerate(lines[:10], 1):
            print(f"{i}. [{len(line)}字符] {line[:80]}")

    except Exception as e:
        print(f"❌ 解析失败: {e}")

if __name__ == "__main__":
    print("PDF文本清理功能测试\n")

    # 运行单元测试
    test_clean_pdf_text()

    # 测试真实PDF
    test_real_pdf()

    print("\n" + "=" * 60)
    print("✅ 测试完成")
