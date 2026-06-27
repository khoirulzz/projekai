import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';

export default function MessageInput({ onSend, isLoading, mode, selectedModel, onModelChange }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [text]);

  const handleSend = () => {
    if (text.trim() && !isLoading) {
      onSend(text.trim());
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const modeLabel = mode === 'paraphrase' ? '✨ Parafrase' : '🧑 Humanisasi';

  return (
    <div className="input-area">
      <div className="input-area-inner">
        <div className="input-container">
          <div className="input-main">
            <textarea
              ref={textareaRef}
              className="input-textarea"
              placeholder={
                mode === 'paraphrase'
                  ? 'Tempelkan teks yang ingin diparafrase...'
                  : 'Tempelkan teks yang ingin dihumanisasi...'
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
              id="chat-input"
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!text.trim() || isLoading}
              title="Kirim pesan"
              id="send-button"
            >
              {isLoading ? (
                <Sparkles size={18} className="animate-pulse" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
          <div className="input-footer">
            <div className="input-footer-left">
              <span className="input-mode-badge">
                <Sparkles size={10} />
                {modeLabel}
              </span>
              <select
                className="model-select"
                value={selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
                disabled={isLoading}
              >
                <option value="deepseek-v4-pro">DeepSeek v4 Pro</option>
                <option value="deepseek-v4-flash">DeepSeek v4 Flash</option>
                <option value="gpt-4.4-nano">GPT 4.4 Nano</option>
              </select>
            </div>
            <span>Shift + Enter untuk baris baru</span>
          </div>
        </div>
      </div>
    </div>
  );
}
