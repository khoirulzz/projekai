import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Paperclip, X, FileText } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function MessageInput({ onSend, isLoading, selectedModel, onModelChange, skills }) {
  const [text, setText] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [filteredSkills, setFilteredSkills] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef(null);
  const highlighterRef = useRef(null);
  const fileInputRef = useRef(null);

  const presets = ['blackboxai/deepseek/deepseek-v4-pro', 'blackboxai/openai/gpt-5.4-nano', 'blackboxai/meta/llama-3.1-70b'];

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
      if (highlighterRef.current) {
        highlighterRef.current.style.height = textareaRef.current.style.height;
      }
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

  const readFileContent = async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    try {
      if (ext === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const strings = textContent.items.map(item => item.str);
          fullText += strings.join(' ') + '\n';
        }
        return fullText;
      } 
      if (ext === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
      }
      return await file.text();
    } catch (e) {
      console.error('File parsing error', e);
      return `[Error parsing ${file.name}]`;
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setIsUploading(true);
    const newAtts = [];
    for (const file of files) {
      const content = await readFileContent(file);
      newAtts.push({ name: file.name, content });
    }
    setAttachments(prev => [...prev, ...newAtts]);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e) => {
    const pasteText = e.clipboardData.getData('text');
    if (pasteText && pasteText.length > 2000) {
      e.preventDefault();
      setAttachments(prev => [...prev, { name: `Pasted_Text_${Date.now().toString().slice(-4)}.txt`, content: pasteText }]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    // Only set to false if leaving the main container
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    
    setIsUploading(true);
    const newAtts = [];
    for (const file of files) {
      const content = await readFileContent(file);
      newAtts.push({ name: file.name, content });
    }
    setAttachments(prev => [...prev, ...newAtts]);
    setIsUploading(false);
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSend = () => {
    if ((text.trim() || attachments.length > 0) && !isLoading) {
      onSend(text.trim(), attachments);
      setText('');
      setAttachments([]);
      setShowAutocomplete(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        if (highlighterRef.current) highlighterRef.current.style.height = 'auto';
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

  const handleScroll = (e) => {
    if (highlighterRef.current) {
      highlighterRef.current.scrollTop = e.target.scrollTop;
      highlighterRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const renderHighlightedText = () => {
    if (!text) return null;
    
    // Split by words to find tags
    const words = text.split(/(\s+)/);
    return words.map((word, i) => {
      if (word.startsWith('@') || word.startsWith('/')) {
        const query = word.toLowerCase();
        const matched = (skills || []).some(s => s.tag.toLowerCase() === query);
        if (matched) {
          return <span key={i} style={{ color: '#00d4aa', fontWeight: 'bold' }}>{word}</span>;
        }
      }
      return <span key={i}>{word}</span>;
    });
  };

  return (
    <div 
      className="input-area" 
      style={{ position: 'relative' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(124, 92, 252, 0.1)',
          backdropFilter: 'blur(2px)',
          border: '2px dashed var(--accent-primary)',
          borderRadius: 'var(--radius-lg)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-primary)',
          fontWeight: 'bold',
          fontSize: '16px'
        }}>
          Lepaskan file di sini untuk mengunggah
        </div>
      )}
      <div className="input-area-inner" style={{ position: 'relative' }}>
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
          {attachments.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', padding: '8px 12px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-medium)' }}>
              {attachments.map((att, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-glass)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <FileText size={14} />
                  <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                  <button onClick={() => removeAttachment(i)} style={{ marginLeft: '4px', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="input-main">
            <button 
              className="msg-action-btn" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isLoading}
              title="Unggah File (Word, PDF, TXT, Code)"
              style={{ padding: '0 8px' }}
            >
              <Paperclip size={18} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              multiple
              accept=".pdf,.docx,.txt,.md,.js,.py,.html,.css,.json,.csv"
              onChange={handleFileUpload} 
            />
            <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
              <div
                ref={highlighterRef}
                className="input-textarea"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  color: 'var(--text-primary)',
                  pointerEvents: 'none',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  overflowY: 'auto',
                  zIndex: 0
                }}
              >
                {renderHighlightedText()}
                {/* Trailing space to ensure cursor height matches */}
                {text.endsWith('\n') ? <br /> : null}
              </div>
              <textarea
                ref={textareaRef}
                className="input-textarea"
                style={{
                  background: 'transparent',
                  color: 'transparent',
                  caretColor: 'var(--text-primary)',
                  zIndex: 1,
                }}
                placeholder="Tanyakan apa saja... Gunakan @ atau / untuk pemicu skill. (Paste teks panjang >2000 char untuk file instan)"
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onScroll={handleScroll}
                rows={1}
                disabled={isLoading || isUploading}
                id="chat-input"
              />
            </div>
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={(!text.trim() && attachments.length === 0) || isLoading || isUploading}
              title="Kirim pesan"
              id="send-button"
            >
              {isLoading || isUploading ? (
                <Sparkles size={18} className="animate-pulse" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
          <div className="input-footer">
            <div className="input-footer-left">
              <select
                className="model-select"
                value={selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
                disabled={isLoading || isUploading}
              >
                <option value="blackboxai/deepseek/deepseek-v4-pro">DeepSeek v4 Pro</option>
                <option value="blackboxai/openai/gpt-5.4-nano">GPT 5.4 Nano</option>
                <option value="blackboxai/meta/llama-3.1-70b">Llama 3.1 70B</option>
              </select>
            </div>
            <span>Shift + Enter untuk baris baru | Ketik @ atau / untuk skill</span>
          </div>
        </div>
      </div>
    </div>
  );
}
