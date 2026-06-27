import { useState } from 'react';
import { X, Plus, Trash2, Edit3, Save } from 'lucide-react';

export default function SkillManager({ isOpen, onClose, skills, addSkill, updateSkill, deleteSkill }) {
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('');
  const [content, setContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleSaveNew = () => {
    if (!title || !tag || !content) return;
    // Format tag to ensure it starts with @ or /
    let formattedTag = tag.trim();
    if (!formattedTag.startsWith('@') && !formattedTag.startsWith('/')) {
      formattedTag = '/' + formattedTag;
    }

    addSkill({
      title: title.trim(),
      tag: formattedTag,
      content: content.trim()
    });

    setTitle('');
    setTag('');
    setContent('');
    setIsAdding(false);
  };

  const handleStartEdit = (skill) => {
    setEditingId(skill.id);
    setTitle(skill.title);
    setTag(skill.tag);
    setContent(skill.content);
  };

  const handleSaveEdit = (id) => {
    let formattedTag = tag.trim();
    if (!formattedTag.startsWith('@') && !formattedTag.startsWith('/')) {
      formattedTag = '/' + formattedTag;
    }

    updateSkill(id, {
      title: title.trim(),
      tag: formattedTag,
      content: content.trim()
    });

    setEditingId(null);
    setTitle('');
    setTag('');
    setContent('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setTitle('');
    setTag('');
    setContent('');
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content animate-fade-in">
        <div className="modal-header">
          <h3>Kelola Skill & Plugin (.md)</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            Tambahkan instruksi khusus Anda dalam format Markdown. Panggil instruksi ini di chat menggunakan tag <strong>@</strong> atau <strong>/</strong> (misal: <code>/paragraf</code> atau <code>@reviewer</code>).
          </p>

          {!isAdding && editingId === null && (
            <button className="add-skill-btn" onClick={() => setIsAdding(true)}>
              <Plus size={16} /> Tambah Skill Baru
            </button>
          )}

          {/* Form Tambah / Edit */}
          {(isAdding || editingId !== null) && (
            <div className="skill-form">
              <h4>{isAdding ? 'Tambah Skill Baru' : 'Edit Skill'}</h4>
              <div className="form-group">
                <label>Judul Skill</label>
                <input
                  type="text"
                  placeholder="Misal: Review Jurnal Akademik"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Tag Pemicu (Mulai dengan / atau @)</label>
                <input
                  type="text"
                  placeholder="Misal: /reviewer atau @jurnal"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Konten Instruksi (Markdown / Prompt)</label>
                <textarea
                  rows={6}
                  placeholder="Masukkan prompt sistem/instruksi khusus untuk skill ini. Format markdown didukung..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
              <div className="form-actions">
                <button className="btn-cancel" onClick={handleCancel}>Batal</button>
                <button
                  className="btn-save"
                  onClick={() => isAdding ? handleSaveNew() : handleSaveEdit(editingId)}
                  disabled={!title || !tag || !content}
                >
                  <Save size={14} /> Simpan
                </button>
              </div>
            </div>
          )}

          {/* Daftar Skill */}
          <div className="skills-list">
            <h4>Daftar Skill Aktif</h4>
            {skills.length === 0 ? (
              <p className="no-skills">Belum ada skill tambahan. Tambahkan skill baru di atas.</p>
            ) : (
              skills.map((skill) => (
                <div key={skill.id} className="skill-item">
                  <div className="skill-item-info">
                    <span className="skill-item-tag">{skill.tag}</span>
                    <span className="skill-item-title">{skill.title}</span>
                  </div>
                  <div className="skill-item-actions">
                    <button onClick={() => handleStartEdit(skill)} title="Edit">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => deleteSkill(skill.id)} className="btn-delete" title="Hapus">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
