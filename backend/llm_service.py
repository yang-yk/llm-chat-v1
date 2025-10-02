"""
大模型API调用服务
"""
import httpx
import json
from typing import List, Dict, AsyncGenerator
from config import LLM_API_URL, LLM_MODEL, LLM_API_KEY


class LLMService:
    """大模型服务类"""

    def __init__(self):
        self.api_url = LLM_API_URL
        self.model = LLM_MODEL
        self.api_key = LLM_API_KEY

    async def chat_completion(self, messages: List[Dict[str, str]], temperature: float = 0.7, max_tokens: int = 2000) -> str:
        """
        调用大模型API进行对话（非流式）

        Args:
            messages: 消息列表，格式为 [{"role": "user", "content": "..."}]
            temperature: 温度参数，控制生成的随机性
            max_tokens: 最大生成token数

        Returns:
            大模型生成的回复内容
        """
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(self.api_url, json=payload, headers=headers)
                response.raise_for_status()

                result = response.json()
                # 提取生成的回复内容
                if "choices" in result and len(result["choices"]) > 0:
                    return result["choices"][0]["message"]["content"]
                else:
                    raise Exception("API返回格式异常")

            except httpx.HTTPStatusError as e:
                raise Exception(f"API调用失败: {e.response.status_code} - {e.response.text}")
            except Exception as e:
                raise Exception(f"调用大模型API时出错: {str(e)}")

    async def chat_completion_stream(self, messages: List[Dict[str, str]], temperature: float = 0.7, max_tokens: int = 2000) -> AsyncGenerator[str, None]:
        """
        调用大模型API进行流式对话

        Args:
            messages: 消息列表，格式为 [{"role": "user", "content": "..."}]
            temperature: 温度参数，控制生成的随机性
            max_tokens: 最大生成token数

        Yields:
            逐步生成的文本片段
        """
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                async with client.stream("POST", self.api_url, json=payload, headers=headers) as response:
                    response.raise_for_status()

                    buffer = ""
                    async for chunk in response.aiter_bytes():
                        buffer += chunk.decode('utf-8', errors='ignore')

                        # 按行分割
                        while '\n' in buffer:
                            line, buffer = buffer.split('\n', 1)
                            line = line.strip()

                            if not line:
                                continue

                            # 处理SSE格式: data: {...}
                            if line.startswith("data: "):
                                data = line[6:].strip()

                                # 检查是否是结束标记
                                if data == "[DONE]":
                                    return

                                try:
                                    chunk_data = json.loads(data)

                                    # 提取内容
                                    if "choices" in chunk_data and len(chunk_data["choices"]) > 0:
                                        delta = chunk_data["choices"][0].get("delta", {})
                                        content = delta.get("content", "")

                                        if content:
                                            yield content

                                except json.JSONDecodeError as e:
                                    # 忽略JSON解析错误，继续处理下一行
                                    continue

            except httpx.HTTPStatusError as e:
                raise Exception(f"API调用失败: {e.response.status_code}")
            except Exception as e:
                raise Exception(f"调用大模型API时出错: {str(e)}")


# 创建全局LLM服务实例
llm_service = LLMService()
