const API_URL = (import.meta.env.VITE_WORKER_URL || 'https://young-heart-a562.skripzy-app.workers.dev').replace(/\/$/, '');

export async function sendMessage(messages, mode = 'paraphrase', model = 'deepseek-v4-pro', onChunk) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, mode, model }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: Request failed`);
  }

  // Handle streaming response
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    
    // Keep the last partial line in the buffer
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('data: ')) {
        const data = trimmedLine.slice(6).trim();
        if (data === '[DONE]') {
          return fullText;
        }
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            fullText += content;
            onChunk?.(fullText);
          }
        } catch (e) {
          // If JSON parse fails but it's not empty, it might be a malformed chunk
          // We shouldn't blindly append it to fullText to avoid UI corruption
          console.warn('Failed to parse chunk:', data);
        }
      }
    }
  }

  // Handle any remaining data in buffer if it's a complete message
  const finalLine = buffer.trim();
  if (finalLine.startsWith('data: ')) {
    const data = finalLine.slice(6).trim();
    if (data !== '[DONE]') {
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content || '';
        if (content) {
          fullText += content;
          onChunk?.(fullText);
        }
      } catch (e) {
        console.warn('Failed to parse final chunk:', data);
      }
    }
  }

  return fullText;
}

export async function checkHealth() {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
