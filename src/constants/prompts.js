export const SYSTEM_PROMPTS = {
  universal: `You are an advanced AI research assistant. Your task is to assist the user with their research queries, writing, formatting, analysis, and other tasks accurately and professionally.
- Always provide clear, well-structured, and factual responses.
- Maintain a professional tone unless the user requests otherwise.
- Format your response in clean markdown with proper headings, paragraphs, and structure when appropriate.
- IMPORTANT: Always respond in the same language as the input text.`
};

export const WELCOME_PROMPTS = [
  {
    title: 'Parafrase Teks',
    description: 'Tempelkan teks riset Anda untuk mendapatkan versi parafrase yang akurat',
    icon: 'RefreshCw',
    prompt: '/prfrs '
  },
  {
    title: 'Humanisasi Teks',
    description: 'Ubah teks AI menjadi tulisan yang lebih natural dan manusiawi',
    icon: 'UserCheck',
    prompt: '/hmz '
  },
  {
    title: 'Review Akademik',
    description: 'Perbaiki gaya penulisan agar sesuai standar akademik',
    icon: 'GraduationCap',
    prompt: '/rvw '
  }
];
