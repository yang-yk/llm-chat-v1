'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onFocus?: () => void;
  disabled?: boolean;
}

export default function MessageInput({ onSendMessage, onFocus, disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      // 发送后立即聚焦输入框
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      // 只有在不是加载状态时才发送
      if (!disabled) {
        handleSend();
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // 自动调整高度
    e.target.style.height = 'auto';
    const newHeight = e.target.scrollHeight;
    const maxHeight = 160; // 与 maxHeight 一致

    // 设置高度，不超过最大值
    if (newHeight > maxHeight) {
      e.target.style.height = maxHeight + 'px';
    } else {
      e.target.style.height = newHeight + 'px';
    }
  };

  return (
    <div className="bg-white px-3 sm:px-6 py-3 sm:py-4 flex justify-center">
      <div className="w-full max-w-5xl">
        <div className="flex gap-2 sm:gap-3 items-start">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onFocus={onFocus}
            placeholder={disabled ? "AI 正在回复中，请稍候..." : "输入你的消息...（Shift + Enter 换行，Enter 发送）"}
            rows={1}
            className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-32 sm:max-h-40 text-sm sm:text-base shadow-sm transition-all overflow-y-auto whitespace-pre-wrap"
            style={{
              minHeight: '44px',
              maxHeight: '160px',
              wordWrap: 'break-word',
              overflowWrap: 'break-word'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            className="px-3 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-500 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:transform-none flex-shrink-0"
            style={{ minWidth: '68px', height: '44px' }}
            title="发送消息"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span className="font-medium text-sm sm:text-base hidden xs:inline">发送</span>
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">支持多轮对话，AI 会记住上下文</span>
          <span className="sm:hidden">支持多轮对话</span>
        </div>
      </div>
    </div>
  );
}
