'use client';

import { useState, useRef, useEffect } from 'react';
import type { Message } from '@/lib/types';
import { exportAsMarkdown, exportAsTxt, exportAsPdf } from '@/lib/export';

interface ExportMenuProps {
  messages: Message[];
  conversationTitle: string;
  disabled?: boolean;
}

export default function ExportMenu({ messages, conversationTitle, disabled }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleExport = (format: 'markdown' | 'txt' | 'pdf') => {
    if (messages.length === 0) {
      alert('当前对话为空，无法导出');
      return;
    }

    const title = conversationTitle || '对话记录';

    try {
      switch (format) {
        case 'markdown':
          exportAsMarkdown(messages, title);
          break;
        case 'txt':
          exportAsTxt(messages, title);
          break;
        case 'pdf':
          exportAsPdf(messages, title);
          break;
      }
      setIsOpen(false);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="px-2 sm:px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 border border-gray-300 transition-all text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
        title="导出对话"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span className="hidden sm:inline">导出</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <button
            onClick={() => handleExport('markdown')}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div>
              <div className="font-medium">Markdown</div>
              <div className="text-xs text-gray-500">.md 文件</div>
            </div>
          </button>

          <button
            onClick={() => handleExport('txt')}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <div className="font-medium">纯文本</div>
              <div className="text-xs text-gray-500">.txt 文件</div>
            </div>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div>
              <div className="font-medium">PDF</div>
              <div className="text-xs text-gray-500">打印为PDF</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
