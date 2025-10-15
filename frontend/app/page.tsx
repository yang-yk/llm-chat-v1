'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ChatMessages from '@/components/ChatMessages';
import MessageInput from '@/components/MessageInput';
import SettingsModal from '@/components/SettingsModal';
import ExportMenu from '@/components/ExportMenu';
import type { Conversation, Message, ConfigResponse, KnowledgeBase, KnowledgeSource } from '@/lib/types';
import {
  getUserId,
  getUser,
  getToken,
  logout,
  createConversation,
  getConversations,
  getConversationHistory,
  deleteConversation,
  sendMessageStream,
  getConfig,
  updateConfig,
  searchConversations,
  deleteFeedback,
  checkAdminPermission,
  getMyModelStats,
  getKnowledgeBases,
  uploadTempDocument,
  deleteTempDocument,
  chatWithTempDocStream,
} from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModelStats, setShowModelStats] = useState(false);
  const [modelStats, setModelStats] = useState<any>(null);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [currentSources, setCurrentSources] = useState<KnowledgeSource[]>([]);
  const [uploadedFile, setUploadedFile] = useState<{ filename: string; docId: string } | null>(null);
  const [isFileUploading, setIsFileUploading] = useState(false);

  useEffect(() => {
    // 检查用户是否登录
    const checkAuth = () => {
      const token = getToken();
      const user = getUser();

      if (!token || !user) {
        // 未登录，跳转到登录页
        router.push('/auth');
        return false;
      }

      // 已登录，初始化用户信息
      setUserId(user.id.toString());
      setUserName(user.username);
      setIsAuthChecking(false);
      return true;
    };

    if (checkAuth()) {
      loadConversations();
      loadConfig();
      checkAdmin();
      loadKnowledgeBases();
    }
  }, [router]);

  const loadKnowledgeBases = async () => {
    try {
      const { own, shared } = await getKnowledgeBases();
      // 合并自己的和共享的知识库，传递给MessageInput
      const allKbs = [...own, ...shared];

      // 只有在知识库真正发生变化时才更新state，避免不必要的重新渲染
      setKnowledgeBases(prev => {
        // 比较新旧知识库列表，检查是否有变化
        if (JSON.stringify(prev) === JSON.stringify(allKbs)) {
          return prev; // 没有变化，返回旧的引用，不触发重新渲染
        }
        return allKbs; // 有变化，更新state
      });
    } catch (error) {
      console.error('加载知识库列表失败:', error);
      // 不阻塞用户使用，只是没有知识库功能
    }
  };

  // 定期刷新知识库列表，以更新文档处理状态
  useEffect(() => {
    if (!userId) return;

    // 每5秒刷新一次知识库列表
    const interval = setInterval(() => {
      loadKnowledgeBases();
    }, 5000);

    return () => clearInterval(interval);
  }, [userId]);

  const checkAdmin = async () => {
    try {
      const result = await checkAdminPermission();
      setIsAdmin(result.is_admin);
    } catch (error) {
      console.error('检查管理员权限失败:', error);
      setIsAdmin(false);
    }
  };

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
    } catch (error: any) {
      console.error('加载对话列表失败:', error);
      if (error.message?.includes('未登录') || error.message?.includes('过期')) {
        router.push('/auth');
      }
    }
  };

  const loadConversationHistory = async (sessionId: string) => {
    try {
      const history = await getConversationHistory(sessionId);
      setMessages(history.messages);
      setCurrentSessionId(sessionId);
    } catch (error: any) {
      console.error('加载对话历史失败:', error);
      const errorMessage = error.message || '未知错误';
      alert(`加载对话历史失败：${errorMessage}`);

      // 如果是认证错误，跳转到登录页
      if (error.message?.includes('未登录') || error.message?.includes('过期')) {
        router.push('/auth');
      }

      // 如果是权限或不存在错误，刷新对话列表
      if (error.message?.includes('无权访问') || error.message?.includes('不存在')) {
        await loadConversations();
      }
    }
  };

  const handleNewChat = async () => {
    // 如果正在生成，禁止创建新对话
    if (isLoading) {
      return;
    }

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
    // 如果正在生成，禁止切换
    if (isLoading) {
      return;
    }

    await loadConversationHistory(sessionId);
  };

  const handleDeleteConversation = async (sessionId: string) => {
    // 如果正在生成且删除的是当前会话，禁止删除
    if (isLoading && currentSessionId === sessionId) {
      return;
    }

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

  const handleSendMessage = async (message: string, knowledgeBaseIds?: number[]) => {
    if (!currentSessionId) {
      // 如果还是没有会话（创建失败），提示用户
      alert('创建对话失败，请重试');
      return;
    }

    // 如果有上传的临时文档，使用临时文档问答
    if (uploadedFile) {
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

        // 使用临时文档问答流式响应
        for await (const event of chatWithTempDocStream(uploadedFile.docId, message)) {
          // 检查是否被取消
          if (controller.signal.aborted) {
            break;
          }

          if (event.type === 'chunk') {
            assistantContent += event.data;
            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                role: 'assistant',
                content: assistantContent,
              };
              return newMessages;
            });
          } else if (event.type === 'error') {
            throw new Error(event.data);
          }
        }
      } catch (error) {
        // 如果是用户主动取消，不显示错误
        if ((error as Error).name === 'AbortError') {
          console.log('用户已停止生成');
        } else {
          console.error('临时文档问答失败:', error);
          const errorMessage = (error as Error).message || '未知错误';
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: `⚠️ **文档问答出错**\n\n抱歉，在处理您的文档问题时遇到了问题。\n\n**错误信息：** ${errorMessage}\n\n**建议：**\n- 请稍后重试\n- 检查文档是否正常上传\n- 如问题持续，请重新上传文档`,
            };
            return newMessages;
          });
        }
      } finally {
        setIsLoading(false);
        setAbortController(null);
      }
      return;
    }

    // 正常的对话流程（知识库或普通对话）
    // 添加用户消息
    const userMessage: Message = { role: 'user', content: message };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setCurrentSources([]); // 清空之前的引用

    // 创建新的 AbortController
    const controller = new AbortController();
    setAbortController(controller);

    try {
      let assistantContent = '';
      let assistantSources: KnowledgeSource[] = [];
      const assistantMessage: Message = { role: 'assistant', content: '' };
      setMessages((prev) => [...prev, assistantMessage]);

      // 使用流式响应
      for await (const item of sendMessageStream({
        user_id: userId,
        session_id: currentSessionId,
        message,
        stream: true,
        knowledge_base_ids: knowledgeBaseIds,
      })) {
        // 检查是否被取消
        if (controller.signal.aborted) {
          break;
        }

        // 处理引用来源
        if (item.type === 'sources') {
          assistantSources = item.data;
          console.log('收到引用来源：', item.data);
          // 更新消息，附加引用来源
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: assistantContent,
              sources: assistantSources,
            };
            return newMessages;
          });
        }
        // 处理内容chunk
        else if (item.type === 'chunk') {
          assistantContent += item.data;
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: assistantContent,
              sources: assistantSources,
            };
            return newMessages;
          });
        }
      }

      // 刷新对话列表以更新标题和消息数
      await loadConversations();

      // 注意：不重新加载历史记录，以保留sources
      // sources已在流式响应中附加到消息，重新加载会覆盖它们
      // 消息ID会在下次切换对话时自动加载
    } catch (error) {
      // 如果是用户主动取消，不显示错误
      if ((error as Error).name === 'AbortError') {
        console.log('用户已停止生成');
      } else {
        console.error('发送消息失败:', error);

        // 在聊天界面中显示错误消息，而不是用 alert
        const errorMessage = (error as Error).message || '未知错误';
        setMessages((prev) => {
          const newMessages = [...prev];
          // 更新最后一条助手消息为错误提示
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: `⚠️ **模型响应出错**\n\n抱歉，AI 模型在处理您的请求时遇到了问题。\n\n**错误信息：** ${errorMessage}\n\n**可能的原因：**\n- 模型服务暂时不可用\n- 网络连接问题\n- 请求超时\n\n**建议：**\n- 请稍后重试\n- 检查模型配置是否正确\n- 如问题持续，请联系管理员`,
          };
          return newMessages;
        });
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleRegenerate = async () => {
    // 如果正在生成或没有会话，禁止重新生成
    if (isLoading || !currentSessionId) {
      return;
    }

    // 找到最后一条用户消息
    const lastUserMessageIndex = messages.findLastIndex(msg => msg.role === 'user');
    if (lastUserMessageIndex === -1) {
      return;
    }

    const lastUserMessage = messages[lastUserMessageIndex];

    // 删除最后一条AI回复的反馈（如果存在）
    const lastAssistantMessage = messages[messages.length - 1];
    if (lastAssistantMessage.role === 'assistant' && lastAssistantMessage.id) {
      try {
        await deleteFeedback(lastAssistantMessage.id);
      } catch (error) {
        console.error('删除反馈失败:', error);
        // 继续执行，不阻断重新生成流程
      }
    }

    // 只删除最后一条AI回复（保留用户消息）
    setMessages(messages.slice(0, lastUserMessageIndex + 1));
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
        message: lastUserMessage.content,
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

      // 注意：不重新加载历史记录，以保留sources（如果有RAG的话）
      // 重新生成时不使用知识库，所以没有sources，但为了一致性也不重新加载
      // 消息ID会在下次切换对话时自动加载
    } catch (error) {
      // 如果是用户主动取消，不显示错误
      if ((error as Error).name === 'AbortError') {
        console.log('用户已停止生成');
      } else {
        console.error('重新生成失败:', error);

        // 在聊天界面中显示错误消息
        const errorMessage = (error as Error).message || '未知错误';
        setMessages((prev) => {
          const newMessages = [...prev];
          // 更新最后一条助手消息为错误提示
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: `⚠️ **模型响应出错**\n\n抱歉，AI 模型在处理您的请求时遇到了问题。\n\n**错误信息：** ${errorMessage}\n\n**可能的原因：**\n- 模型服务暂时不可用\n- 网络连接问题\n- 请求超时\n\n**建议：**\n- 请稍后重试\n- 检查模型配置是否正确\n- 如问题持续，请联系管理员`,
          };
          return newMessages;
        });
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

    // 如果正在生成，禁止清空对话
    if (isLoading) {
      return;
    }

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
      const errorMessage = (error as Error).message || '未知错误';
      alert(`保存配置失败：${errorMessage}\n\n请检查配置是否正确，或查看控制台了解详细信息。`);
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

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout();
    }
  };

  const handleShowModelStats = async () => {
    try {
      const stats = await getMyModelStats();
      setModelStats(stats);
      setShowModelStats(true);
    } catch (error) {
      console.error('获取模型统计失败:', error);
      alert('获取模型统计失败');
    }
  };

  const handleFileUpload = async (file: File) => {
    const fileType = file.name.split('.').pop()?.toLowerCase();

    if (!['txt', 'pdf', 'doc', 'docx'].includes(fileType || '')) {
      alert('仅支持 txt, pdf, doc, docx 格式的文件');
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      alert('文件大小不能超过 50MB');
      return;
    }

    setIsFileUploading(true);
    try {
      const result = await uploadTempDocument(file);
      setUploadedFile({
        filename: result.doc_info.filename,
        docId: result.doc_id,
      });
      // 静默上传，不显示提示
    } catch (error: any) {
      console.error('上传文件失败:', error);
      alert(`上传失败：${error.message || '未知错误'}`);
    } finally {
      setIsFileUploading(false);
    }
  };

  const handleFileRemove = async () => {
    if (!uploadedFile) return;

    // 静默删除，不需要确认
    try {
      await deleteTempDocument(uploadedFile.docId);
      setUploadedFile(null);
    } catch (error: any) {
      console.error('删除文件失败:', error);
      alert(`删除失败：${error.message || '未知错误'}`);
    }
  };

  // 认证检查中，显示加载状态
  if (isAuthChecking) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🤖</div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-white">
      <Sidebar
        conversations={conversations}
        currentSessionId={currentSessionId}
        isOpen={isSidebarOpen}
        isLoading={isLoading}
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
              {/* 用户信息 */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg mr-2">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm text-gray-700 font-medium">{userName}</span>
              </div>

              {/* 知识库入口 */}
              <button
                onClick={() => window.open('/knowledge', '_blank')}
                className="px-2 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg transition-all text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 shadow-sm hover:bg-indigo-700 hover:shadow"
                title="知识库管理"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="hidden sm:inline">知识库</span>
              </button>

              {/* 管理后台入口 - 仅管理员可见 */}
              {isAdmin && (
                <button
                  onClick={() => window.open('/admin', '_blank')}
                  className="px-2 sm:px-4 py-2 bg-purple-600 text-white rounded-lg transition-all text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 shadow-sm hover:bg-purple-700 hover:shadow"
                  title="管理后台"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="hidden sm:inline">管理后台</span>
                </button>
              )}

              {/* 模型统计按钮 */}
              <button
                onClick={handleShowModelStats}
                className="px-2 sm:px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 transition-all text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 shadow-sm hover:bg-gray-50 hover:shadow"
                title="我的模型使用统计"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="hidden sm:inline">统计</span>
              </button>

              <ExportMenu
                messages={messages}
                conversationTitle={conversations.find(c => c.session_id === currentSessionId)?.title || '对话记录'}
                disabled={messages.length === 0}
              />
              <button
                onClick={handleClearHistory}
                className={`px-2 sm:px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 transition-all text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 shadow-sm ${
                  !currentSessionId || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 hover:shadow'
                }`}
                disabled={!currentSessionId || isLoading}
                title={isLoading ? "AI 正在回复中，请稍候..." : "清空当前对话"}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden sm:inline">清空对话</span>
              </button>
              <button
                onClick={() => {
                  if (!isLoading) {
                    setIsSettingsOpen(true);
                  }
                }}
                className={`px-2 sm:px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 transition-all text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 shadow-sm ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 hover:shadow'
                }`}
                title={isLoading ? "AI 正在回复中，请稍候..." : "模型设置"}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">设置</span>
              </button>

              {/* 退出登录按钮 */}
              <button
                onClick={handleLogout}
                className="px-2 sm:px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 border border-red-300 transition-all text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 shadow-sm hover:shadow"
                title="退出登录"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">退出</span>
              </button>
            </div>
          </div>
        </header>


        <ChatMessages messages={messages} isLoading={isLoading} onRegenerate={handleRegenerate} />
        <MessageInput
          onSendMessage={handleSendMessage}
          onFocus={handleInputFocus}
          onStopGeneration={handleStopGeneration}
          disabled={isLoading}
          isGenerating={isLoading}
          knowledgeBases={knowledgeBases}
          uploadedFile={uploadedFile}
          onFileUpload={handleFileUpload}
          onFileRemove={handleFileRemove}
          isFileUploading={isFileUploading}
        />
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        config={config}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      {/* 模型统计模态框 */}
      {showModelStats && modelStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">我的模型使用统计</h2>
              <button
                onClick={() => setShowModelStats(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 总调用统计 */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">总调用次数</p>
                    <p className="mt-1 text-4xl font-bold text-gray-900">{modelStats.total_calls}</p>
                  </div>
                  <div className="p-4 bg-white rounded-full shadow-sm">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                {modelStats.last_usage && (
                  <p className="text-sm text-gray-600">
                    最后使用: {new Date(modelStats.last_usage).toLocaleString('zh-CN')}
                  </p>
                )}
              </div>

              {/* 按模型类型统计 */}
              {Object.keys(modelStats.by_type).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">按模型类型</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {Object.entries(modelStats.by_type).map(([type, count]) => (
                      <div key={type} className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-600 capitalize mb-1">{type}</p>
                        <p className="text-2xl font-bold text-gray-900">{count as number}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {modelStats.total_calls > 0 ? Math.round((count as number) / modelStats.total_calls * 100) : 0}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 详细模型列表 */}
              {modelStats.by_model.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">模型详细使用情况</h3>
                  <div className="space-y-3">
                    {modelStats.by_model.map((model: any, index: number) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                            <div>
                              <p className="font-medium text-gray-900">{model.model_name}</p>
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded capitalize">{model.model_type}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{model.count}</p>
                            <p className="text-sm text-gray-500">{model.percentage}%</p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${model.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {modelStats.total_calls === 0 && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-gray-600">暂无使用记录</p>
                  <p className="text-sm text-gray-500 mt-2">开始对话后将记录您的模型使用情况</p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowModelStats(false)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
