export function setPageTitle(title: string) {
  if (!title) {
    document.title = "NateThePlot";
    return;
  }
  document.title = "NateThePlot - " + title;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

type ToastListener = (toast: ToastItem) => void;

const toastListeners = new Set<ToastListener>();
let nextToastId = 1;

function emitToast(message: string, type: ToastType) {
  const toast: ToastItem = {
    id: nextToastId++,
    message,
    type,
  };

  for (const listener of toastListeners) {
    listener(toast);
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Something went wrong.';
}

function getResponseErrorMessage(response: Response, fallback: string) {
  return response.clone().text().then((text) => {
    if (!text) {
      return fallback;
    }

    try {
      const data = JSON.parse(text);
      if (typeof data === 'string') {
        return data;
      }

      if (data?.error) {
        return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      }

      if (data?.message) {
        return typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
      }
    } catch {
      return text.trim() || fallback;
    }

    return text.trim() || fallback;
  });
}

export const toast = {
  success(message: string) {
    emitToast(message, 'success');
  },
  error(message: string) {
    emitToast(message, 'error');
  },
  info(message: string) {
    emitToast(message, 'info');
  },
  warning(message: string) {
    emitToast(message, 'warning');
  },
};

export function subscribeToasts(listener: ToastListener) {
  toastListeners.add(listener);
  return () => toastListeners.delete(listener);
}

export interface ApiFetchInit extends RequestInit {
  toast?: boolean;
}

export async function apiFetch(input: RequestInfo | URL, init: ApiFetchInit = {}) {
  const { toast: shouldToast = true, ...fetchInit } = init;

  try {
    const response = await fetch(input, fetchInit);

    if (!response.ok && shouldToast) {
      const fallbackMessage = `Request failed (${response.status})`;
      const message = await getResponseErrorMessage(response, fallbackMessage);
      toast.error(message);
    }

    return response;
  } catch (error) {
    if (shouldToast) {
      toast.error(getErrorMessage(error));
    }

    throw error;
  }
}

export function markdownToHtml(markdown: string): string {
    if (!markdown) return '';
    markdown = normalizeFormattingMarkup(markdown);
    markdown = markdown.replace(/\r\n|\r/g, '\n');
    const lines = markdown.split('\n');
    return renderMarkdownLines(lines);
  }

function normalizeFormattingMarkup(markdown: string): string {
    let result = markdown;
    result = result.replace(/<div\s+class=["']text-center["']\s*>/gi, ':::center');
    result = result.replace(/<div\s+class=["']text-right["']\s*>/gi, ':::right');
    result = result.replace(/<div\s+class=["']text-left["']\s*>/gi, ':::left');
    result = result.replace(/<\/div>/gi, ':::');
    return result;
}

function renderMarkdownLines(lines: string[]): string {
    const html: string[] = [];
    let paragraph: string[] = [];
    let inList = false;
    let inCode = false;
    let codeLines: string[] = [];
    let inAlignBlock = false;
    let alignClass = '';
    let alignLines: string[] = [];

    const flushParagraph = () => {
      if (paragraph.length === 0) return;

      let formatted = formatInline(paragraph.join('\n'));
      formatted = formatted.replace(/(^|\n)( +)/g, (m) => {
        return m[0] === '\n' ? '\n' + '&nbsp;'.repeat(m.length - 1) : m;
      });
      formatted = formatted.replace(/\n/g, '<br />');

      html.push(`<p>${formatted}</p>`);
      paragraph = [];
    };

    const closeList = () => {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
    };

    const closeAlignBlock = () => {
      if (!inAlignBlock) return;

      html.push(`<div class="${alignClass}">${renderMarkdownLines(alignLines)}</div>`);
      inAlignBlock = false;
      alignClass = '';
      alignLines = [];
    };

    for (const line of lines) {
      if (!inAlignBlock) {
        const alignMatch = /^:::(center|right|left)\s*$/i.exec(line.trim());
        if (alignMatch) {
          flushParagraph();
          closeList();
          inAlignBlock = true;
          alignClass = `text-${alignMatch[1].toLowerCase()}`;
          alignLines = [];
          continue;
        }
      }

      if (inAlignBlock) {
        if (line.trim() === ':::') {
          closeAlignBlock();
        } else {
          alignLines.push(line);
        }
        continue;
      }

      if (line.trim() === '```') {
        if (inCode) {
          html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
          codeLines = [];
          inCode = false;
        } else {
          flushParagraph();
          closeList();
          inCode = true;
        }
        continue;
      }

      if (inCode) {
        codeLines.push(line);
        continue;
      }

      const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
      if (headingMatch) {
        flushParagraph();
        closeList();
        const level = headingMatch[1].length;
        html.push(`<h${level}>${formatInline(headingMatch[2].trim())}</h${level}>`);
        continue;
      }

      const listMatch = /^[-*]\s+(.+)$/.exec(line);
      if (listMatch) {
        flushParagraph();
        if (!inList) {
          html.push('<ul>');
          inList = true;
        }
        html.push(`<li>${formatInline(listMatch[1].trim())}</li>`);
        continue;
      }

      if (line.trim() === '') {
        flushParagraph();
        closeList();
        continue;
      }

      paragraph.push(line);
    }

    if (inAlignBlock) {
      closeAlignBlock();
    }

    if (inCode) {
      html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    }

    flushParagraph();
    closeList();

    return html.join('\n');
}

function formatInline(text: string): string {
    text = escapeHtml(text);
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    text = text.replace(/==([^=]+)==/g, '<span class="text-underline">$1</span>');
    text = text.replace(/\+\+([^+]+)\+\+/g, '<span class="text-underline">$1</span>');
    text = text.replace(/__([^_]+)__/g, '<span class="text-underline">$1</span>');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return text;
}

function escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
}