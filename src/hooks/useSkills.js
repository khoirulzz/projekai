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
        const formatted = cloudSkills.map(s => ({
          id: s.name, // Use name as ID
          name: s.name,
          content: s.content
        }));
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
    const skillName = skill.name.endsWith('.md') ? skill.name : `${skill.name}.md`;
    const newSkill = { id: skillName, name: skillName, content: skill.content };
    
    // Update local state first (Optimistic update)
    const updated = [...skills.filter(s => s.id !== newSkill.id), newSkill];
    setSkills(updated);
    localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(updated));

    // Upload to KV
    try {
      await fetch(`${API_URL}/api/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: skillName, content: skill.content }),
      });
    } catch (e) {
      console.error('Failed to save skill to Cloudflare KV:', e);
    }
  };

  const updateSkill = async (id, updatedSkill) => {
    const skillName = updatedSkill.name.endsWith('.md') ? updatedSkill.name : `${updatedSkill.name}.md`;
    
    // If the name changed, we delete the old KV entry first, then put the new one
    const nameChanged = id !== skillName;

    // Optimistic update
    const updatedList = skills.map(s => s.id === id ? { ...s, id: skillName, name: skillName, content: updatedSkill.content } : s);
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
        body: JSON.stringify({ name: skillName, content: updatedSkill.content }),
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
