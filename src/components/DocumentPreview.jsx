import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Download, FileText, FileDown, ChevronDown } from 'lucide-react';
import { generateDocx, generatePdf } from '../services/documentGenerator';

export default function DocumentPreview({ isOpen, content, onClose }) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState('');
  const exportRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleExportDocx = async () => {
    try {
      setExporting(true);
      setShowExportMenu(false);
      const timestamp = new Date().toISOString().slice(0, 10);
      await generateDocx(content, `research-${timestamp}`);
      showToast('✅ Dokumen Word berhasil diunduh!');
    } catch (err) {
      console.error('DOCX export error:', err);
      showToast('❌ Gagal mengekspor Word');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExporting(true);
      setShowExportMenu(false);
      const timestamp = new Date().toISOString().slice(0, 10);
      await generatePdf(content, `research-${timestamp}`);
      showToast('✅ Dokumen PDF berhasil diunduh!');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('❌ Gagal mengekspor PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className={`document-panel ${isOpen ? 'open' : ''}`}>
        <div className="doc-panel-header">
          <div className="doc-panel-title">
            <FileText size={16} />
            Pratinjau Dokumen
          </div>
          <div className="doc-panel-actions">
            <div className="export-dropdown" ref={exportRef}>
              <button
                className="doc-action-btn primary"
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={exporting}
                id="export-button"
              >
                <Download size={14} />
                {exporting ? 'Mengekspor...' : 'Ekspor'}
                <ChevronDown size={12} />
              </button>
              {showExportMenu && (
                <div className="export-menu">
                  <button className="export-menu-item" onClick={handleExportDocx} id="export-docx-btn">
                    <FileText size={16} />
                    Unduh sebagai Word (.docx)
                  </button>
                  <button className="export-menu-item" onClick={handleExportPdf} id="export-pdf-btn">
                    <FileDown size={16} />
                    Unduh sebagai PDF (.pdf)
                  </button>
                </div>
              )}
            </div>
            <button className="close-panel-btn" onClick={onClose} id="close-doc-panel">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="doc-panel-body">
          <div className="doc-preview" id="doc-preview-content">
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            ) : (
              <p style={{ textAlign: 'center', color: '#999', fontStyle: 'italic' }}>
                Belum ada dokumen untuk ditampilkan. Klik ikon dokumen pada pesan AI untuk membukanya di sini.
              </p>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.includes('✅') ? 'success' : ''}`}>
          {toast}
        </div>
      )}
    </>
  );
}
