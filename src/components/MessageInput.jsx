import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Paperclip, X, FileText, Check, AlertCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import { WRITING_MODELS } from '../constants/models';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function MessageInput({ onSend, isLoading, selectedModel, onModelChange, skills }) {
  const [text, setText] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [filteredSkills, setFilteredSkills] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [parseJobs, setParseJobs] = useState([]);
  const textareaRef = useRef(null);
  const highlighterRef = useRef(null);
  const fileInputRef = useRef(null);

  const selectedModelMeta = WRITING_MODELS.find((model) => model.value === selectedModel);

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
        (skill) =>
          (skill.tag || '').toLowerCase().includes(query) ||
          (skill.title || '').toLowerCase().includes(query)
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

  const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes) || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const normalizeText = (value) =>
    value
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();

  const updateParseJob = (id, patch) => {
    setParseJobs((prev) => prev.map((job) => (job.id === id ? { ...job, ...patch } : job)));
  };

  const getPdfPageText = async (page) => {
    const textContent = await page.getTextContent({ includeMarkedContent: true });
    const items = textContent.items
      .filter((item) => typeof item.str === 'string' && item.str.trim())
      .map((item) => ({
        text: item.str,
        x: item.transform?.[4] || 0,
        y: item.transform?.[5] || 0,
        width: item.width || 0,
        height: item.height || 0,
      }))
      .sort((a, b) => {
        const yDelta = b.y - a.y;
        if (Math.abs(yDelta) > 2) return yDelta;
        return a.x - b.x;
      });

    const lines = [];
    let currentLine = [];
    let currentY = null;

    items.forEach((item) => {
      if (currentY === null || Math.abs(item.y - currentY) <= Math.max(2, item.height * 0.35)) {
        currentLine.push(item);
        currentY = currentY === null ? item.y : (currentY + item.y) / 2;
        return;
      }

      lines.push(currentLine);
      currentLine = [item];
      currentY = item.y;
    });

    if (currentLine.length > 0) lines.push(currentLine);

    return lines
      .map((line) => {
        const sortedLine = line.sort((a, b) => a.x - b.x);
        return sortedLine.reduce((result, item, index) => {
          if (index === 0) return item.text;
          const previous = sortedLine[index - 1];
          const gap = item.x - (previous.x + previous.width);
          const separator = gap > Math.max(4, previous.height * 0.25) ? ' ' : '';
          return `${result}${separator}${item.text}`;
        }, '');
      })
      .join('\n');
  };

  const readPdfContent = async (file, jobId) => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
      disableAutoFetch: false,
      disableStream: false,
    });
    const pdf = await loadingTask.promise;
    const pages = [];

    updateParseJob(jobId, { totalPages: pdf.numPages, detail: `0/${pdf.numPages} halaman` });

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const pageText = await getPdfPageText(page);
      pages.push(`--- Halaman ${pageNumber} ---\n${pageText || '[Halaman tanpa teks terbaca]'}`);
      updateParseJob(jobId, {
        progress: Math.round((pageNumber / pdf.numPages) * 100),
        detail: `${pageNumber}/${pdf.numPages} halaman`,
      });
    }

    return {
      content: normalizeText(pages.join('\n\n')),
      warnings: pages.some((page) => page.includes('[Halaman tanpa teks terbaca]'))
        ? ['Sebagian halaman tidak memiliki teks terbaca. PDF hasil scan tetap butuh OCR terpisah.']
        : [],
      totalPages: pdf.numPages,
    };
  };

  const readDocxContent = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return {
      content: normalizeText(result.value || ''),
      warnings: (result.messages || []).map((message) => message.message).filter(Boolean),
    };
  };

  const readTextLikeContent = async (file) => ({
    content: normalizeText(await file.text()),
    warnings: [],
  });

  const readFileContent = async (file, jobId) => {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    try {
      if (ext === 'pdf') {
        return await readPdfContent(file, jobId);
      } 
      if (ext === 'docx') {
        updateParseJob(jobId, { progress: 45, detail: 'Membaca struktur Word' });
        const result = await readDocxContent(file);
        updateParseJob(jobId, { progress: 100, detail: 'Selesai' });
        return result;
      }

      if (ext === 'doc') {
        return {
          content: '',
          warnings: ['Format .doc lama belum bisa diparse di browser. Simpan ulang sebagai .docx lalu unggah kembali.'],
        };
      }

      updateParseJob(jobId, { progress: 80, detail: 'Membaca teks' });
      const result = await readTextLikeContent(file);
      updateParseJob(jobId, { progress: 100, detail: 'Selesai' });
      return result;
    } catch (e) {
      console.error('File parsing error', e);
      return {
        content: '',
        warnings: [`Gagal memparse ${file.name}: ${e.message || 'format tidak terbaca'}`],
      };
    }
  };

  const parseFiles = async (files) => {
    if (!files.length) return;
    setIsUploading(true);
    const jobs = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      size: file.size,
      status: 'queued',
      progress: 0,
      detail: 'Menunggu',
      warning: '',
    }));
    setParseJobs((prev) => [...jobs, ...prev].slice(0, 6));

    const newAtts = [];
    for (const [index, file] of files.entries()) {
      const job = jobs[index];
      updateParseJob(job.id, { status: 'parsing', progress: 5, detail: 'Memulai parser' });
      const result = await readFileContent(file, job.id);
      const charCount = result.content.length;
      const warnings = result.warnings || [];
      const isEmpty = charCount === 0;

      updateParseJob(job.id, {
        status: isEmpty ? 'warning' : 'done',
        progress: 100,
        detail: isEmpty ? 'Tidak ada teks terbaca' : `${charCount.toLocaleString('id-ID')} karakter`,
        warning: warnings[0] || '',
        totalPages: result.totalPages,
      });

      if (!isEmpty) {
        newAtts.push({
          name: file.name,
          content: result.content,
          size: file.size,
          charCount,
          warnings,
          totalPages: result.totalPages,
        });
      }
    }

    if (newAtts.length > 0) {
      setAttachments(prev => [...prev, ...newAtts]);
    }
    setIsUploading(false);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    await parseFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e) => {
    const pasteText = e.clipboardData.getData('text');
    if (pasteText && pasteText.length > 2000) {
      e.preventDefault();
      const content = normalizeText(pasteText);
      setAttachments(prev => [...prev, {
        name: `Pasted_Text_${Date.now().toString().slice(-4)}.txt`,
        content,
        size: new Blob([content]).size,
        charCount: content.length,
        warnings: [],
      }]);
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
    
    await parseFiles(files);
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
        const matched = (skills || []).some((skill) => (skill.tag || '').toLowerCase() === query);
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
        <div className="drop-overlay">
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
            <div className="attachment-strip">
              {attachments.map((att, i) => (
                <div key={i} className="attachment-chip">
                  <FileText size={14} />
                  <span>{att.name}</span>
                  <small>{att.charCount?.toLocaleString('id-ID') || 0} karakter</small>
                  <button onClick={() => removeAttachment(i)} title="Hapus lampiran">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {parseJobs.length > 0 && (
            <div className="parse-status-list">
              {parseJobs.map((job) => (
                <div key={job.id} className={`parse-status-item ${job.status}`}>
                  <div className="parse-status-icon">
                    {job.status === 'done' ? <Check size={14} /> : job.status === 'warning' ? <AlertCircle size={14} /> : <Sparkles size={14} className="animate-pulse" />}
                  </div>
                  <div className="parse-status-main">
                    <div className="parse-status-top">
                      <span>{job.name}</span>
                      <small>{formatBytes(job.size)}</small>
                    </div>
                    <div className="parse-progress-track">
                      <div className="parse-progress-fill" style={{ width: `${job.progress}%` }} />
                    </div>
                    <div className="parse-status-detail">
                      {job.detail}{job.warning ? ` · ${job.warning}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="input-main">
            <button 
              className="msg-action-btn" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isLoading}
              title="Unggah file"
            >
              <Paperclip size={18} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              multiple
              accept=".pdf,.doc,.docx,.txt,.md,.js,.py,.html,.css,.json,.csv"
              onChange={handleFileUpload} 
            />
            <div className="input-editor">
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
                placeholder="Tulis draf, instruksi, atau tempel materi riset..."
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
                {WRITING_MODELS.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
              <span className="model-note">{selectedModelMeta?.note}</span>
            </div>
            <span>{attachments.length} file</span>
          </div>
        </div>
      </div>
    </div>
  );
}
