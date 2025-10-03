'use client';

import { useState, useRef, useEffect } from 'react';

interface HtmlPreviewProps {
  code: string;
  language?: string;
}

export default function HtmlPreview({ code, language }: HtmlPreviewProps) {
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 检测是否是完整的HTML文档
  const isCompleteHtml = code.trim().toLowerCase().startsWith('<!doctype html') ||
                         code.trim().toLowerCase().startsWith('<html');

  // 只在HTML代码时显示预览功能
  const shouldShowPreview = language === 'html' || isCompleteHtml;

  useEffect(() => {
    if (viewMode === 'preview' && iframeRef.current) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

      if (iframeDoc) {
        // 如果是完整的HTML文档，直接写入
        if (isCompleteHtml) {
          iframeDoc.open();
          iframeDoc.write(code);
          iframeDoc.close();
        } else {
          // 如果是HTML片段，包装成完整文档
          const wrappedHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HTML预览</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      margin: 16px;
      line-height: 1.6;
    }
    * {
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  ${code}
</body>
</html>
          `;
          iframeDoc.open();
          iframeDoc.write(wrappedHtml);
          iframeDoc.close();
        }
      }
    }
  }, [viewMode, code, isCompleteHtml]);

  // 全屏切换
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!shouldShowPreview) {
    return null;
  }

  return (
    <div ref={containerRef} className="my-3">
      {/* 控制栏 */}
      <div className="flex items-center justify-between bg-gray-100 px-4 py-2 rounded-t-lg border border-gray-300 border-b-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">HTML预览</span>
          {viewMode === 'preview' && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">实时预览</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 视图切换 */}
          <div className="flex bg-white rounded-md border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('code')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === 'code'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-3.5 h-3.5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              代码
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-3.5 h-3.5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              预览
            </button>
          </div>

          {/* 全屏按钮 */}
          {viewMode === 'preview' && (
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
              title={isFullscreen ? '退出全屏' : '全屏'}
            >
              {isFullscreen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 预览区域 */}
      {viewMode === 'preview' ? (
        <div className="relative bg-white border border-gray-300 rounded-b-lg overflow-hidden">
          <iframe
            ref={iframeRef}
            sandbox="allow-scripts allow-same-origin allow-forms"
            className="w-full bg-white"
            style={{
              height: isFullscreen ? '100vh' : '400px',
              border: 'none',
              display: 'block'
            }}
            title="HTML预览"
          />

          {/* 安全提示 */}
          <div className="absolute top-2 right-2 bg-yellow-50 border border-yellow-200 rounded px-2 py-1 text-xs text-yellow-700 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            安全沙箱
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500 italic bg-gray-50 border border-gray-300 border-t-0 rounded-b-lg p-4 text-center">
          切换到"预览"模式查看HTML渲染效果
        </div>
      )}
    </div>
  );
}
