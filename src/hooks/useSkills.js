import { useState, useEffect } from 'react';

const SKILLS_STORAGE_KEY = 'research_ai_skills';

export function useSkills() {
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(SKILLS_STORAGE_KEY);
    if (saved) {
      try {
        setSkills(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse skills from localStorage', e);
      }
    }
  }, []);

  const saveSkills = (newSkills) => {
    setSkills(newSkills);
    localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(newSkills));
  };

  const addSkill = (skill) => {
    const newSkill = { ...skill, id: Date.now().toString() };
    saveSkills([...skills, newSkill]);
  };

  const updateSkill = (id, updatedSkill) => {
    saveSkills(skills.map(s => s.id === id ? { ...s, ...updatedSkill } : s));
  };

  const deleteSkill = (id) => {
    saveSkills(skills.filter(s => s.id !== id));
  };

  return { skills, addSkill, updateSkill, deleteSkill };
}
