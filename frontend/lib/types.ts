// API类型定义
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Conversation {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatRequest {
  user_id: string;
  session_id: string;
  message: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  session_id: string;
  user_message: string;
  assistant_reply: string;
}

export interface ConversationHistoryResponse {
  session_id: string;
  messages: Message[];
}

export interface PresetModel {
  type: string;
  name: string;
  url: string;
  model: string;
  key: string;
}

export interface ConfigResponse {
  llm_api_url: string;
  llm_model: string;
  llm_api_key: string;
  preset_models: PresetModel[];
  current_model_type: string;
  max_tokens: number;
}

export interface ConfigUpdateRequest {
  user_id: string;
  model_type: string;
  llm_api_url?: string;
  llm_model?: string;
  llm_api_key?: string;
  max_tokens?: number;
}
