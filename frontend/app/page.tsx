'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatMessages from '@/components/ChatMessages';
import MessageInput from '@/components/MessageInput';
import SettingsModal from '@/components/SettingsModal';
import ExportMenu from '@/components/ExportMenu';
import type { Conversation, Message, ConfigResponse } from '@/lib/types';
import {
  getUserId,
  createConversation,
  getConversations,
  getConversationHistory,
  deleteConversation,
  sendMessageStream,
  getConfig,
  updateConfig,
  searchConversations,
} from '@/lib/api';

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [userId, setUserId] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  useEffect(() => {
    // 初始化用户ID
    setUserId(getUserId());
    loadConversations();
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const uid = getUserId();
      const cfg = await getConfig(uid);
      setConfig(cfg);
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const convs = await getConversations();
      setConversations(convs);
    } catch (error) {
      console.error('加载对话列表失败:', error);
    }
  };

  const loadConversationHistory = async (sessionId: string) => {
    try {
      const history = await getConversationHistory(sessionId);
      setMessages(history.messages);
      setCurrentSessionId(sessionId);
    } catch (error) {
      console.error('加载对话历史失败:', error);
    }
  };

  const handleNewChat = async () => {
    try {
      const sessionId = await createConversation();
      setCurrentSessionId(sessionId);
      setMessages([]);
      await loadConversations();
    } catch (error) {
      console.error('创建新对话失败:', error);
      alert('创建新对话失败');
    }
  };

  const handleSelectConversation = async (sessionId: string) => {
    await loadConversationHistory(sessionId);
  };

  const handleDeleteConversation = async (sessionId: string) => {
    if (!confirm('确定要删除这个对话吗?')) return;

    try {
      await deleteConversation(sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      await loadConversations();
    } catch (error) {
      console.error('删除对话失败:', error);
      alert('删除对话失败');
    }
  };

  const handleInputFocus = async () => {
    // 如果没有当前会话，自动创建一个新对话
    if (!currentSessionId) {
      await handleNewChat();
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!currentSessionId) {
      // 如果还是没有会话（创建失败），提示用户
      alert('创建对话失败，请重试');
      return;
    }

    // 添加用户消息
    const userMessage: Message = { role: 'user', content: message };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // 创建新的 AbortController
    const controller = new AbortController();
    setAbortController(controller);

    try {
      let assistantContent = '';
      const assistantMessage: Message = { role: 'assistant', content: '' };
      setMessages((prev) => [...prev, assistantMessage]);

      // 使用流式响应
      for await (const chunk of sendMessageStream({
        user_id: userId,
        session_id: currentSessionId,
        message,
        stream: true,
      })) {
        // 检查是否被取消
        if (controller.signal.aborted) {
          break;
        }

        assistantContent += chunk;
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: assistantContent,
          };
          return newMessages;
        });
      }

      // 刷新对话列表以更新标题和消息数
      await loadConversations();
    } catch (error) {
      // 如果是用户主动取消，不显示错误
      if ((error as Error).name === 'AbortError') {
        console.log('用户已停止生成');
      } else {
        console.error('发送消息失败:', error);
        alert('发送消息失败: ' + (error as Error).message);
        // 移除失败的助手消息
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!currentSessionId) return;
    if (!confirm('确定要清空当前对话吗?')) return;

    try {
      await deleteConversation(currentSessionId);
      const sessionId = await createConversation();
      setCurrentSessionId(sessionId);
      setMessages([]);
      await loadConversations();
    } catch (error) {
      console.error('清空对话失败:', error);
      alert('清空对话失败');
    }
  };

  const handleSaveSettings = async (settings: any) => {
    try {
      await updateConfig({
        user_id: userId,
        model_type: settings.modelType,
        llm_api_url: settings.customApiUrl,
        llm_model: settings.customModel,
        llm_api_key: settings.customApiKey,
        max_tokens: settings.maxTokens,
      });
      await loadConfig();
      setIsSettingsOpen(false);
    } catch (error) {
      console.error('保存配置失败:', error);
      alert('保存配置失败');
    }
  };

  const handleSearch = async (query: string) => {
    try {
      if (!query.trim()) {
        // 如果搜索为空，重新加载所有对话
        await loadConversations();
        return;
      }

      const results = await searchConversations(query);
      setConversations(results);
    } catch (error) {
      console.error('搜索失败:', error);
    }
  };

  return (
    <div className="h-screen flex bg-white">
      <Sidebar
        conversations={conversations}
        currentSessionId={currentSessionId}
        isOpen={isSidebarOpen}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onSearch={handleSearch}
      />

      <main
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarOpen ? 'md:ml-80 ml-0' : 'ml-0'
        }`}
      >
        <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-3.5 shadow-sm">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all flex-shrink-0"
                title={isSidebarOpen ? "隐藏侧边栏" : "显示侧边栏"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-1.5 sm:gap-2">
                <span className="text-xl sm:text-2xl flex-shrink-0">🤖</span>
                <span>智能助手</span>
              </h1>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <ExportMenu
                messages={messages}
                conversationTitle={conversations.find(c => c.session_id === currentSessionId)?.title || '对话记录'}
                disabled={messages.length === 0}
              />
              <button
                onClick={handleClearHistory}
                className="px-2 sm:px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 border border-gray-300 transition-all text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                disabled={!currentSessionId}
                title="清空当前对话"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden sm:inline">清空对话</span>
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-2 sm:px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 border border-gray-300 transition-all text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 shadow-sm hover:shadow"
                title="模型设置"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">设置</span>
              </button>
            </div>
          </div>
        </header>

        <ChatMessages messages={messages} isLoading={isLoading} />
        <MessageInput
          onSendMessage={handleSendMessage}
          onFocus={handleInputFocus}
          onStopGeneration={handleStopGeneration}
          disabled={isLoading}
          isGenerating={isLoading}
        />
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        config={config}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
