'use client';

import { useState } from 'react';
import type { Message } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import CodeBlock from './CodeBlock';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  return (
    <div className="w-full flex justify-center px-3 sm:px-6 py-2 sm:py-3">
      <div className="w-full max-w-5xl">
        <div className={`flex gap-4 sm:gap-6 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
          {/* 头像 */}
          <div className={`flex-shrink-0 ${isUser ? 'mt-1.5 sm:mt-2' : '-mt-1'}`}>
            {isUser ? (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            )}
          </div>

          {/* 消息内容 */}
          <div className={`flex flex-col min-w-0 group relative ${isUser ? 'max-w-[90%]' : 'w-full'}`}>
            {/* 消息气泡 */}
            <div className={`${isUser ? 'rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 bg-white border border-slate-200/70 shadow-sm inline-block' : 'w-full'}`}>
              {isUser ? (
                // 用户消息直接显示文本，保留换行
                <div className="text-[15px] sm:text-base leading-relaxed break-words text-gray-800 whitespace-pre-wrap">
                  {message.content}
                </div>
              ) : (
                // AI消息使用 Markdown 渲染
                <div className="markdown-content text-[15px] sm:text-base leading-relaxed break-words text-gray-800">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                    // 自定义代码块样式
                    pre: ({ node, children, ...props }) => {
                      // 递归提取文本内容
                      const extractText = (element: any): string => {
                        if (typeof element === 'string') {
                          return element;
                        }
                        if (Array.isArray(element)) {
                          return element.map(extractText).join('');
                        }
                        if (element && typeof element === 'object') {
                          if (element.props && element.props.children) {
                            return extractText(element.props.children);
                          }
                        }
                        return '';
                      };

                      // 提取语言类型
                      const getLanguage = (element: any): string => {
                        if (element && typeof element === 'object') {
                          if (element.props && element.props.className) {
                            const match = /language-(\w+)/.exec(element.props.className);
                            if (match) return match[1];
                          }
                          if (element.props && element.props.children) {
                            return getLanguage(element.props.children);
                          }
                        }
                        if (Array.isArray(element)) {
                          for (const child of element) {
                            const lang = getLanguage(child);
                            if (lang) return lang;
                          }
                        }
                        return '';
                      };

                      const codeContent = extractText(children).replace(/\n$/, '');
                      const language = getLanguage(children);

                      // 使用 CodeBlock 组件，传递 rehype-highlight 处理后的 children
                      return <CodeBlock code={codeContent} language={language}>{children}</CodeBlock>;
                    },
                    code: ({ node, className, children, ...props }) => {
                      const match = /language-(\w+)/.exec(className || '');
                      return match ? (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      ) : (
                        <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                          {children}
                        </code>
                      );
                    },
                    // 自定义其他元素
                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                    li: ({ node, ...props }) => <li className="ml-2" {...props} />,
                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-3 mt-4" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-2 mt-3" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-lg font-bold mb-2 mt-3" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2" {...props} />,
                    a: ({ node, ...props }) => <a className="text-blue-600 hover:underline" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                    em: ({ node, ...props }) => <em className="italic" {...props} />,
                    table: ({ node, ...props }) => <table className="border-collapse border border-gray-300 my-2" {...props} />,
                    th: ({ node, ...props }) => <th className="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold" {...props} />,
                    td: ({ node, ...props }) => <td className="border border-gray-300 px-3 py-2" {...props} />,
                  }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {/* 复制按钮 - 用户的在右下角，AI的在下方一直显示 */}
            {isUser ? (
              <button
                onClick={handleCopyMessage}
                className="absolute bottom-2 right-2 px-2 py-1 bg-white/90 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-md text-xs border border-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                title="复制内容"
              >
                {copied ? (
                  <>
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-600 text-[10px]">已复制</span>
                  </>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            ) : (
              <div className="mt-2">
                <button
                  onClick={handleCopyMessage}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 rounded-md text-xs border border-gray-300 flex items-center gap-1.5"
                  title="复制内容"
                >
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-600">已复制</span>
                    </>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
