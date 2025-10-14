'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import type { KnowledgeBase } from '@/lib/types';

interface MessageInputProps {
  onSendMessage: (message: string, knowledgeBaseIds?: number[]) => void;
  onFocus?: () => void;
  onStopGeneration?: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
  knowledgeBases?: KnowledgeBase[];
  uploadedFile?: { filename: string; docId: string } | null;
  onFileUpload?: (file: File) => void;
  onFileRemove?: () => void;
  isFileUploading?: boolean;
}

export default function MessageInput({
  onSendMessage,
  onFocus,
  onStopGeneration,
  disabled = false,
  isGenerating = false,
  knowledgeBases = [],
  uploadedFile = null,
  onFileUpload,
  onFileRemove,
  isFileUploading = false
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [selectedKBIds, setSelectedKBIds] = useState<number[]>([]);
  const [showKBDropdown, setShowKBDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const kbButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    // 检查是否可以发送（与按钮禁用逻辑保持一致）
    const selectedKBs = knowledgeBases.filter(kb => selectedKBIds.includes(kb.id));
    const hasProcessingDocs = selectedKBs.some(kb => kb.has_processing_docs);
    const canSend = message.trim() && !disabled && !hasProcessingDocs && !isFileUploading;

    if (canSend) {
      onSendMessage(message.trim(), selectedKBIds.length > 0 ? selectedKBIds : undefined);
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

  const toggleKB = (kbId: number) => {
    setSelectedKBIds(prev => {
      if (prev.includes(kbId)) {
        return prev.filter(id => id !== kbId);
      } else {
        return [...prev, kbId];
      }
    });
  };

  const removeKB = (kbId: number) => {
    setSelectedKBIds(prev => prev.filter(id => id !== kbId));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      // 调用 handleSend，它会检查所有发送条件
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // 自动调整高度
    e.target.style.height = 'auto';
    const newHeight = e.target.scrollHeight;
    const maxHeight = selectedKBIds.length > 0 || uploadedFile ? 200 : 160; // 选择知识库或上传文件时增加最大高度

    // 设置高度，不超过最大值
    if (newHeight > maxHeight) {
      e.target.style.height = maxHeight + 'px';
    } else {
      e.target.style.height = newHeight + 'px';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    // 清空 input value，以便可以重新选择同一个文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const selectedKBs = knowledgeBases.filter(kb => selectedKBIds.includes(kb.id));

  // 检查选中的知识库是否有处理中的文档
  const hasProcessingDocs = selectedKBs.some(kb => kb.has_processing_docs);

  // 禁用发送按钮的条件：
  // 1. 消息为空
  // 2. AI正在生成回复（disabled）
  // 3. 知识库有处理中的文档
  // 4. 文件正在上传（isFileUploading）
  const sendDisabled = !message.trim() || disabled || hasProcessingDocs || isFileUploading;

  return (
    <div className="bg-white px-3 sm:px-6 py-3 sm:py-4 flex justify-center">
      <div className="w-full max-w-5xl">
        <div className="flex gap-2 sm:gap-3 items-end">
          {/* 输入框容器 - 带边框和圆角 */}
          <div className="flex-1 relative border border-gray-300 rounded-xl shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-white">
            {/* 已选知识库标签和上传的文件 */}
            {(selectedKBs.length > 0 || uploadedFile) && (
              <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 pb-1">
                {selectedKBs.map(kb => (
                  <div
                    key={kb.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs"
                  >
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="max-w-[120px] truncate">{kb.name}</span>
                    <button
                      onClick={() => removeKB(kb.id)}
                      className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                      title="移除知识库"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {uploadedFile && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-md text-xs">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="max-w-[120px] truncate">{uploadedFile.filename}</span>
                    <button
                      onClick={onFileRemove}
                      className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
                      title="移除文件"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 输入区域 */}
            <div className="flex items-center gap-0">
              {/* 文件上传按钮 */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isFileUploading || !!uploadedFile}
                  className={`p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all ml-1 mr-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                    uploadedFile ? 'text-green-600 bg-green-50' : ''
                  }`}
                  title={uploadedFile ? '已上传文件' : isFileUploading ? '上传中...' : '上传文件'}
                >
                  {isFileUploading ? (
                    <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".txt,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  disabled={isFileUploading || !!uploadedFile}
                />
              </div>

              {/* 知识库按钮 */}
              {knowledgeBases.length > 0 && (
                <div className="relative flex-shrink-0">
                  <button
                    ref={kbButtonRef}
                    onClick={() => setShowKBDropdown(!showKBDropdown)}
                    disabled={!!uploadedFile}
                    className={`p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all -ml-1 mr-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedKBIds.length > 0 ? 'text-indigo-600 bg-indigo-50' : ''
                    }`}
                    title={uploadedFile ? '上传文件时不可用' : selectedKBIds.length > 0 ? `已选 ${selectedKBIds.length} 个知识库` : '选择知识库'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </button>

                  {/* 知识库下拉框 */}
                  {showKBDropdown && (
                    <div className="absolute left-0 bottom-full mb-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 flex flex-col">
                      <div className="p-1.5 overflow-y-auto flex-1" style={{ maxHeight: '180px' }}>
                        <div className="text-xs text-gray-600 px-2 py-1 mb-0.5 font-medium">选择知识库（可多选）</div>
                        {knowledgeBases.map((kb) => (
                          <label
                            key={kb.id}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedKBIds.includes(kb.id)}
                              onChange={() => toggleKB(kb.id)}
                              className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500 flex-shrink-0"
                            />
                            <span className="text-sm text-gray-700 truncate flex-1">{kb.name}</span>
                          </label>
                        ))}
                      </div>
                      <div className="border-t border-gray-200 p-1.5 bg-gray-50 flex-shrink-0">
                        <button
                          onClick={() => setShowKBDropdown(false)}
                          className="w-full px-2.5 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-all font-medium"
                        >
                          完成
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 文本输入框 */}
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onFocus={onFocus}
                placeholder={
                  disabled ? "AI 正在回复中，请稍候..." :
                  isFileUploading ? "文件上传中，请稍候..." :
                  hasProcessingDocs ? "知识库文档处理中，请稍候..." :
                  "输入你的消息...（Shift + Enter 换行）"
                }
                rows={1}
                className="flex-1 px-2 py-2.5 focus:outline-none resize-none overflow-y-auto whitespace-pre-wrap text-sm sm:text-base bg-transparent"
                style={{
                  minHeight: '44px',
                  maxHeight: selectedKBIds.length > 0 || uploadedFile ? '200px' : '160px',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word'
                }}
              />
            </div>
          </div>

          {/* 发送/停止按钮 */}
          {isGenerating ? (
            <button
              onClick={onStopGeneration}
              className="px-3 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-500 hover:to-blue-600 transition-all flex items-center justify-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg transform hover:scale-[1.02] flex-shrink-0"
              style={{ minWidth: '68px', height: '44px' }}
              title="停止生成"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              <span className="font-medium text-sm sm:text-base hidden xs:inline">停止</span>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={sendDisabled}
              className="px-3 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-500 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:transform-none flex-shrink-0"
              style={{ minWidth: '68px', height: '44px' }}
              title={
                isFileUploading ? "文件上传中，请稍候" :
                hasProcessingDocs ? "知识库文档处理中，请稍候" :
                "发送消息"
              }
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span className="font-medium text-sm sm:text-base hidden xs:inline">发送</span>
            </button>
          )}
        </div>

        {/* 底部提示信息 */}
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
          <svg className={`w-4 h-4 flex-shrink-0 ${(isFileUploading || hasProcessingDocs) ? 'text-yellow-500' : 'text-blue-500'}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">
            {isFileUploading ? (
              <span className="text-yellow-600 font-medium">文件上传中，请稍候...</span>
            ) : hasProcessingDocs ? (
              <span className="text-yellow-600 font-medium">知识库文档处理中，请稍候...</span>
            ) : (
              <>
                支持多轮对话，AI 会记住上下文
                {selectedKBIds.length > 0 && ` • 已启用 ${selectedKBIds.length} 个知识库`}
                {uploadedFile && ` • 已上传文件`}
              </>
            )}
          </span>
          <span className="sm:hidden">
            {isFileUploading ? (
              <span className="text-yellow-600 font-medium">文件上传中...</span>
            ) : hasProcessingDocs ? (
              <span className="text-yellow-600 font-medium">文档处理中...</span>
            ) : (
              <>
                支持多轮对话
                {selectedKBIds.length > 0 && ` • ${selectedKBIds.length} 个知识库`}
                {uploadedFile && ` • 文件`}
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
