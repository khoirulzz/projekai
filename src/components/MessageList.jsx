import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, FileText } from 'lucide-react';

function MessageBubble({ message, onOpenDocument }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy
      const textarea = document.createElement('textarea');
      textarea.value = message.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (message.role === 'user') {
    return (
      <div className="message message-user">
        <div className="message-content">{message.content}</div>
      </div>
    );
  }

  return (
    <div className="message message-ai">
      <div className="message-ai-avatar">R</div>
      <div className="message-body">
        <div className="message-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
        <div className="message-actions">
          <button
            className={`msg-action-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="Salin teks"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button
            className="msg-action-btn"
            onClick={() => onOpenDocument(message.content)}
            title="Buka sebagai dokumen"
          >
            <FileText size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <div className="message-ai-avatar">R</div>
      <div className="typing-dots">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}

export default function MessageList({ messages, isLoading, onOpenDocument }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="messages-container">
      <div className="messages-inner">
        {messages.map((msg, index) => (
          <MessageBubble
            key={index}
            message={msg}
            onOpenDocument={onOpenDocument}
          />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
