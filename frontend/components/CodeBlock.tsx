'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  children?: ReactNode;  // 接收 rehype-highlight 渲染的高亮代码
}

export default function CodeBlock({ code, language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const codeBlockRef = useRef<HTMLDivElement>(null);
  const buttonGroupRef = useRef<HTMLDivElement>(null);

  // 检测是否是完整的HTML文档
  const isCompleteHtml = code?.trim().toLowerCase().startsWith('<!doctype html') ||
                         code?.trim().toLowerCase().startsWith('<html');

  // 只在HTML代码时显示预览功能
  const shouldShowPreview = language === 'html' || isCompleteHtml;

  // 语言显示名称映射
  const languageNames: { [key: string]: string } = {
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'python': 'Python',
    'java': 'Java',
    'cpp': 'C++',
    'c': 'C',
    'csharp': 'C#',
    'go': 'Go',
    'rust': 'Rust',
    'php': 'PHP',
    'ruby': 'Ruby',
    'swift': 'Swift',
    'kotlin': 'Kotlin',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'json': 'JSON',
    'xml': 'XML',
    'yaml': 'YAML',
    'markdown': 'Markdown',
    'bash': 'Bash',
    'shell': 'Shell',
    'sql': 'SQL',
    'jsx': 'JSX',
    'tsx': 'TSX',
  };

  const displayLanguage = language ? (languageNames[language.toLowerCase()] || language.toUpperCase()) : 'CODE';

  // 复制代码到剪贴板
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 下载代码文件
  const handleDownload = () => {
    // 根据语言类型设置文件扩展名和 MIME 类型
    const extensionMap: { [key: string]: string } = {
      'javascript': 'js',
      'typescript': 'ts',
      'python': 'py',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'csharp': 'cs',
      'go': 'go',
      'rust': 'rs',
      'php': 'php',
      'ruby': 'rb',
      'swift': 'swift',
      'kotlin': 'kt',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'markdown': 'md',
      'bash': 'sh',
      'shell': 'sh',
      'sql': 'sql',
      'jsx': 'jsx',
      'tsx': 'tsx',
    };

    const extension = language ? (extensionMap[language.toLowerCase()] || 'txt') : 'txt';
    const mimeType = shouldShowPreview ? 'text/html' : 'text/plain';

    const blob = new Blob([code], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

  // 使用 IntersectionObserver 检测按钮组是否滚出视野
  useEffect(() => {
    // 只在代码视图时才启用检测
    if (viewMode !== 'code' || !buttonGroupRef.current) {
      console.log('⚠️ Observer skipped:', { viewMode, hasButtonRef: !!buttonGroupRef.current });
      return;
    }

    console.log('👀 Setting up IntersectionObserver on button group...');

    const observer = new IntersectionObserver(
      ([entry]) => {
        // 当按钮组滚出视野时，显示浮动工具栏
        const shouldShow = !entry.isIntersecting;
        console.log('🔍 Button intersection change:', {
          isIntersecting: entry.isIntersecting,
          shouldShow,
          ratio: entry.intersectionRatio,
          boundingRect: entry.boundingClientRect.top
        });
        setShowFloatingToolbar(shouldShow);
      },
      {
        threshold: [0, 0.1, 1], // 按钮离开视野就触发
        rootMargin: '0px',
      }
    );

    observer.observe(buttonGroupRef.current);
    console.log('✅ Observer attached to button group');

    return () => {
      console.log('🧹 Observer disconnected');
      observer.disconnect();
    };
  }, [viewMode]); // 依赖 viewMode，视图切换时重新检测


  // 更新 iframe 内容
  useEffect(() => {
    if (viewMode === 'preview' && iframeRef.current) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

      if (iframeDoc) {
        if (isCompleteHtml) {
          iframeDoc.open();
          iframeDoc.write(code);
          iframeDoc.close();
        } else {
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

  return (
    <div ref={containerRef} className="my-4 relative">
      {/* 调试信息 */}
      {viewMode === 'code' && (
        <div className="text-xs text-gray-500 mb-1 font-mono">
          🔍 Debug: showFloatingToolbar = {showFloatingToolbar ? '✅ TRUE' : '❌ FALSE'}
        </div>
      )}

      {/* 代码视图 */}
      {viewMode === 'code' && (
        <div ref={codeBlockRef} className="relative group/codeblock">
          <pre className="rounded-lg pt-12 pb-4 px-4 my-3 overflow-x-auto bg-gray-50 shadow-sm border border-gray-300 w-full max-w-full block">
            {children || <code className={language ? `language-${language}` : ''}>{code}</code>}
          </pre>

          {/* 语言标签 */}
          <div className="absolute top-2 left-3 px-2.5 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium">
            {displayLanguage}
          </div>

          {/* 固定在右上角的按钮组 - 始终显示 */}
          <div ref={buttonGroupRef} className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
            {/* 预览按钮 - 只对 HTML 显示 */}
            {shouldShowPreview && (
              <button
                onClick={() => setViewMode('preview')}
                className="p-2 bg-white/90 hover:bg-blue-50 text-gray-700 hover:text-blue-600 rounded-lg border border-gray-200 hover:border-blue-300 transition-all shadow-sm hover:shadow"
                title="预览HTML"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            )}

            {/* 下载按钮 - 对所有代码都显示 */}
            <button
              onClick={handleDownload}
              className="p-2 bg-white/90 hover:bg-green-50 text-gray-700 hover:text-green-600 rounded-lg border border-gray-200 hover:border-green-300 transition-all shadow-sm hover:shadow"
              title={shouldShowPreview ? "下载HTML" : "下载代码"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            {/* 复制按钮 */}
            <button
              onClick={handleCopy}
              className="p-2 bg-white/90 hover:bg-gray-50 text-gray-700 hover:text-gray-900 rounded-lg border border-gray-200 hover:border-gray-300 transition-all shadow-sm hover:shadow"
              title={copied ? "已复制" : "复制代码"}
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>

          {/* 浮动工具栏 - hover时在代码块右侧显示，跟随屏幕滚动，只在顶部按钮不可见时启用 */}
          {showFloatingToolbar && (
            <div className="absolute right-2 top-0 bottom-0 z-20 pointer-events-none">
              <div className="sticky top-1/2 -translate-y-1/2 opacity-0 group-hover/codeblock:opacity-100 transition-opacity duration-200 pointer-events-auto">
                <div className="flex items-center gap-1.5">
                {/* 预览按钮 - 只对 HTML 显示 */}
                {shouldShowPreview && (
                  <button
                    onClick={() => setViewMode('preview')}
                    className="p-2 bg-white/90 hover:bg-blue-50 text-gray-700 hover:text-blue-600 rounded-lg border border-gray-200 hover:border-blue-300 transition-all shadow-sm hover:shadow"
                    title="预览HTML"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                )}

                {/* 下载按钮 - 对所有代码都显示 */}
                <button
                  onClick={handleDownload}
                  className="p-2 bg-white/90 hover:bg-green-50 text-gray-700 hover:text-green-600 rounded-lg border border-gray-200 hover:border-green-300 transition-all shadow-sm hover:shadow"
                  title={shouldShowPreview ? "下载HTML" : "下载代码"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>

                {/* 复制按钮 */}
                <button
                  onClick={handleCopy}
                  className="p-2 bg-white/90 hover:bg-gray-50 text-gray-700 hover:text-gray-900 rounded-lg border border-gray-200 hover:border-gray-300 transition-all shadow-sm hover:shadow"
                  title={copied ? "已复制" : "复制代码"}
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 预览视图 */}
      {viewMode === 'preview' && shouldShowPreview && (
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          {/* 控制栏 */}
          <div className="flex items-center justify-between bg-gray-100 px-4 py-2 border-b border-gray-300">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">HTML预览</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">实时预览</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* 切换回代码 - 只显示图标 */}
              <button
                onClick={() => setViewMode('code')}
                className="p-2 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 rounded-lg border border-gray-200 hover:border-gray-300 transition-all shadow-sm hover:shadow"
                title="查看代码"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </button>

              {/* 下载HTML - 只显示图标 */}
              <button
                onClick={handleDownload}
                className="p-2 bg-white hover:bg-green-50 text-gray-700 hover:text-green-600 rounded-lg border border-gray-200 hover:border-green-300 transition-all shadow-sm hover:shadow"
                title="下载HTML"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              {/* 全屏按钮 - 只显示图标 */}
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-white hover:bg-purple-50 text-gray-700 hover:text-purple-600 rounded-lg border border-gray-200 hover:border-purple-300 transition-all shadow-sm hover:shadow"
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
            </div>
          </div>

          {/* 预览区域 */}
          <div className="relative bg-white">
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
        </div>
      )}
    </div>
  );
}
