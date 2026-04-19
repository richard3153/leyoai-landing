/**
 * HF Space Gradio API 客户端
 *
 * 调用 HF Space 的 Gradio 接口：
 * 1. POST /call/{fn_name} → 获取 event_id
 * 2. GET  /call/{fn_name}/{event_id} → SSE 流式获取结果
 *
 * 超时控制：默认 55 秒（Vercel Hobby 最大 10s，Pro 最大 60s）
 */
import https from 'https';
import { SPACE_URLS, SPACE_FN, Product } from './supabase';

interface GradioCallResult {
  success: boolean;
  data?: string;   // 助手回复文本
  error?: string;
}

/**
 * 调用 HF Space Gradio API
 *
 * @param product  产品标识
 * @param message  用户消息
 * @param token    JWT token（传给 HF Space 做鉴权）
 * @param options  可选参数
 */
export async function callHFSpace(
  product: Product,
  message: string,
  token: string,
  options: {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    systemPrompt?: string;
    timeoutMs?: number;
  } = {},
): Promise<GradioCallResult> {
  const spaceUrl = SPACE_URLS[product];
  const fnName = SPACE_FN[product];

  if (!spaceUrl || !fnName) {
    return { success: false, error: `Unknown product: ${product}` };
  }

  const timeout = options.timeoutMs || 55000;

  try {
    // Step 1: 发起调用
    const callData = buildCallData(product, message, token, options);
    const eventId = await startCall(spaceUrl, fnName, callData, timeout);

    if (!eventId) {
      return { success: false, error: 'Failed to start Gradio call' };
    }

    // Step 2: 等待结果（SSE）
    const result = await pollResult(spaceUrl, fnName, eventId, timeout);
    return result;
  } catch (err: any) {
    if (err.message?.includes('timeout') || err.message?.includes('ETIMEDOUT')) {
      return { success: false, error: 'Request timed out — model inference too slow on CPU' };
    }
    return { success: false, error: err.message || 'Unknown error' };
  }
}

/** 构造 Gradio API 调用参数 */
function buildCallData(
  product: Product,
  message: string,
  token: string,
  opts: {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    systemPrompt?: string;
  },
): unknown[] {
  if (product === 'cyber') {
    // cyber: respond(message, history, system_prompt, temperature, top_p, max_tokens, token)
    return [
      message,
      [],  // empty history
      opts.systemPrompt || '你是一位专业的AI安全专家。帮助用户识别和预防网络安全威胁。专业、实用、简洁，用中文回复。',
      opts.temperature ?? 0.7,
      opts.topP ?? 0.9,
      opts.maxTokens ?? 64,
      token,
    ];
  }

  // video/flow/analytics: answer(question, token)
  return [message, token];
}

/** POST /call/{fn_name} → 返回 event_id */
function startCall(
  spaceUrl: string,
  fnName: string,
  data: unknown[],
  timeoutMs: number,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const url = new URL(`/call/${fnName}`, spaceUrl);
    const body = JSON.stringify({ data });

    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: Math.min(timeoutMs, 10000), // call start should be fast
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          try {
            const json = JSON.parse(chunks);
            resolve(json.event_id || null);
          } catch {
            resolve(null);
          }
        });
      },
    );

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

/** GET /call/{fn_name}/{event_id} → SSE 流式读取结果 */
function pollResult(
  spaceUrl: string,
  fnName: string,
  eventId: string,
  timeoutMs: number,
): Promise<GradioCallResult> {
  return new Promise((resolve, reject) => {
    const url = new URL(`/call/${fnName}/${eventId}`, spaceUrl);

    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: 'GET',
        headers: { 'Accept': 'text/event-stream' },
        timeout: timeoutMs,
      },
      (res) => {
        let buffer = '';
        let lastData: string | null = null;

        res.on('data', (chunk) => {
          buffer += chunk.toString();

          // Parse SSE events
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // keep incomplete line

          for (const line of lines) {
            if (line.startsWith('event: complete')) {
              // Next data line has the result
            }
            if (line.startsWith('data: ') && !line.startsWith('data: ')) {
              // skip
            }
            if (line.startsWith('data: ')) {
              try {
                lastData = line.slice(6);
              } catch {
                // skip
              }
            }
          }
        });

        res.on('end', () => {
          // Parse remaining buffer
          if (buffer.startsWith('data: ')) {
            try { lastData = buffer.slice(6); } catch {}
          }

          if (!lastData) {
            resolve({ success: false, error: 'No data in SSE response' });
            return;
          }

          try {
            const parsed = JSON.parse(lastData);

            // Gradio returns array of outputs
            // For respond: ["", [ChatMessage...]] → second element last item has content
            // For answer: "response text" or similar
            const text = extractResponseText(parsed, fnName);

            if (text) {
              resolve({ success: true, data: text });
            } else {
              resolve({ success: false, error: 'Could not extract response from Gradio output' });
            }
          } catch (err: any) {
            resolve({ success: false, error: `Parse error: ${err.message}` });
          }
        });
      },
    );

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

/** 从 Gradio 返回数据中提取助手回复文本 */
function extractResponseText(data: any, fnName: string): string | null {
  try {
    if (fnName === 'respond') {
      // respond returns: ["", [ChatMessage{role:"user",content:"..."}, ChatMessage{role:"assistant",content:"..."}]]
      if (Array.isArray(data) && data.length >= 2) {
        const chatMessages = data[1];
        if (Array.isArray(chatMessages)) {
          // Get last assistant message
          for (let i = chatMessages.length - 1; i >= 0; i--) {
            const msg = chatMessages[i];
            if (msg?.role === 'assistant' && msg?.content) {
              return msg.content;
            }
            // Gradio might serialize as [role, content] tuples
            if (Array.isArray(msg) && msg[0] === 'assistant') {
              return msg[1];
            }
          }
        }
      }
    }

    // answer returns: "response text" directly or similar
    if (typeof data === 'string') {
      return data;
    }

    // Fallback: try to find text in any reasonable structure
    if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item === 'string' && item.length > 0) {
          return item;
        }
        if (item?.content && typeof item.content === 'string') {
          return item.content;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}
