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
  uploadDocument,
  deleteDocument,
} from '@/lib/api';

export default function KnowledgePage() {
  const router = useRouter();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKB, setSelectedKB] = useState<KnowledgeBaseDetail | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newKBName, setNewKBName] = useState('');
  const [newKBDesc, setNewKBDesc] = useState('');
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // 检查用户是否登录
    const checkAuth = () => {
      const token = getToken();
      const user = getUser();

      if (!token || !user) {
        router.push('/auth');
        return false;
      }

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
      const kbs = await getKnowledgeBases();
      setKnowledgeBases(kbs);
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

    const file = files[0];
    const fileType = file.name.split('.').pop()?.toLowerCase();

    if (!['txt', 'pdf', 'doc', 'docx'].includes(fileType || '')) {
      alert('仅支持 txt, pdf, doc, docx 格式的文件');
      return;
    }

    // 检查文件大小（限制为 50MB）
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      alert('文件大小不能超过 50MB');
      return;
    }

    setIsUploading(true);
    try {
      await uploadDocument(kbId, file);
      // 静默上传，不显示提示，直接刷新列表
      setTimeout(async () => {
        const detail = await getKnowledgeBase(kbId);
        setSelectedKB(detail);
        await loadKnowledgeBases();
      }, 1000);
    } catch (error: any) {
      console.error('上传文档失败:', error);
      const errorMessage = error?.message || error?.toString() || '未知错误';
      showToast(`上传失败: ${errorMessage}`, 'error');
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
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">我的知识库</h2>
          {knowledgeBases.length === 0 ? (
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
              {knowledgeBases.map((kb) => (
                <div
                  key={kb.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-200 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{kb.name}</h3>
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

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDetails(kb.id)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm"
                    >
                      查看详情
                    </button>
                    <button
                      onClick={() => handleDeleteKB(kb.id, kb.name)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all text-sm"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
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

            <div className="px-6 py-4 border-b border-gray-200">
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
                    onChange={(e) => handleUploadDocument(selectedKB.id, e.target.files)}
                    disabled={isUploading}
                  />
                </label>
                <span className="text-sm text-gray-600">支持 txt, pdf, doc, docx 格式</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {selectedKB.documents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📄</div>
                  <p className="text-gray-600">暂无文档，请上传文档</p>
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
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                          className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="删除文档"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
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
    </div>
  );
}
