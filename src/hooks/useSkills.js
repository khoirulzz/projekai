import { useState, useEffect } from 'react';
import { API_URL } from '../services/api';

const SKILLS_STORAGE_KEY = 'research_ai_skills';

export function useSkills() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load from localStorage first (for speed), then sync from KV
  useEffect(() => {
    const saved = localStorage.getItem(SKILLS_STORAGE_KEY);
    if (saved) {
      try {
        setSkills(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse skills from localStorage', e);
      }
    }
    
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/skills`);
      if (res.ok) {
        const cloudSkills = await res.json();
        // Cloud KV skills list [{name, content}] -> UI skills list [{id, name, content}]
        const formatted = cloudSkills.map(s => {
          let parsed;
          try {
            parsed = JSON.parse(s.content);
          } catch (e) {
            // fallback if it was plain text
            parsed = { title: s.name.replace('.md', ''), tag: '/' + s.name.replace('.md', '').toLowerCase().replace(/\s+/g, ''), content: s.content };
          }
          return {
            id: s.name,
            name: s.name,
            title: parsed.title || s.name.replace('.md', ''),
            tag: parsed.tag || '',
            content: parsed.content || ''
          };
        });
        setSkills(formatted);
        localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(formatted));
      }
    } catch (e) {
      console.error('Failed to fetch skills from Cloudflare KV:', e);
    } finally {
      setLoading(false);
    }
  };

  const addSkill = async (skill) => {
    const titleStr = skill.title || 'Untitled';
    const skillName = titleStr.endsWith('.md') ? titleStr : `${titleStr}.md`;
    const newSkill = { id: skillName, name: skillName, title: skill.title, tag: skill.tag, content: skill.content };
    
    // Update local state first (Optimistic update)
    const updated = [...skills.filter(s => s.id !== newSkill.id), newSkill];
    setSkills(updated);
    localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(updated));

    // Upload to KV
    try {
      await fetch(`${API_URL}/api/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: skillName, 
          content: JSON.stringify({ title: skill.title, tag: skill.tag, content: skill.content }) 
        }),
      });
    } catch (e) {
      console.error('Failed to save skill to Cloudflare KV:', e);
    }
  };

  const updateSkill = async (id, updatedSkill) => {
    const titleStr = updatedSkill.title || 'Untitled';
    const skillName = titleStr.endsWith('.md') ? titleStr : `${titleStr}.md`;
    
    // If the name changed, we delete the old KV entry first, then put the new one
    const nameChanged = id !== skillName;

    // Optimistic update
    const updatedList = skills.map(s => s.id === id ? { ...s, id: skillName, name: skillName, title: updatedSkill.title, tag: updatedSkill.tag, content: updatedSkill.content } : s);
    setSkills(updatedList);
    localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(updatedList));

    try {
      if (nameChanged) {
        // Delete old entry
        await fetch(`${API_URL}/api/skills?name=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
      }
      // Save new entry
      await fetch(`${API_URL}/api/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: skillName, 
          content: JSON.stringify({ title: updatedSkill.title, tag: updatedSkill.tag, content: updatedSkill.content }) 
        }),
      });
    } catch (e) {
      console.error('Failed to update skill in Cloudflare KV:', e);
    }
  };

  const deleteSkill = async (id) => {
    // Optimistic update
    const updated = skills.filter(s => s.id !== id);
    setSkills(updated);
    localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(updated));

    try {
      await fetch(`${API_URL}/api/skills?name=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Failed to delete skill from Cloudflare KV:', e);
    }
  };

  return { skills, loading, addSkill, updateSkill, deleteSkill, refreshSkills: fetchSkills };
}
