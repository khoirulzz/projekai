export const API_URL = (import.meta.env.VITE_WORKER_URL || 'https://young-heart-a562.skripzy-app.workers.dev').replace(/\/$/, '');

export async function sendMessage(messages, mode = 'paraphrase', model = 'deepseek-v4-pro', onChunk, maxRetries = 3) {
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, mode, model }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Throw an object so we can catch and analyze it in the retry block
        throw { status: response.status, data: errorData };
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
              console.warn('Failed to parse chunk:', data);
            }
          }
        }
      }

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
      
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) {
        let errorMsg = '';
        if (err.status) {
          errorMsg = `Gagal setelah ${maxRetries}x percobaan (Error HTTP ${err.status}).`;
          if (err.status === 429) errorMsg += '\nServer sedang penuh (Rate Limit). Coba tunggu sebentar ya.';
          else if (err.status === 500) errorMsg += '\nTerjadi kesalahan di server penyedia AI (Internal Server Error).';
          else if (err.status === 404) errorMsg += '\nEndpoint atau model tidak ditemukan.';
          
          if (err.data?.error) errorMsg += `\nDetail: ${err.data.error}`;
        } else {
          errorMsg = `Gagal setelah ${maxRetries}x percobaan.\nDetail: ${err.message || 'Koneksi terputus/jaringan tidak stabil.'}`;
        }
        throw new Error(errorMsg);
      }
      
      // Notify UI about retrying if possible (via chunk)
      onChunk?.(`[Koneksi terputus/Error. Mencoba ulang (Percobaan ${attempt}/${maxRetries})...]`);
      
      // Delay before retrying (exponential backoff: 2s, 4s, 6s)
      await new Promise(resolve => setTimeout(resolve, attempt * 2000));
    }
  }
}

export async function checkHealth() {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
