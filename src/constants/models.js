export const WRITING_MODELS = [
  {
    value: 'blackboxai/deepseek/deepseek-v4-pro',
    label: 'DeepSeek v4 Pro',
    note: 'default'
  },
  {
    value: 'blackboxai/openai/gpt-5.4-nano',
    label: 'GPT 5.4 Nano',
    note: 'cepat'
  },
  {
    value: 'blackboxai/meta/llama-3.1-70b',
    label: 'Llama 3.1 70B',
    note: 'versatile'
  },
  {
    value: 'blackboxai/google/gemini-3.5-flash',
    label: 'Gemini Flash',
    note: 'cepat & efisien'
  },
  {
    value: 'blackboxai/nvidia/nemotron-3-ultra',
    label: 'NVidia',
    note: 'beta'
  },
  {
    value: 'blackboxai/arcee-ai/trinity-large-thinking',
    label: 'Arce AI',
    note: 'beta'
  }
];

export const DEFAULT_MODEL = WRITING_MODELS[0].value;
