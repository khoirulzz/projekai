import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, FileText, ArrowDown } from 'lucide-react';

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

  const renderHighlightedText = (text) => {
    if (!text) return null;
    const words = text.split(/(\s+)/);
    return words.map((word, i) => {
      if (word.startsWith('@') || word.startsWith('/')) {
        return <span key={i} style={{ color: '#00d4aa', fontWeight: 'bold' }}>{word}</span>;
      }
      return <span key={i}>{word}</span>;
    });
  };

  if (message.role === 'user') {
    return (
      <div className="message message-user">
        {message.attachments && message.attachments.length > 0 && (
          <div className="message-attachments">
            {message.attachments.map((att, i) => (
              <div key={i} className="message-attachment">
                <FileText size={16} />
                <span>{att.name}</span>
              </div>
            ))}
          </div>
        )}
        {message.rawText && message.rawText.trim() ? (
          <div className="message-content">{renderHighlightedText(message.rawText)}</div>
        ) : !message.attachments || message.attachments.length === 0 ? (
          <div className="message-content">{renderHighlightedText(message.content)}</div>
        ) : null}
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
  const containerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    
    // Check if user is scrolled up (more than 100px from bottom)
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    
    setShowScrollButton(!isNearBottom);
    setIsAutoScrolling(isNearBottom);
  };

  useEffect(() => {
    if (isAutoScrolling) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isAutoScrolling]);

  const scrollToBottom = () => {
    setIsAutoScrolling(true);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="messages-container" ref={containerRef} onScroll={handleScroll}>
      <div className="messages-inner">
        {messages.map((msg, index) => (
          <MessageBubble
            key={index}
            message={msg}
            onOpenDocument={onOpenDocument}
          />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} className="messages-bottom" />
      </div>
      
      {showScrollButton && (
        <div className="scroll-bottom-wrap">
          <button 
            onClick={scrollToBottom}
            className="scroll-bottom-btn"
            title="Ke baris terbaru"
          >
            <ArrowDown size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
