// API类型定义
export interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: KnowledgeSource[];  // 引用来源（仅AI消息）
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
  knowledge_base_ids?: number[];  // 要使用的知识库ID列表
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

// 知识库相关类型
export interface KnowledgeBase {
  id: number;
  name: string;
  description?: string;
  document_count: number;
  has_processing_docs: boolean;  // 是否有正在处理中的文档
  created_at: string;
  updated_at: string;
}

export interface KnowledgeSource {
  knowledge_base_name: string;
  document_name: string;
  similarity: number;
  chunk_index: number;
  content?: string;  // 匹配的文本内容（可选）
}

export interface Document {
  id: number;
  filename: string;
  file_type: string;
  file_size: number;
  status: 'processing' | 'completed' | 'failed';
  error_message?: string;
  chunk_count: number;
  created_at: string;
}

export interface KnowledgeBaseDetail {
  id: number;
  name: string;
  description?: string;
  documents: Document[];
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseCreateRequest {
  name: string;
  description?: string;
}

export interface KnowledgeBaseUpdateRequest {
  name?: string;
  description?: string;
}
