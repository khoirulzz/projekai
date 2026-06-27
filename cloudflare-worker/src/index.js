
const BLACKBOX_API_URL = 'https://api.blackbox.ai/chat/completions';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+/g, '/');
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';
    
    // CORS Headers
    const headers = {
      'Access-Control-Allow-Origin': allowedOrigin === '*' || origin === allowedOrigin ? origin : allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // Health check
    if (pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // SKILLS API Endpoints
    if (pathname === '/api/skills') {
      const kv = env.SKILLS;
      if (!kv) {
        return new Response(
          JSON.stringify({ error: 'KV Namespace SKILLS tidak terikat.' }),
          { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }

      // GET: Ambil semua skill
      if (request.method === 'GET') {
        try {
          const list = await kv.list();
          const skills = [];
          for (const key of list.keys) {
            const content = await kv.get(key.name);
            skills.push({ name: key.name, content });
          }
          return new Response(JSON.stringify(skills), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' },
          });
        }
      }

      // POST: Tambah / Update skill
      if (request.method === 'POST') {
        try {
          const { name, content } = await request.json();
          if (!name || !content) {
            return new Response(
              JSON.stringify({ error: 'name dan content wajib diisi.' }),
              { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
            );
          }
          await kv.put(name, content);
          return new Response(JSON.stringify({ success: true, name }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' },
          });
        }
      }

      // DELETE: Hapus skill
      if (request.method === 'DELETE') {
        try {
          const name = url.searchParams.get('name');
          if (!name) {
            return new Response(
              JSON.stringify({ error: 'parameter name wajib diisi.' }),
              { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
            );
          }
          await kv.delete(name);
          return new Response(JSON.stringify({ success: true, name }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Main chat endpoint
    if (pathname === '/api/chat' && request.method === 'POST') {
      try {
        const apiKey = env.BLACKBOX_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: 'API key belum dikonfigurasi. Jalankan: npx wrangler secret put BLACKBOX_API_KEY' }),
            { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
          );
        }

        const body = await request.json();
        const { messages, mode, model } = body;

        if (!messages || !Array.isArray(messages)) {
          return new Response(
            JSON.stringify({ error: 'Field "messages" wajib berupa array.' }),
            { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
          );
        }

        // Build the request to Blackbox API
        const blackboxPayload = {
          messages: messages,
          model: model || 'blackboxai/deepseek/deepseek-v4-pro',
          stream: true,
        };

        const apiResponse = await fetch(BLACKBOX_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(blackboxPayload),
        });

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          return new Response(
            JSON.stringify({
              error: `Blackbox API error: ${apiResponse.status}`,
              details: errorText
            }),
            { status: apiResponse.status, headers: { ...headers, 'Content-Type': 'application/json' } }
          );
        }

        // Stream the response back to the client
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();

        ctx.waitUntil(
          (async () => {
            try {
              const reader = apiResponse.body.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  await writer.write(new TextEncoder().encode('data: [DONE]\n\n'));
                  break;
                }
                await writer.write(value);
              }
            } catch (err) {
              console.error('Stream error:', err);
            } finally {
              await writer.close();
            }
          })()
        );

        return new Response(readable, {
          status: 200,
          headers: {
            ...headers,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'Internal server error', details: err.message }),
          { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 404 for unknown routes
    return new Response(
      JSON.stringify({ error: 'Not found', availableEndpoints: ['/health', '/api/chat'] }),
      { status: 404, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  },
};
