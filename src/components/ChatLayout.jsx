import { useState, useCallback, useEffect } from 'react';
import {
  PanelLeftClose,
  PanelLeft,
  Plus,
  FileText,
  Settings,
  Trash2,
  X,
  Moon,
  Sun
} from 'lucide-react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import DocumentPreview from './DocumentPreview';
import WelcomeScreen from './WelcomeScreen';
import SkillManager from './SkillManager';
import { sendMessage } from '../services/api';
import { SYSTEM_PROMPTS } from '../constants/prompts';
import { useSkills } from '../hooks/useSkills';
import { DEFAULT_MODEL, WRITING_MODELS } from '../constants/models';

export default function ChatLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [chats, setChats] = useState(() => {
    try {
      const saved = localStorage.getItem('chatHistory');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      console.error('Failed to parse chatHistory from localStorage');
    }
    return [{ id: 1, title: 'Chat Baru', messages: [] }];
  });

  const [activeChatId, setActiveChatId] = useState(() => {
    try {
      const saved = localStorage.getItem('chatHistory');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[parsed.length - 1].id;
        }
      }
    } catch {
      // Keep the initial chat when saved history cannot be parsed.
    }
    return 1;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [docContent, setDocContent] = useState('');
  const [docPanelOpen, setDocPanelOpen] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [skillModalOpen, setSkillModalOpen] = useState(false);

  const { skills, addSkill, updateSkill, deleteSkill } = useSkills();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chats));
  }, [chats]);

  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const activeModel = WRITING_MODELS.find((model) => model.value === selectedModel);
  const displayMessages = activeChat ? [...activeChat.messages] : [];

  if (streamingContent && isLoading) {
    displayMessages.push({ role: 'assistant', content: streamingContent });
  }

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const updateChatMessages = useCallback((chatId, newMessages) => {
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== chatId) return chat;

        const firstUserMessage = newMessages.find((message) => message.role === 'user');
        const title = firstUserMessage
          ? firstUserMessage.content.slice(0, 40) + (firstUserMessage.content.length > 40 ? '...' : '')
          : chat.title;

        return { ...chat, messages: newMessages, title };
      })
    );
  }, []);

  const handleSend = useCallback(
    async (text, attachments = []) => {
      if (!activeChat) return;

      let finalContent = text;

      if (attachments.length > 0) {
        attachments.forEach((attachment) => {
          finalContent += `\n\n[FILE: ${attachment.name}]\n${attachment.content}`;
        });
      }

      const userMsg = { role: 'user', content: finalContent, attachments, rawText: text };
      const newMessages = [...activeChat.messages, userMsg];
      updateChatMessages(activeChatId, newMessages);

      setIsLoading(true);
      setStreamingContent('');

      try {
        const lowerText = text.toLowerCase();
        const activeSkills = (skills || []).filter((skill) =>
          skill.tag && lowerText.includes(skill.tag.toLowerCase())
        );

        let baseSystemPrompt = SYSTEM_PROMPTS.universal;

        if (activeSkills.length > 0) {
          baseSystemPrompt = `${baseSystemPrompt}\n\n[USER REQUESTED INSTRUCTIONS]\n${activeSkills
            .map((skill) => `=== ${skill.title} ===\n${skill.content}`)
            .join('\n\n')}`;
        }

        const apiMessages = [
          { role: 'system', content: baseSystemPrompt },
          ...newMessages.map((message) => ({ role: message.role, content: message.content })),
        ];

        const result = await sendMessage(apiMessages, 'universal', selectedModel, (partialText) => {
          setStreamingContent(partialText);
        });

        const aiMsg = { role: 'assistant', content: result || streamingContent };
        updateChatMessages(activeChatId, [...newMessages, aiMsg]);
      } catch (err) {
        console.error('API Error:', err);
        const errorMsg = {
          role: 'assistant',
          content: `**Pesan Sistem:**\n${err.message}`,
        };
        updateChatMessages(activeChatId, [...newMessages, errorMsg]);
      } finally {
        setIsLoading(false);
        setStreamingContent('');
      }
    },
    [activeChat, activeChatId, updateChatMessages, streamingContent, selectedModel, skills]
  );

  const handleNewChat = () => {
    const newId = Date.now();
    setChats((prev) => [...prev, { id: newId, title: 'Chat Baru', messages: [] }]);
    setActiveChatId(newId);
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  const handleDeleteChat = (chatId) => {
    const nextChats = chats.filter((chat) => chat.id !== chatId);

    if (nextChats.length === 0) {
      const newId = Date.now();
      setChats([{ id: newId, title: 'Chat Baru', messages: [] }]);
      setActiveChatId(newId);
      return;
    }

    setChats(nextChats);
    if (activeChatId === chatId) {
      setActiveChatId(nextChats[nextChats.length - 1].id);
    }
  };

  const handleOpenDocument = (content) => {
    setDocContent(content);
    setDocPanelOpen(true);
  };

  const handleSelectPrompt = (promptText) => {
    const input = document.getElementById('chat-input');
    if (!input) return;

    input.value = promptText;
    input.focus();
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    ).set;
    nativeInputValueSetter.call(input, promptText);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  return (
    <div className="app-layout">
      <aside className={`sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">R</div>
            <div>
              <span className="sidebar-logo-text">ResearchAI</span>
              <span className="sidebar-logo-subtext">Writing Studio</span>
            </div>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            title="Tutup sidebar"
          >
            <X size={18} />
          </button>
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
              onClick={() => {
                setActiveChatId(chat.id);
                if (window.innerWidth <= 768) setSidebarOpen(false);
              }}
            >
              <span className="sidebar-chat-title">{chat.title}</span>
              <button
                className="sidebar-chat-delete"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteChat(chat.id);
                }}
                title="Hapus chat"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <button
            className="sidebar-manage-skills"
            onClick={() => setSkillModalOpen(true)}
            id="manage-skills-btn"
          >
            <Settings size={16} />
            Kelola Skill
          </button>
          <div className="sidebar-skill-count">{skills.length} skill tersimpan</div>
        </div>
      </aside>
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Tutup sidebar"
        />
      )}

      <main className="main-content">
        <header className="chat-header">
          <div className="chat-header-left">
            <button
              className="toggle-sidebar-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              id="toggle-sidebar"
              title="Sidebar"
            >
              {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
            </button>
            <div>
              <div className="chat-header-title">Asisten Penulisan Riset</div>
              <div className="chat-header-subtitle">{activeModel?.label || selectedModel}</div>
            </div>
          </div>
          <div className="chat-header-right">
            <button className="header-icon-btn" onClick={toggleTheme} title="Tema">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="header-icon-btn"
              onClick={() => setDocPanelOpen(!docPanelOpen)}
              title="Panel dokumen"
              id="toggle-doc-panel"
            >
              <FileText size={18} />
            </button>
          </div>
        </header>

        {activeChat && activeChat.messages.length === 0 && !isLoading ? (
          <WelcomeScreen onSelectPrompt={handleSelectPrompt} skills={skills} />
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
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          skills={skills}
        />
      </main>

      <DocumentPreview
        isOpen={docPanelOpen}
        content={docContent}
        onClose={() => setDocPanelOpen(false)}
      />

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
