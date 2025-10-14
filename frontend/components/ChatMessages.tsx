'use client';

import { useEffect, useRef } from 'react';
import type { Message } from '@/lib/types';
import ChatMessage from './ChatMessage';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  onRegenerate?: () => void;
}

export default function ChatMessages({ messages, isLoading, onRegenerate }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-start justify-center pt-20 p-8 bg-white">
        <div className="text-center max-w-xl">
          <div className="relative mb-8">
            <div className="text-6xl mb-4 animate-bounce inline-block">👋</div>
            <div className="absolute -top-2 -right-2 w-20 h-20 bg-blue-400/20 rounded-full blur-2xl animate-pulse"></div>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            欢迎使用智能助手
          </h2>
          <p className="text-gray-600 mb-6 text-base leading-relaxed">
            我可以帮助你解答问题、编写代码、提供建议等
          </p>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl py-5 px-8 mt-8 border border-blue-100 max-w-2xl mx-auto w-full">
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-blue-600 font-semibold text-sm mb-1">点击下方输入框即可开始对话</p>
                <p className="text-gray-500 text-xs">支持多轮对话，我会记住上下文</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.map((message, index) => {
        // 只给最后一条AI消息传递onRegenerate
        const isLastAssistantMessage = message.role === 'assistant' && index === messages.length - 1;
        return (
          <ChatMessage
            key={index}
            message={message}
            onRegenerate={isLastAssistantMessage ? onRegenerate : undefined}
          />
        );
      })}

      {isLoading && (
        <div className="w-full flex justify-center px-3 sm:px-6 py-2 sm:py-3">
          <div className="w-full max-w-5xl">
            <div className="flex gap-4 sm:gap-6 items-start">
              {/* AI头像 */}
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>

              {/* 加载动画 */}
              <div className="flex flex-col min-w-0 max-w-[90%]">
                <div className="inline-block">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                    <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
