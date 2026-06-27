import { RefreshCw, UserCheck, FileText, GraduationCap } from 'lucide-react';
import { WELCOME_PROMPTS } from '../constants/prompts';

const iconMap = {
  RefreshCw: RefreshCw,
  UserCheck: UserCheck,
  FileText: FileText,
  GraduationCap: GraduationCap,
};

export default function WelcomeScreen({ onSelectPrompt }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.912 5.813a2 2 0 0 0 1.272 1.278L21 12l-5.816 1.91a2 2 0 0 0-1.275 1.278L12 21l-1.912-5.813a2 2 0 0 0-1.277-1.277L3 12l5.813-1.91a2 2 0 0 0 1.275-1.278L12 3z" />
        </svg>
      </div>
      <h1 className="welcome-title">ResearchAI Assistant</h1>
      <p className="welcome-subtitle">
        Asisten riset Anda untuk parafrase dan humanisasi teks. Tempelkan teks riset Anda dan dapatkan hasil yang natural, 
        siap digunakan, dan bisa langsung diekspor ke Word atau PDF.
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
      </div>
    </div>
  );
}
