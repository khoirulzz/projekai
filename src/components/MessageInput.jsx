import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';

export default function MessageInput({ onSend, isLoading, mode, selectedModel, onModelChange, skills }) {
  const [text, setText] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [filteredSkills, setFilteredSkills] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [text]);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const words = textBeforeCursor.split(/\s+/);
    const lastWord = words[words.length - 1];

    if (lastWord && (lastWord.startsWith('@') || lastWord.startsWith('/'))) {
      const query = lastWord.toLowerCase();
      const matched = (skills || []).filter(
        (s) => s.tag.toLowerCase().includes(query) || s.title.toLowerCase().includes(query)
      );
      if (matched.length > 0) {
        setFilteredSkills(matched);
        setShowAutocomplete(true);
        setActiveIndex(0);
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  };

  const selectSkill = (skill) => {
    if (!textareaRef.current) return;
    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = text.slice(0, cursorPosition);
    const textAfterCursor = text.slice(cursorPosition);
    
    // Find the start of the last word
    const lastSpaceIndex = textBeforeCursor.lastIndexOf(' ');
    const newTextBefore = textBeforeCursor.slice(0, lastSpaceIndex + 1) + skill.tag + ' ';
    
    setText(newTextBefore + textAfterCursor);
    setShowAutocomplete(false);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = newTextBefore.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const handleSend = () => {
    if (text.trim() && !isLoading) {
      onSend(text.trim());
      setText('');
      setShowAutocomplete(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    if (showAutocomplete) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filteredSkills.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filteredSkills.length) % filteredSkills.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectSkill(filteredSkills[activeIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowAutocomplete(false);
      }
    } else {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const modeLabel = mode === 'universal' 
    ? '🤖 Universal' 
    : mode === 'paraphrase' 
      ? '✨ Parafrase' 
      : '🧑 Humanisasi';

  return (
    <div className="input-area" style={{ position: 'relative' }}>
      <div className="input-area-inner" style={{ position: 'relative' }}>
        {/* Autocomplete Dropdown */}
        {showAutocomplete && (
          <div className="skills-autocomplete">
            {filteredSkills.map((skill, index) => (
              <div
                key={skill.id}
                className={`autocomplete-item ${index === activeIndex ? 'active' : ''}`}
                onClick={() => selectSkill(skill)}
              >
                <span className="autocomplete-tag">{skill.tag}</span>
                <span className="autocomplete-title">{skill.title}</span>
              </div>
            ))}
          </div>
        )}

        <div className="input-container">
          <div className="input-main">
            <textarea
              ref={textareaRef}
              className="input-textarea"
              placeholder={
                mode === 'universal'
                  ? 'Tanyakan apa saja... Gunakan @ atau / untuk pemicu skill.'
                  : mode === 'paraphrase'
                    ? 'Tempelkan teks yang ingin diparafrase...'
                    : 'Tempelkan teks yang ingin dihumanisasi...'
              }
              value={text}
              onChange={handleTextChange}
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
            <span>Shift + Enter untuk baris baru | Ketik @ atau / untuk skill</span>
          </div>
        </div>
      </div>
    </div>
  );
}
