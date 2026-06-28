import { useState } from 'react';
import { RefreshCw, UserCheck, FileText, GraduationCap, Plus, MoreVertical, X } from 'lucide-react';
import { WELCOME_PROMPTS } from '../constants/prompts';

const iconMap = {
  RefreshCw: RefreshCw,
  UserCheck: UserCheck,
  FileText: FileText,
  GraduationCap: GraduationCap,
};

export default function WelcomeScreen({ onSelectPrompt, skills = [] }) {
  const [customShortcutId, setCustomShortcutId] = useState(localStorage.getItem('custom_shortcut_id') || null);
  const [isEditingCustom, setIsEditingCustom] = useState(false);

  const customSkill = skills.find(s => s.id === customShortcutId);

  const handleSetCustom = (id) => {
    setCustomShortcutId(id);
    localStorage.setItem('custom_shortcut_id', id);
    setIsEditingCustom(false);
  };

  const usedTags = ['/prfrs', '/hmz', '/rvw'];
  const availableSkills = skills.filter(s => !usedTags.includes(s.tag));

  return (
    <div className="welcome-screen">
      <div className="welcome-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.912 5.813a2 2 0 0 0 1.272 1.278L21 12l-5.816 1.91a2 2 0 0 0-1.275 1.278L12 21l-1.912-5.813a2 2 0 0 0-1.277-1.277L3 12l5.813-1.91a2 2 0 0 0 1.275-1.278L12 3z" />
        </svg>
      </div>
      <h1 className="welcome-title">ResearchAI Assistant</h1>
      <p className="welcome-subtitle">
        Asisten riset pintar Anda. Tanyakan apa saja, parafrase, humanisasi teks, atau gunakan sistem Skill dengan mengetikkan <strong>/</strong> atau <strong>@</strong> di kotak chat.
      </p>
      <div className="welcome-cards">
        {WELCOME_PROMPTS.map((item, index) => {
          const Icon = iconMap[item.icon] || FileText;
          return (
            <div
              key={index}
              className="welcome-card"
              onClick={() => onSelectPrompt(item.prompt)}
              id={`welcome-card-${index}`}
            >
              <div className="welcome-card-icon">
                <Icon size={18} />
              </div>
              <div className="welcome-card-title">{item.title}</div>
              <div className="welcome-card-desc">{item.description}</div>
            </div>
          );
        })}
        
        {/* Custom 4th Card */}
        {isEditingCustom ? (
          <div className="welcome-card custom-card editing">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div className="welcome-card-title" style={{ margin: 0 }}>Pilih Skill:</div>
              <button onClick={() => setIsEditingCustom(false)} style={{ color: 'var(--text-tertiary)' }}><X size={14} /></button>
            </div>
            <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
              {availableSkills.length > 0 ? availableSkills.map(s => (
                <div key={s.id} 
                     onClick={() => handleSetCustom(s.id)}
                     style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', borderRadius: '4px', marginBottom: '2px', background: 'var(--bg-tertiary)' }}>
                  {s.tag} - {s.title}
                </div>
              )) : (
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Tidak ada skill tambahan.</div>
              )}
            </div>
          </div>
        ) : customSkill ? (
          <div className="welcome-card" style={{ position: 'relative' }}>
            <div 
              style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px', cursor: 'pointer', zIndex: 2, color: 'var(--text-tertiary)' }}
              onClick={(e) => { e.stopPropagation(); setIsEditingCustom(true); }}
            >
              <MoreVertical size={16} />
            </div>
            <div onClick={() => onSelectPrompt(customSkill.tag + ' ')}>
              <div className="welcome-card-icon">
                <Plus size={18} />
              </div>
              <div className="welcome-card-title">{customSkill.title}</div>
              <div className="welcome-card-desc">Gunakan skill khusus {customSkill.tag}</div>
            </div>
          </div>
        ) : (
          <div 
            className="welcome-card" 
            onClick={() => setIsEditingCustom(true)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' }}
          >
            <Plus size={24} style={{ color: 'var(--text-tertiary)', marginBottom: '8px' }} />
            <div className="welcome-card-title" style={{ color: 'var(--text-secondary)' }}>Tambah Pintasan</div>
          </div>
        )}
      </div>
    </div>
  );
}
