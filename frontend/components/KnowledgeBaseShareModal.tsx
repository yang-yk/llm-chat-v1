'use client';

import { useState, useEffect } from 'react';
import {
  getAdminUsers,
  shareKnowledgeBase,
  unshareKnowledgeBase,
  getKnowledgeBaseShares,
} from '@/lib/api';

interface User {
  id: number;
  username: string;
  email?: string;
}

interface Share {
  user_id: number;
  username: string;
  email?: string;
  permission: 'read' | 'none';
  shared_at: string;
}

interface KnowledgeBaseShareModalProps {
  kbId: number;
  kbName: string;
  kbOwnerId?: number; // 知识库所有者ID
  isOpen: boolean;
  onClose: () => void;
}

export default function KnowledgeBaseShareModal({
  kbId,
  kbName,
  kbOwnerId,
  isOpen,
  onClose,
}: KnowledgeBaseShareModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [permission, setPermission] = useState<'read' | 'none'>('read');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, kbId]);

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

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersData, sharesData] = await Promise.all([
        getAdminUsers(),
        getKnowledgeBaseShares(kbId),
      ]);
      setUsers(usersData.users || []);
      setShares(sharesData.shares || []);
    } catch (error: any) {
      console.error('加载数据失败:', error);
      showToast(error.message || '加载数据失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0) {
      showToast('请选择要分享的用户', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const result = await shareKnowledgeBase(kbId, selectedUsers, permission);
      showToast(result.message || '分享成功', 'success');
      setSelectedUsers([]);
      await loadData();
    } catch (error: any) {
      console.error('分享失败:', error);
      showToast(error.message || '分享失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnshare = async (userId: number, username: string) => {
    if (!confirm(`确定要取消对 ${username} 的分享吗？`)) return;

    try {
      setIsLoading(true);
      await unshareKnowledgeBase(kbId, [userId]);
      showToast('已取消分享', 'success');
      await loadData();
    } catch (error: any) {
      console.error('取消分享失败:', error);
      showToast(error.message || '取消分享失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUser = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // 过滤掉已分享的用户和知识库所有者
  const availableUsers = users.filter(
    user => !shares.some(share => share.user_id === user.id) && user.id !== kbOwnerId
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">知识库分享管理</h2>
            <p className="text-sm text-gray-600 mt-1">{kbName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toast 通知 */}
        {toast && (
          <div className="absolute top-4 right-4 z-50 animate-slide-in">
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

        {/* 主内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* 添加分享区域 */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">添加分享</h3>

              {/* 权限选择 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  权限类型
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={permission === 'read'}
                      onChange={() => setPermission('read')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">可读（可查看知识库和文档名）</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={permission === 'none'}
                      onChange={() => setPermission('none')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">不可读（看不到知识库详情）</span>
                  </label>
                </div>
              </div>

              {/* 用户选择 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择用户（可多选）
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2">
                  {availableUsers.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      所有用户都已被分享
                    </p>
                  ) : (
                    availableUsers.map(user => (
                      <label
                        key={user.id}
                        className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUser(user.id)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{user.username}</p>
                          {user.email && (
                            <p className="text-xs text-gray-500">{user.email}</p>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* 分享按钮 */}
              <button
                onClick={handleShare}
                disabled={isLoading || selectedUsers.length === 0}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? '处理中...' : `分享给 ${selectedUsers.length} 个用户`}
              </button>
            </div>

            {/* 已分享列表 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                已分享用户 ({shares.length})
              </h3>
              {shares.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p>暂未分享给任何用户</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {shares.map(share => (
                    <div
                      key={share.user_id}
                      className="bg-gray-50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-100 transition-all"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{share.username}</p>
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            share.permission === 'read'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {share.permission === 'read' ? '可读' : '不可读'}
                          </span>
                        </div>
                        {share.email && (
                          <p className="text-sm text-gray-500 mt-1">{share.email}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          分享于 {new Date(share.shared_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleUnshare(share.user_id, share.username)}
                        disabled={isLoading}
                        className="ml-4 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                      >
                        取消分享
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
