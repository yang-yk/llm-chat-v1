'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  checkAdminPermission,
  getAdminUsers,
  getAdminUserDetail,
  getAdminStats,
  toggleUserStatus,
  setUserAdmin,
  getAdminModelStats,
  getAdminKnowledgeBaseStats,
} from '@/lib/api';

interface SystemStats {
  users: {
    total: number;
    active: number;
    admin: number;
    today_new: number;
    weekly_active: number;
  };
  conversations: {
    total: number;
    today_new: number;
  };
  messages: {
    total: number;
    user_messages: number;
    ai_messages: number;
    today_new: number;
  };
  feedback: {
    total_likes: number;
    total_dislikes: number;
    satisfaction_rate: number;
  };
}

interface UserInfo {
  id: number;
  username: string;
  email: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_active: string;
  stats: {
    conversation_count: number;
    total_message_count: number;
    user_message_count: number;
    ai_message_count: number;
  };
}

interface ModelStats {
  total_calls: number;
  today_calls: number;
  by_type: {
    [key: string]: number;
  };
  by_model: Array<{
    model_name: string;
    model_type: string;
    count: number;
    percentage: number;
  }>;
  daily_calls: Array<{
    date: string;
    count: number;
  }>;
}

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [modelStats, setModelStats] = useState<ModelStats | null>(null);
  const [kbStats, setKbStats] = useState<any>(null);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
      const result = await checkAdminPermission();
      if (!result.is_admin) {
        alert('权限不足，需要管理员权限');
        router.push('/');
        return;
      }
      setIsAdmin(true);
      loadData();
    } catch (error) {
      console.error('权限检查失败:', error);
      router.push('/auth');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, usersData, modelStatsData, kbStatsData] = await Promise.all([
        getAdminStats(),
        getAdminUsers(),
        getAdminModelStats(),
        getAdminKnowledgeBaseStats(),
      ]);
      setStats(statsData);

      // 对用户列表进行排序：admin 最前，管理员其次，普通用户最后，同类用户按字母顺序排序
      const sortedUsers = [...usersData.users].sort((a, b) => {
        // 1. admin 用户排在最前面
        if (a.username === 'admin') return -1;
        if (b.username === 'admin') return 1;

        // 2. 管理员排在普通用户前面
        if (a.is_admin && !b.is_admin) return -1;
        if (!a.is_admin && b.is_admin) return 1;

        // 3. 同类用户按用户名字母顺序排序
        return a.username.localeCompare(b.username);
      });

      setUsers(sortedUsers);
      setModelStats(modelStatsData);
      setKbStats(kbStatsData);
    } catch (error) {
      console.error('加载数据失败:', error);
      alert('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: number) => {
    try {
      await toggleUserStatus(userId);
      await loadData();
      alert('用户状态已更新');
    } catch (error: any) {
      alert(error.message || '操作失败');
    }
  };

  const handleSetAdmin = async (userId: number, isAdmin: boolean) => {
    try {
      await setUserAdmin(userId, isAdmin);
      await loadData();
      alert('管理员权限已更新');
    } catch (error: any) {
      alert(error.message || '操作失败');
    }
  };

  const handleViewUserDetail = async (userId: number) => {
    try {
      const detail = await getAdminUserDetail(userId);
      setSelectedUser(detail);
      setShowUserDetail(true);
    } catch (error) {
      alert('获取用户详情失败');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  // 搜索过滤
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 分页计算
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // 搜索处理
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // 搜索时重置到第一页
  };

  // 分页处理
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">管理后台</h1>
            <p className="mt-2 text-sm text-gray-600">系统数据统计与用户管理</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              disabled={loading}
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? '刷新中...' : '刷新数据'}
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              返回主页
            </button>
          </div>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总用户数</p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.users.total}</p>
                  <p className="mt-1 text-xs text-gray-500">活跃: {stats.users.active} | 今日新增: {stats.users.today_new}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">对话总数</p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.conversations.total}</p>
                  <p className="mt-1 text-xs text-gray-500">今日新增: {stats.conversations.today_new}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">消息总数</p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.messages.total}</p>
                  <p className="mt-1 text-xs text-gray-500">用户: {stats.messages.user_messages} | AI: {stats.messages.ai_messages}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">满意度</p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.feedback.satisfaction_rate}%</p>
                  <p className="mt-1 text-xs text-gray-500">👍 {stats.feedback.total_likes} | 👎 {stats.feedback.total_dislikes}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 模型调用统计 */}
        {modelStats && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">模型调用统计</h2>

            {/* 总调用统计 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">总调用次数</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">{modelStats.total_calls}</p>
                    <p className="mt-1 text-xs text-gray-500">今日: {modelStats.today_calls}</p>
                  </div>
                  <div className="p-3 bg-indigo-100 rounded-full">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-3">按模型类型</p>
                  <div className="space-y-2">
                    {Object.entries(modelStats.by_type).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 capitalize">{type}</span>
                        <span className="text-sm font-semibold text-gray-900">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-3">热门模型 Top 3</p>
                  <div className="space-y-2">
                    {modelStats.by_model.slice(0, 3).map((model, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                          <span className="text-sm text-gray-700 truncate max-w-[120px]">{model.model_name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">{model.percentage}%</span>
                          <span className="text-sm font-semibold text-gray-900">{model.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 详细模型列表 */}
            {modelStats.by_model.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-600 mb-4">所有模型调用详情</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modelStats.by_model.map((model, index) => (
                    <div key={index} className="border border-gray-200 rounded p-3">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 truncate">{model.model_name}</span>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded capitalize">{model.model_type}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">调用次数</span>
                        <span className="text-sm font-semibold text-gray-900">{model.count} ({model.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 知识库统计 */}
        {kbStats && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">知识库统计</h2>

            {/* 总体统计 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">知识库总数</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">{kbStats.total_knowledge_bases}</p>
                  </div>
                  <div className="p-3 bg-teal-100 rounded-full">
                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">文档总数</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">{kbStats.total_documents}</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-full">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 用户列表 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">用户列表</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  共 {filteredUsers.length} 个用户
                </span>
              </div>
            </div>
            {/* 搜索框 */}
            <div className="mt-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索用户名..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">使用情况</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最后活跃</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentUsers.length > 0 ? (
                  currentUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.email || '-'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_admin ? (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          管理员
                        </span>
                      ) : (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          普通用户
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_active ? (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          激活
                        </span>
                      ) : (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          禁用
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{user.stats.conversation_count} 个对话</div>
                      <div>{user.stats.total_message_count} 条消息</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.last_active)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleViewUserDetail(user.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        详情
                      </button>
                      {user.username !== 'admin' && (
                        <>
                          <button
                            onClick={() => handleToggleUserStatus(user.id)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            {user.is_active ? '禁用' : '启用'}
                          </button>
                          <button
                            onClick={() => handleSetAdmin(user.id, !user.is_admin)}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            {user.is_admin ? '取消管理员' : '设为管理员'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      {searchQuery ? '未找到匹配的用户' : '暂无用户数据'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  显示 {indexOfFirstUser + 1} - {Math.min(indexOfLastUser, filteredUsers.length)} 条，共 {filteredUsers.length} 条
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-lg border ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                    }`}
                  >
                    上一页
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      // 只显示当前页附近的页码
                      if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-1 rounded-lg ${
                              currentPage === pageNum
                                ? 'bg-purple-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      } else if (
                        pageNum === currentPage - 3 ||
                        pageNum === currentPage + 3
                      ) {
                        return <span key={pageNum} className="px-2 text-gray-500">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-lg border ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                    }`}
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 用户详情弹窗 */}
        {showUserDetail && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">用户详情 - {selectedUser.username}</h3>
                  <button
                    onClick={() => setShowUserDetail(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-500">用户ID</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">{selectedUser.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">邮箱</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">{selectedUser.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">注册时间</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">{formatDate(selectedUser.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">反馈统计</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      👍 {selectedUser.feedback_stats.like_count} | 👎 {selectedUser.feedback_stats.dislike_count}
                    </p>
                  </div>
                </div>

                <h4 className="text-md font-semibold text-gray-900 mb-4">知识库列表</h4>
                <div className="space-y-2 mb-6">
                  {selectedUser.knowledge_bases && selectedUser.knowledge_bases.length > 0 ? (
                    selectedUser.knowledge_bases.map((kb: any) => (
                      <div key={kb.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{kb.name}</p>
                            {kb.description && (
                              <p className="text-xs text-gray-600 mt-1">{kb.description}</p>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 ml-2">{formatDate(kb.updated_at)}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-2">
                          <span className="text-gray-500">文档: {kb.doc_count}</span>
                          <div className="flex gap-2">
                            <span className="text-green-600">完成: {kb.completed_count}</span>
                            {kb.processing_count > 0 && (
                              <span className="text-yellow-600">处理中: {kb.processing_count}</span>
                            )}
                            {kb.failed_count > 0 && (
                              <span className="text-red-600">失败: {kb.failed_count}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">暂无知识库</p>
                  )}
                </div>

                <h4 className="text-md font-semibold text-gray-900 mb-4">对话列表</h4>
                <div className="space-y-2">
                  {selectedUser.conversations && selectedUser.conversations.length > 0 ? (
                    selectedUser.conversations.map((conv: any) => (
                      <div key={conv.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{conv.title}</p>
                            <p className="text-xs text-gray-500">{conv.message_count} 条消息</p>
                          </div>
                          <p className="text-xs text-gray-500">{formatDate(conv.updated_at)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">暂无对话</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
