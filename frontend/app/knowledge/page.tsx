'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { KnowledgeBase, KnowledgeBaseDetail } from '@/lib/types';
import {
  getToken,
  getUser,
  getKnowledgeBases,
  createKnowledgeBase,
  getKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  copyKnowledgeBase,
  renameKnowledgeBase,
  uploadDocument,
  uploadDocumentsBatch,
  deleteDocument,
} from '@/lib/api';
import KnowledgeBaseShareModal from '@/components/KnowledgeBaseShareModal';

export default function KnowledgePage() {
  const router = useRouter();
  const [ownKnowledgeBases, setOwnKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [sharedKnowledgeBases, setSharedKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKB, setSelectedKB] = useState<KnowledgeBaseDetail | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newKBName, setNewKBName] = useState('');
  const [newKBDesc, setNewKBDesc] = useState('');
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [shareModalKB, setShareModalKB] = useState<KnowledgeBase | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Array<{
    filename: string;
    status: 'uploading' | 'success' | 'error';
    error?: string;
  }>>([]);
  const [copyModalKB, setCopyModalKB] = useState<KnowledgeBase | null>(null);
  const [copyNewName, setCopyNewName] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  const [renameModalKB, setRenameModalKB] = useState<KnowledgeBase | null>(null);
  const [renameNewName, setRenameNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    // 检查用户是否登录
    const checkAuth = () => {
      const token = getToken();
      const user = getUser();

      if (!token || !user) {
        router.push('/auth');
        return false;
      }

      // 检查是否是管理员
      setIsAdmin(user.is_admin === true);
      setIsAuthChecking(false);
      return true;
    };

    if (checkAuth()) {
      loadKnowledgeBases();
    }
  }, [router]);

  // Toast 自动隐藏
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const loadKnowledgeBases = async () => {
    try {
      const { own, shared } = await getKnowledgeBases();
      setOwnKnowledgeBases(own);
      setSharedKnowledgeBases(shared);
    } catch (error) {
      console.error('加载知识库列表失败:', error);
      alert('加载知识库列表失败');
    }
  };

  const handleCreateKB = async () => {
    if (!newKBName.trim()) {
      alert('请输入知识库名称');
      return;
    }

    try {
      await createKnowledgeBase({
        name: newKBName,
        description: newKBDesc,
      });
      setIsCreateModalOpen(false);
      setNewKBName('');
      setNewKBDesc('');
      await loadKnowledgeBases();
      showToast('知识库创建成功', 'success');
    } catch (error: any) {
      console.error('创建知识库失败:', error);
      const errorMessage = error?.message || '创建知识库失败';
      showToast(errorMessage, 'error');
    }
  };

  const handleDeleteKB = async (kbId: number, kbName: string) => {
    if (!confirm(`确定要删除知识库"${kbName}"吗？这将删除其中的所有文档！`)) {
      return;
    }

    try {
      await deleteKnowledgeBase(kbId);
      await loadKnowledgeBases();
      if (selectedKB?.id === kbId) {
        setSelectedKB(null);
        setIsDetailModalOpen(false);
      }
    } catch (error) {
      console.error('删除知识库失败:', error);
      alert('删除知识库失败');
    }
  };

  const handleViewDetails = async (kbId: number) => {
    try {
      const detail = await getKnowledgeBase(kbId);
      setSelectedKB(detail);
      setIsDetailModalOpen(true);
    } catch (error) {
      console.error('获取知识库详情失败:', error);
      alert('获取知识库详情失败');
    }
  };

  const handleUploadDocument = async (kbId: number, files: FileList | null) => {
    if (!files || files.length === 0) return;

    // 将 FileList 转换为数组
    const fileArray = Array.from(files);

    // 验证所有文件
    for (const file of fileArray) {
      const fileType = file.name.split('.').pop()?.toLowerCase();
      if (!['txt', 'pdf', 'doc', 'docx'].includes(fileType || '')) {
        showToast(`文件 ${file.name} 格式不支持，仅支持 txt, pdf, doc, docx 格式`, 'error');
        return;
      }

      // 检查文件大小（限制为 50MB）
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        showToast(`文件 ${file.name} 大小超过 50MB`, 'error');
        return;
      }
    }

    setIsUploading(true);

    // 初始化上传进度
    const initialProgress = fileArray.map(file => ({
      filename: file.name,
      status: 'uploading' as const
    }));
    setUploadProgress(initialProgress);

    try {
      // 调用批量上传API
      const result = await uploadDocumentsBatch(kbId, fileArray);

      // 后端返回的数据在 results 字段中
      const successList = result.results?.success || [];
      const failedList = result.results?.failed || [];

      // 更新进度状态
      const finalProgress: Array<{
        filename: string;
        status: 'uploading' | 'success' | 'error';
        error?: string;
      }> = [
        ...successList.map(s => ({
          filename: s.filename,
          status: 'success' as const
        })),
        ...failedList.map(f => ({
          filename: f.filename,
          status: 'error' as const,
          error: f.error
        }))
      ];

      setUploadProgress(finalProgress);

      // 显示结果摘要
      if (failedList.length === 0) {
        showToast(`成功上传 ${successList.length} 个文件`, 'success');
      } else if (successList.length === 0) {
        showToast(`上传失败：${failedList.length} 个文件上传失败`, 'error');
      } else {
        showToast(`上传完成：${successList.length} 个成功，${failedList.length} 个失败`, 'success');
      }

      // 2秒后清除进度显示，并刷新列表
      setTimeout(async () => {
        setUploadProgress([]);
        const detail = await getKnowledgeBase(kbId);
        setSelectedKB(detail);
        await loadKnowledgeBases();
      }, 2000);

    } catch (error: any) {
      console.error('批量上传文档失败:', error);
      const errorMessage = error?.message || error?.toString() || '未知错误';
      showToast(`批量上传失败: ${errorMessage}`, 'error');
      setUploadProgress([]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: number, filename: string) => {
    try {
      await deleteDocument(docId);
      // 静默删除，不显示提示，直接刷新列表
      if (selectedKB) {
        const detail = await getKnowledgeBase(selectedKB.id);
        setSelectedKB(detail);
        await loadKnowledgeBases();
      }
    } catch (error) {
      console.error('删除文档失败:', error);
      showToast('删除文档失败', 'error');
    }
  };

  const handleCopyKB = async () => {
    if (!copyModalKB) return;
    if (!copyNewName.trim()) {
      showToast('请输入新知识库名称', 'error');
      return;
    }

    setIsCopying(true);
    try {
      await copyKnowledgeBase(copyModalKB.id, copyNewName.trim());
      setCopyModalKB(null);
      setCopyNewName('');
      await loadKnowledgeBases();
      showToast(`知识库"${copyModalKB.name}"已复制为"${copyNewName.trim()}"`, 'success');
    } catch (error: any) {
      console.error('复制知识库失败:', error);
      const errorMessage = error?.message || '复制知识库失败';
      showToast(errorMessage, 'error');
    } finally {
      setIsCopying(false);
    }
  };

  const handleRenameKB = async () => {
    if (!renameModalKB) return;
    if (!renameNewName.trim()) {
      showToast('请输入新知识库名称', 'error');
      return;
    }

    setIsRenaming(true);
    try {
      await renameKnowledgeBase(renameModalKB.id, renameNewName.trim());
      setRenameModalKB(null);
      setRenameNewName('');
      await loadKnowledgeBases();
      showToast(`知识库已重命名为"${renameNewName.trim()}"`, 'success');
    } catch (error: any) {
      console.error('重命名知识库失败:', error);
      const errorMessage = error?.message || '重命名知识库失败';
      showToast(errorMessage, 'error');
    } finally {
      setIsRenaming(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">已完成</span>;
      case 'processing':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">处理中</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">失败</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">{status}</span>;
    }
  };

  if (isAuthChecking) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* 导航栏 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
              title="返回主页"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
              <span className="text-2xl">📚</span>
              <span>知识库管理</span>
            </h1>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>创建知识库</span>
          </button>
        </div>
      </header>

      {/* Toast 通知 */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {toast.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* 我的知识库 */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>我的知识库</span>
              <span className="text-sm font-normal text-gray-500">({ownKnowledgeBases.length})</span>
            </h2>
            {ownKnowledgeBases.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">还没有知识库</h3>
                <p className="text-gray-600 mb-6">创建您的第一个知识库，上传文档开始使用</p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm"
                >
                  创建知识库
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ownKnowledgeBases.map((kb) => (
                  <div
                    key={kb.id}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-200 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">{kb.name}</h3>
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">我的</span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {kb.description || '暂无描述'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{kb.document_count} 个文档</span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mb-4">
                      创建于 {new Date(kb.created_at).toLocaleDateString('zh-CN')}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleViewDetails(kb.id)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm flex items-center gap-1"
                        title="查看详情"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        详情
                      </button>
                      <button
                        onClick={() => {
                          setCopyModalKB(kb);
                          setCopyNewName(`${kb.name} - 副本`);
                        }}
                        className="px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all text-sm flex items-center gap-1"
                        title="复制知识库"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        复制
                      </button>
                      <button
                        onClick={() => {
                          setRenameModalKB(kb);
                          setRenameNewName(kb.name);
                        }}
                        className="px-3 py-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-all text-sm flex items-center gap-1"
                        title="重命名知识库"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        重命名
                      </button>
                      <button
                        onClick={() => handleDeleteKB(kb.id, kb.name)}
                        className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all text-sm flex items-center gap-1"
                        title="删除知识库"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        删除
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setShareModalKB(kb)}
                          className="px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all text-sm flex items-center gap-1"
                          title="分享知识库"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          分享
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 共享的知识库 */}
          {sharedKnowledgeBases.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>共享的知识库</span>
                <span className="text-sm font-normal text-gray-500">({sharedKnowledgeBases.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sharedKnowledgeBases.map((kb) => (
                  <div
                    key={kb.id}
                    className="bg-gradient-to-br from-purple-50 to-white rounded-lg shadow-sm hover:shadow-md transition-all border border-purple-200 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">{kb.name}</h3>
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">共享</span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {kb.description || '暂无描述'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>所有者: {kb.owner_username}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{kb.document_count} 个文档</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>权限: {kb.permission === 'read' ? '可读' : '不可读'}</span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mb-4">
                      共享于 {new Date(kb.shared_at || kb.created_at).toLocaleDateString('zh-CN')}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(kb.id)}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm"
                      >
                        查看详情
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 创建知识库模态框 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">创建知识库</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  知识库名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newKBName}
                  onChange={(e) => setNewKBName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入知识库名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  知识库描述
                </label>
                <textarea
                  value={newKBDesc}
                  onChange={(e) => setNewKBDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入知识库描述"
                  rows={3}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setNewKBName('');
                  setNewKBDesc('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleCreateKB}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 知识库详情模态框 */}
      {isDetailModalOpen && selectedKB && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedKB.name}</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedKB.description || '暂无描述'}</p>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 只有所有者才能上传文档 */}
            {selectedKB.is_owner && (
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all cursor-pointer">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>{isUploading ? '上传中...' : '上传文档'}</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".txt,.pdf,.doc,.docx"
                        multiple
                        onChange={(e) => handleUploadDocument(selectedKB.id, e.target.files)}
                        disabled={isUploading}
                      />
                    </label>
                    <span className="text-sm text-gray-600">支持 txt, pdf, doc, docx 格式，可同时选择多个文件</span>
                  </div>

                  {/* 批量上传进度显示 */}
                  {uploadProgress.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="text-sm font-medium text-gray-700">上传进度：</div>
                      {uploadProgress.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          {item.status === 'uploading' && (
                            <svg className="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                          {item.status === 'success' && (
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {item.status === 'error' && (
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          <span className={
                            item.status === 'success' ? 'text-green-700' :
                            item.status === 'error' ? 'text-red-700' :
                            'text-gray-700'
                          }>
                            {item.filename}
                            {item.error && <span className="text-red-600 ml-2">({item.error})</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 如果是 none 权限，显示提示信息 */}
            {selectedKB.permission === 'none' && (
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>您对此知识库没有查看权限</span>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {selectedKB.permission === 'none' ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🔒</div>
                  <p className="text-gray-600">此知识库不可读</p>
                </div>
              ) : selectedKB.documents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📄</div>
                  <p className="text-gray-600">
                    {selectedKB.is_owner ? '暂无文档，请上传文档' : '暂无文档'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedKB.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-all border border-gray-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="font-medium text-gray-900">{doc.filename}</span>
                            {getStatusBadge(doc.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{doc.file_type.toUpperCase()}</span>
                            <span>{formatFileSize(doc.file_size)}</span>
                            <span>{doc.chunk_count} 个文本块</span>
                          </div>
                          {doc.error_message && (
                            <div className="mt-2 text-sm text-red-600">
                              错误: {doc.error_message}
                            </div>
                          )}
                          <div className="mt-2 text-xs text-gray-500">
                            上传于 {new Date(doc.created_at).toLocaleString('zh-CN')}
                          </div>
                        </div>
                        {/* 只有所有者才能删除文档 */}
                        {selectedKB.is_owner && (
                          <button
                            onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                            className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="删除文档"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 知识库分享模态框 */}
      {shareModalKB && (
        <KnowledgeBaseShareModal
          kbId={shareModalKB.id}
          kbName={shareModalKB.name}
          kbOwnerId={shareModalKB.user_id}
          isOpen={!!shareModalKB}
          onClose={() => {
            setShareModalKB(null);
            loadKnowledgeBases(); // 关闭后刷新列表
          }}
        />
      )}

      {/* 复制知识库模态框 */}
      {copyModalKB && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">复制知识库</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  原知识库名称
                </label>
                <input
                  type="text"
                  value={copyModalKB.name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  新知识库名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={copyNewName}
                  onChange={(e) => setCopyNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="输入新知识库名称"
                  autoFocus
                />
              </div>
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-blue-900 mb-1">复制说明：</p>
                    <ul className="list-disc list-inside text-blue-800 space-y-1">
                      <li>将复制所有文档和向量数据</li>
                      <li>新知识库名称不能与现有知识库重复</li>
                      <li>只会复制已处理完成的文档</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setCopyModalKB(null);
                  setCopyNewName('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                disabled={isCopying}
              >
                取消
              </button>
              <button
                onClick={handleCopyKB}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={isCopying || !copyNewName.trim()}
              >
                {isCopying ? '复制中...' : '确认复制'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 重命名知识库模态框 */}
      {renameModalKB && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">重命名知识库</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  当前名称
                </label>
                <input
                  type="text"
                  value={renameModalKB.name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  新名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={renameNewName}
                  onChange={(e) => setRenameNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="输入新名称"
                  autoFocus
                />
              </div>
              <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-yellow-800">新名称不能与现有知识库重复</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setRenameModalKB(null);
                  setRenameNewName('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                disabled={isRenaming}
              >
                取消
              </button>
              <button
                onClick={handleRenameKB}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={isRenaming || !renameNewName.trim()}
              >
                {isRenaming ? '重命名中...' : '确认重命名'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
