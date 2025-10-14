"""
下载Qwen3-Embedding-0.6B模型
"""
import os
from huggingface_hub import snapshot_download


def download_qwen3_embedding(save_dir: str = None):
    """
    从HuggingFace下载Qwen3-Embedding-0.6B模型

    Args:
        save_dir: 保存目录，默认为 ./embeddings/models/Qwen3-Embedding-0.6B
    """
    if save_dir is None:
        save_dir = os.path.join(
            os.path.dirname(__file__),
            "models",
            "Qwen3-Embedding-0.6B"
        )

    # 创建目录
    os.makedirs(save_dir, exist_ok=True)

    print(f"[下载] 开始下载Qwen3-Embedding-0.6B模型")
    print(f"[下载] 保存路径: {save_dir}")
    print(f"[下载] 这可能需要几分钟时间...")

    try:
        # 从HuggingFace下载
        snapshot_download(
            repo_id="Qwen/Qwen3-Embedding-0.6B",
            local_dir=save_dir,
            local_dir_use_symlinks=False,
            resume_download=True
        )

        print(f"[下载] ✓ 模型下载成功！")
        print(f"[下载] 模型位置: {save_dir}")

        # 列出下载的文件
        files = os.listdir(save_dir)
        print(f"[下载] 下载的文件: {files}")

        return save_dir

    except Exception as e:
        print(f"[下载] ✗ 下载失败: {str(e)}")
        print(f"[下载] 如果下载速度慢，可以手动下载：")
        print(f"[下载] 1. 访问: https://huggingface.co/Qwen/Qwen3-Embedding-0.6B")
        print(f"[下载] 2. 下载所有文件到: {save_dir}")
        raise


if __name__ == "__main__":
    download_qwen3_embedding()
