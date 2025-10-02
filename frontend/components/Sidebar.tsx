'use client';

import { useState } from 'react';
import type { Conversation } from '@/lib/types';

interface SidebarProps {
  conversations: Conversation[];
  currentSessionId: string | null;
  isOpen: boolean;
  onNewChat: () => void;
  onSelectConversation: (sessionId: string) => void;
  onDeleteConversation: (sessionId: string) => void;
  onToggleSidebar: () => void;
}

export default function Sidebar({
  conversations,
  currentSessionId,
  isOpen,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onToggleSidebar,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <>
      {/* 遮罩层 - 仅在移动端显示 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
          onClick={onToggleSidebar}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`fixed left-0 top-0 h-full bg-gray-100 text-gray-800 transition-transform duration-300 z-20 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-72 sm:w-80 flex flex-col shadow-xl border-r border-gray-300`}
      >
        <div className="p-4 sm:p-5 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">💬</span>
              <span>对话列表</span>
            </h2>
            <button
              onClick={onToggleSidebar}
              className="text-gray-500 hover:text-gray-800 p-1.5 rounded-lg hover:bg-gray-200 transition-all"
              title="隐藏侧边栏"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <button
            onClick={onNewChat}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-medium py-2.5 sm:py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02] text-sm"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新对话
            </span>
          </button>
        </div>

        <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-amber-50 text-amber-700 text-xs border-b border-gray-200 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="truncate">仅保存最近500条对话记录</span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1">
          {conversations.map((conv) => (
            <div
              key={conv.session_id}
              className={`relative p-3 sm:p-4 mb-2 rounded-lg cursor-pointer transition-all border ${
                currentSessionId === conv.session_id
                  ? 'bg-white shadow-md border-blue-300'
                  : 'bg-white/60 border-gray-300 hover:bg-white hover:shadow-sm'
              }`}
              onClick={() => onSelectConversation(conv.session_id)}
              onMouseEnter={() => setHoveredId(conv.session_id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium truncate text-gray-900 mb-1.5">{conv.title}</h3>
                  <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      {conv.message_count}
                    </span>
                    <span className="text-gray-400 hidden sm:inline">•</span>
                    <span className="truncate hidden sm:inline">
                      {new Date(conv.updated_at).toLocaleString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                {hoveredId === conv.session_id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.session_id);
                    }}
                    className="ml-2 p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                    title="删除对话"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
