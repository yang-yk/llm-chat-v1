import type {
  Conversation,
  ChatRequest,
  ChatResponse,
  ConversationHistoryResponse,
  ConfigResponse,
  ConfigUpdateRequest,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 获取或生成用户ID
export function getUserId(): string {
  if (typeof window === 'undefined') return '';

  let userId = localStorage.getItem('user_id');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('user_id', userId);
  }
  return userId;
}

// 创建新对话
export async function createConversation(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/conversations`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('创建对话失败');
  }

  const data = await response.json();
  return data.session_id;
}

// 获取所有对话列表
export async function getConversations(): Promise<Conversation[]> {
  const response = await fetch(`${API_BASE_URL}/conversations`);

  if (!response.ok) {
    throw new Error('获取对话列表失败');
  }

  const data = await response.json();
  return data.conversations;
}

// 获取对话历史
export async function getConversationHistory(sessionId: string): Promise<ConversationHistoryResponse> {
  const response = await fetch(`${API_BASE_URL}/conversations/${sessionId}/history`);

  if (!response.ok) {
    throw new Error('获取对话历史失败');
  }

  return response.json();
}

// 删除对话
export async function deleteConversation(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/conversations/${sessionId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('删除对话失败');
  }
}

// 发送消息（非流式）
export async function sendMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('发送消息失败');
  }

  return response.json();
}

// 发送消息（流式）
export async function* sendMessageStream(request: ChatRequest): AsyncGenerator<string> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...request, stream: true }),
  });

  if (!response.ok) {
    throw new Error('发送消息失败');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法读取响应流');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');

    // 保留最后一个可能不完整的行
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();

        if (data === '[DONE]') {
          return;
        }

        try {
          const parsed = JSON.parse(data);

          if (parsed.error) {
            throw new Error(parsed.error);
          }

          if (parsed.done) {
            return;
          }

          if (parsed.chunk) {
            yield parsed.chunk;
          }
        } catch (e) {
          // 忽略JSON解析错误
          continue;
        }
      }
    }
  }
}

// 获取配置
export async function getConfig(userId: string): Promise<ConfigResponse> {
  const response = await fetch(`${API_BASE_URL}/api/config?user_id=${userId}`);

  if (!response.ok) {
    throw new Error('获取配置失败');
  }

  return response.json();
}

// 更新配置
export async function updateConfig(config: ConfigUpdateRequest): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error('更新配置失败');
  }
}
