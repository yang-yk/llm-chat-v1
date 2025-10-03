import type { Message } from './types';

/**
 * 导出对话为Markdown格式
 */
export function exportAsMarkdown(messages: Message[], title: string): void {
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  const timeStr = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // 构建美化的Markdown文档
  let markdown = `# 💬 ${title}\n\n`;
  markdown += `> **导出时间**: ${dateStr} ${timeStr}  \n`;
  markdown += `> **消息总数**: ${messages.length} 条  \n`;
  markdown += `> **导出工具**: LLM Chat System\n\n`;
  markdown += `---\n\n`;

  messages.forEach((msg, index) => {
    const role = msg.role === 'user' ? '👤 **用户**' : '🤖 **助手**';
    const badge = msg.role === 'user' ? '`User`' : '`Assistant`';
    const messageNumber = index + 1;

    markdown += `### ${role} ${badge} <sub>消息 #${messageNumber}</sub>\n\n`;

    // 处理消息内容，保留代码块格式
    const content = msg.content;
    markdown += `${content}\n\n`;

    if (index < messages.length - 1) {
      markdown += `<br>\n\n`;
      markdown += `---\n\n`;
    }
  });

  // 添加页脚
  markdown += `\n---\n\n`;
  markdown += `<div align="center">\n\n`;
  markdown += `*📝 本对话记录由 **LLM Chat System** 导出*  \n`;
  markdown += `*🕒 ${dateStr}*\n\n`;
  markdown += `</div>\n`;

  const filename = sanitizeFilename(title);
  downloadFile(markdown, `${filename}.md`, 'text/markdown');
}

/**
 * 导出对话为TXT格式
 */
export function exportAsTxt(messages: Message[], title: string): void {
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  const timeStr = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const width = 80;
  const titleLine = `╔${'═'.repeat(width - 2)}╗`;
  const bottomLine = `╚${'═'.repeat(width - 2)}╝`;
  const divider = `${'─'.repeat(width)}`;

  let text = titleLine + '\n';
  text += `║ ${centerText(`💬 ${title}`, width - 4)} ║\n`;
  text += bottomLine + '\n\n';

  text += `📅 导出时间: ${dateStr} ${timeStr}\n`;
  text += `📊 消息总数: ${messages.length} 条\n`;
  text += `🛠️  导出工具: LLM Chat System\n\n`;
  text += `${divider}\n\n`;

  messages.forEach((msg, index) => {
    const role = msg.role === 'user' ? '👤 【用户】' : '🤖 【助手】';
    const messageNumber = `#${(index + 1).toString().padStart(3, '0')}`;

    text += `${role} ${messageNumber}\n`;
    text += `${'-'.repeat(width)}\n`;
    text += `${msg.content}\n\n`;

    if (index < messages.length - 1) {
      text += `${divider}\n\n`;
    }
  });

  text += `\n${divider}\n`;
  text += centerText('📝 本对话记录由 LLM Chat System 导出', width) + '\n';
  text += centerText(`🕒 ${dateStr}`, width) + '\n';
  text += `${divider}\n`;

  const filename = sanitizeFilename(title);
  downloadFile(text, `${filename}.txt`, 'text/plain');
}

/**
 * 导出对话为PDF格式（使用HTML转PDF）
 */
export async function exportAsPdf(messages: Message[], title: string): Promise<void> {
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  const timeStr = now.toLocaleTimeString('zh-CN');

  // 创建优化的HTML内容
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      margin: 2cm;
      size: A4;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "SimHei", sans-serif;
      line-height: 1.8;
      color: #1f2937;
      font-size: 14px;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }

    h1 {
      color: #1e40af;
      font-size: 28px;
      margin: 0 0 15px 0;
      font-weight: 700;
    }

    .meta {
      color: #6b7280;
      font-size: 12px;
      line-height: 1.6;
    }

    .meta-item {
      margin: 5px 0;
    }

    .message {
      margin-bottom: 25px;
      padding: 20px;
      border-radius: 8px;
      page-break-inside: avoid;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .message-header {
      font-weight: 700;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 15px;
    }

    .message-number {
      color: #9ca3af;
      font-size: 12px;
      font-weight: normal;
    }

    .user {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-left: 5px solid #3b82f6;
    }

    .user .message-header {
      color: #1e40af;
    }

    .assistant {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border-left: 5px solid #10b981;
    }

    .assistant .message-header {
      color: #047857;
    }

    .message-content {
      white-space: pre-wrap;
      word-wrap: break-word;
      line-height: 1.8;
      color: #374151;
    }

    code {
      background: #f3f4f6;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      font-size: 13px;
      color: #dc2626;
      border: 1px solid #e5e7eb;
    }

    pre {
      background: #1f2937;
      color: #f3f4f6;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 12px 0;
      border: 1px solid #374151;
    }

    pre code {
      background: none;
      color: inherit;
      padding: 0;
      border: none;
      font-size: 12px;
    }

    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>💬 ${escapeHtml(title)}</h1>
    <div class="meta">
      <div class="meta-item">📅 导出时间: ${dateStr} ${timeStr}</div>
      <div class="meta-item">📊 消息总数: ${messages.length} 条</div>
      <div class="meta-item">🛠️ 导出工具: LLM Chat System</div>
    </div>
  </div>
`;

  messages.forEach((msg, index) => {
    const role = msg.role === 'user' ? 'user' : 'assistant';
    const roleText = msg.role === 'user' ? '👤 用户' : '🤖 助手';
    const messageNumber = `#${(index + 1).toString().padStart(3, '0')}`;
    const content = formatContentForPdf(msg.content);

    html += `
  <div class="message ${role}">
    <div class="message-header">
      <span>${roleText}</span>
      <span class="message-number">${messageNumber}</span>
    </div>
    <div class="message-content">${content}</div>
  </div>
`;
  });

  html += `
  <div class="footer">
    <div>📝 本对话记录由 <strong>LLM Chat System</strong> 导出</div>
    <div>🕒 ${dateStr}</div>
  </div>
</body>
</html>
`;

  // 使用浏览器打印功能生成PDF
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // 等待内容加载完成
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  } else {
    alert('无法打开打印窗口，请检查浏览器弹窗设置');
  }
}

/**
 * 转义HTML特殊字符
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 格式化PDF内容
 */
function formatContentForPdf(text: string): string {
  // 转义HTML
  let formatted = escapeHtml(text);

  // 处理代码块
  formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
    const language = lang || 'code';
    return `<div style="margin: 12px 0;"><div style="background: #374151; color: #9ca3af; padding: 4px 12px; font-size: 11px; border-radius: 6px 6px 0 0;">${language}</div><pre><code>${code.trim()}</code></pre></div>`;
  });

  // 处理行内代码
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 恢复换行
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

/**
 * 文本居中（用于TXT格式）
 */
function centerText(text: string, width: number): string {
  // 计算emoji和中文字符的实际宽度
  let visualLength = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    // Emoji 和中文占2个字符宽度
    if (code > 127 || /[\u4e00-\u9fa5]/.test(char)) {
      visualLength += 2;
    } else {
      visualLength += 1;
    }
  }

  const padding = Math.max(0, Math.floor((width - visualLength) / 2));
  return ' '.repeat(padding) + text;
}

/**
 * 清理文件名中的非法字符
 */
function sanitizeFilename(filename: string): string {
  // 移除或替换非法字符
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/^\.+/, '')
    .substring(0, 200) || '对话记录';
}

/**
 * 下载文件
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
