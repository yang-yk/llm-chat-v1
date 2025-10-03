import type {
  Conversation,
  ChatRequest,
  ChatResponse,
  ConversationHistoryResponse,
  ConfigResponse,
  ConfigUpdateRequest,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 获取token
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

// 获取用户信息
export function getUser(): any {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

// 获取用户ID
export function getUserId(): string {
  const user = getUser();
  return user?.id?.toString() || '';
}

// 创建带认证的请求头
function getAuthHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// 创建新对话
export async function createConversation(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/conversations`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('未登录或登录已过期');
    }
    throw new Error('创建对话失败');
  }

  const data = await response.json();
  return data.session_id;
}

// 获取所有对话列表
export async function getConversations(): Promise<Conversation[]> {
  const response = await fetch(`${API_BASE_URL}/conversations`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('未登录或登录已过期');
    }
    throw new Error('获取对话列表失败');
  }

  const data = await response.json();
  return data.conversations;
}

// 获取对话历史
export async function getConversationHistory(sessionId: string): Promise<ConversationHistoryResponse> {
  const response = await fetch(`${API_BASE_URL}/conversations/${sessionId}/history`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('未登录或登录已过期');
    }
    if (response.status === 403) {
      throw new Error('无权访问此对话');
    }
    if (response.status === 404) {
      throw new Error('对话不存在');
    }
    // 尝试获取详细错误信息
    let errorDetail = '获取对话历史失败';
    try {
      const errorData = await response.json();
      errorDetail = errorData.detail || errorDetail;
    } catch (e) {
      // 如果无法解析JSON，使用默认错误消息
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

// 删除对话
export async function deleteConversation(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/conversations/${sessionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('未登录或登录已过期');
    }
    throw new Error('删除对话失败');
  }
}

// 发送消息（非流式）
export async function sendMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('未登录或登录已过期');
    }
    throw new Error('发送消息失败');
  }

  return response.json();
}

// 发送消息（流式）
export async function* sendMessageStream(request: ChatRequest): AsyncGenerator<string> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ...request, stream: true }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('未登录或登录已过期');
    }
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
  const response = await fetch(`${API_BASE_URL}/api/config?user_id=${userId}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('未登录或登录已过期');
    }
    throw new Error('获取配置失败');
  }

  return response.json();
}

// 更新配置
export async function updateConfig(config: ConfigUpdateRequest): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/config`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('未登录或登录已过期');
    }
    throw new Error('更新配置失败');
  }
}

// 搜索对话
export async function searchConversations(query: string): Promise<Conversation[]> {
  const response = await fetch(`${API_BASE_URL}/conversations/search?q=${encodeURIComponent(query)}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('未登录或登录已过期');
    }
    throw new Error('搜索对话失败');
  }

  const data = await response.json();
  return data.results;
}

// 获取当前登录用户信息
export async function getCurrentUser(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      // 清除本地存储的过期信息
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
      throw new Error('未登录或登录已过期');
    }
    throw new Error('获取用户信息失败');
  }

  return response.json();
}

// 退出登录
export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/auth';
  }
}

// 提交消息反馈
export async function submitFeedback(messageId: number, feedbackType: 'like' | 'dislike'): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/feedback`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      message_id: messageId,
      feedback_type: feedbackType,
    }),
  });

  if (!response.ok) {
    throw new Error('提交反馈失败');
  }
}

// 获取消息反馈状态
export async function getFeedback(messageId: number): Promise<{
  message_id: number;
  feedback_type: 'like' | 'dislike' | null;
  has_feedback: boolean;
}> {
  const response = await fetch(`${API_BASE_URL}/api/feedback/${messageId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('获取反馈失败');
  }

  return response.json();
}

// 删除消息反馈
export async function deleteFeedback(messageId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/feedback/${messageId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok && response.status !== 404) {
    // 404表示反馈不存在，这是正常的
    throw new Error('删除反馈失败');
  }
}
