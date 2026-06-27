import { useState, useCallback } from 'react';
import {
  PanelLeftClose,
  PanelLeft,
  Plus,
  Sparkles,
  FileText,
  MessageSquare,
  Cpu,
  Smartphone,
} from 'lucide-react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import DocumentPreview from './DocumentPreview';
import WelcomeScreen from './WelcomeScreen';
import SkillManager from './SkillManager';
import { sendMessage } from '../services/api';
import { SYSTEM_PROMPTS } from '../constants/prompts';
import { useSkills } from '../hooks/useSkills';

export default function ChatLayout() {
  // State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode] = useState('universal'); // 'universal' | 'paraphrase' | 'humanize'
  const [chats, setChats] = useState([{ id: 1, title: 'Chat Baru', messages: [] }]);
  const [activeChatId, setActiveChatId] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [docContent, setDocContent] = useState('');
  const [docPanelOpen, setDocPanelOpen] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [selectedModel, setSelectedModel] = useState('deepseek-v4-pro');
  const [skillModalOpen, setSkillModalOpen] = useState(false);

  // Hook for custom skills
  const { skills, addSkill, updateSkill, deleteSkill } = useSkills();

  const activeChat = chats.find((c) => c.id === activeChatId);
  const displayMessages = activeChat ? [...activeChat.messages] : [];

  // If streaming, show partial AI message
  if (streamingContent && isLoading) {
    displayMessages.push({ role: 'assistant', content: streamingContent });
  }

  const updateChatMessages = useCallback((chatId, newMessages) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          const title =
            newMessages.length > 0 && newMessages[0].role === 'user'
              ? newMessages[0].content.slice(0, 40) + (newMessages[0].content.length > 40 ? '...' : '')
              : c.title;
          return { ...c, messages: newMessages, title };
        }
        return c;
      })
    );
  }, []);

  const handleSend = useCallback(
    async (text) => {
      if (!activeChat) return;

      const userMsg = { role: 'user', content: text };
      const newMessages = [...activeChat.messages, userMsg];
      updateChatMessages(activeChatId, newMessages);

      setIsLoading(true);
      setStreamingContent('');

      try {
        // Detect custom skills used in the input text
        const activeSkill = (skills || []).find((s) => text.toLowerCase().includes(s.tag.toLowerCase()));
        
        let baseSystemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.universal;
        
        if (activeSkill) {
          baseSystemPrompt = `${baseSystemPrompt}\n\n[USER REQUESTED CUSTOM SKILL: ${activeSkill.title}]\n${activeSkill.content}`;
        }

        const apiMessages = [
          { role: 'system', content: baseSystemPrompt },
          ...newMessages.map((m) => ({ role: m.role, content: m.content })),
        ];

        const result = await sendMessage(apiMessages, mode, selectedModel, (partialText) => {
          setStreamingContent(partialText);
        });

        const aiMsg = { role: 'assistant', content: result || streamingContent };
        updateChatMessages(activeChatId, [...newMessages, aiMsg]);
      } catch (err) {
        console.error('API Error:', err);
        const errorMsg = {
          role: 'assistant',
          content: `⚠️ **Error:** ${err.message}\n\nPastikan Cloudflare Worker Anda sudah aktif dan URL sudah dikonfigurasi di file \`.env\`.`,
        };
        updateChatMessages(activeChatId, [...newMessages, errorMsg]);
      } finally {
        setIsLoading(false);
        setStreamingContent('');
      }
    },
    [activeChat, activeChatId, mode, updateChatMessages, streamingContent, selectedModel, skills]
  );

  const handleNewChat = () => {
    const newId = Date.now();
    setChats((prev) => [...prev, { id: newId, title: 'Chat Baru', messages: [] }]);
    setActiveChatId(newId);
  };

  const handleOpenDocument = (content) => {
    setDocContent(content);
    setDocPanelOpen(true);
  };

  const handleSelectPrompt = (promptText) => {
    const input = document.getElementById('chat-input');
    if (input) {
      input.value = promptText + '\n\n';
      input.focus();
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      ).set;
      nativeInputValueSetter.call(input, promptText + '\n\n');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const modeLabel = mode === 'universal'
    ? '🤖 Mode Universal'
    : mode === 'paraphrase'
      ? '✨ Mode Parafrase'
      : '🧑 Mode Humanisasi';

  const modeSubtitle = mode === 'universal'
    ? 'Asisten riset serba guna untuk pertanyaan & analisis'
    : mode === 'paraphrase'
      ? 'Parafrase teks riset dengan akurat dan natural'
      : 'Ubah teks AI menjadi tulisan manusiawi';

  return (
    <div className="app-layout" style={{ height: '100dvh' }}>
      {/* Sidebar */}
      <aside className={`sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">R</div>
            <span className="sidebar-logo-text">ResearchAI</span>
          </div>
        </div>

        <button className="sidebar-new-chat" onClick={handleNewChat} id="new-chat-btn">
          <Plus size={16} />
          Chat Baru
        </button>

        <div className="sidebar-chats">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`sidebar-chat-item ${chat.id === activeChatId ? 'active' : ''}`}
              onClick={() => setActiveChatId(chat.id)}
            >
              {chat.title}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <button 
            className="sidebar-new-chat" 
            style={{ margin: '0 0 var(--space-md) 0', width: '100%', justifyContent: 'center' }}
            onClick={() => setSkillModalOpen(true)}
            id="manage-skills-btn"
          >
            ⚙️ Kelola Skill (.md)
          </button>
          
          <div className="sidebar-mode-selector" style={{ flexDirection: 'column', gap: '4px' }}>
            <button
              className={`mode-btn ${mode === 'universal' ? 'active' : ''}`}
              onClick={() => setMode('universal')}
              id="mode-universal"
              style={{ width: '100%', textAlign: 'left' }}
            >
              🤖 Universal
            </button>
            <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
              <button
                className={`mode-btn ${mode === 'paraphrase' ? 'active' : ''}`}
                onClick={() => setMode('paraphrase')}
                id="mode-paraphrase"
                style={{ flex: 1 }}
              >
                ✨ Parafrase
              </button>
              <button
                className={`mode-btn ${mode === 'humanize' ? 'active' : ''}`}
                onClick={() => setMode('humanize')}
                id="mode-humanize"
                style={{ flex: 1 }}
              >
                🧑 Humanize
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content" style={{ height: '100dvh' }}>
        <header className="chat-header">
          <div className="chat-header-left">
            <button
              className="toggle-sidebar-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              id="toggle-sidebar"
            >
              {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
            </button>
            <div>
              <div className="chat-header-title">{modeLabel}</div>
              <div className="chat-header-subtitle">{modeSubtitle}</div>
            </div>
          </div>
          <div className="chat-header-right">
            <button
              className="header-icon-btn"
              onClick={() => setDocPanelOpen(!docPanelOpen)}
              title="Toggle panel dokumen"
              id="toggle-doc-panel"
            >
              <FileText size={18} />
            </button>
          </div>
        </header>

        {activeChat && activeChat.messages.length === 0 && !isLoading ? (
          <WelcomeScreen onSelectPrompt={handleSelectPrompt} />
        ) : (
          <MessageList
            messages={displayMessages}
            isLoading={isLoading && !streamingContent}
            onOpenDocument={handleOpenDocument}
          />
        )}

        <MessageInput 
          onSend={handleSend} 
          isLoading={isLoading} 
          mode={mode} 
          selectedModel={selectedModel} 
          onModelChange={setSelectedModel} 
          skills={skills}
        />
      </main>

      {/* Document Preview Panel */}
      <DocumentPreview
        isOpen={docPanelOpen}
        content={docContent}
        onClose={() => setDocPanelOpen(false)}
      />

      {/* Custom Skills Manager Modal */}
      <SkillManager
        isOpen={skillModalOpen}
        onClose={() => setSkillModalOpen(false)}
        skills={skills}
        addSkill={addSkill}
        updateSkill={updateSkill}
        deleteSkill={deleteSkill}
      />
    </div>
  );
}
