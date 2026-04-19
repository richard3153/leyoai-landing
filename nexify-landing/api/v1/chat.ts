/**
 * POST /api/v1/chat — OpenAI 兼容的 Chat Completions 端点
 * 
 * 修复版：添加详细日志调试 HF Space 调用
 */
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const SPACE_URLS: Record<string, string> = {
  cyber: 'https://ffzwai-leyoai-cyber-assistant.hf.space',
  video: 'https://ffzwai-leyoai-video-safety.hf.space',
  flow: 'https://ffzwai-leyoai-flow-assistant.hf.space',
  analytics: 'https://ffzwai-leyoai-analytics-assistant.hf.space',
};

const QUOTAS: Record<string, Record<string, number>> = {
  free: { cyber: 100, video: 500, flow: 500, analytics: 1000 },
  starter: { cyber: 5000, video: 5000, flow: 5000, analytics: 10000 },
  pro: { cyber: 30000, video: 30000, flow: 30000, analytics: 50000 },
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(`[chat] ${msg}`);
    logs.push(msg);
  };

  try {
    // 1. 解析 API Key
    const authHeader = req.headers.authorization || '';
    const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    
    if (!apiKey) {
      return res.status(401).json({
        error: { message: 'Missing API key', type: 'authentication_error' }
      });
    }

    // 2. 初始化 Supabase
    const supabaseUrl = process.env.SUPABASE_URL || 'https://drbeynfabvbydukjajrz.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceKey) {
      return res.status(500).json({
        error: { message: 'Server configuration error', type: 'server_error' }
      });
    }
    
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. 验证 API Key
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, name, is_active')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      return res.status(401).json({
        error: { message: 'Invalid API key', type: 'authentication_error' }
      });
    }

    // 4. 获取用户信息
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, plan')
      .eq('id', keyData.user_id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({
        error: { message: 'User not found', type: 'authentication_error' }
      });
    }

    // 5. 验证请求参数
    const { model, messages, stream = false, temperature = 0.7, max_tokens = 512 } = req.body || {};
    const validModels = ['cyber', 'video', 'flow', 'analytics'];
    
    if (!model || !validModels.includes(model)) {
      return res.status(400).json({
        error: { message: `Invalid model. Must be one of: ${validModels.join(', ')}`, type: 'invalid_request_error' }
      });
    }

    // 6. 配额检查
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const { count: usageCount } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('product', model)
      .gte('created_at', monthStart.toISOString());

    const planQuota = QUOTAS[profile.plan]?.[model] || QUOTAS.free[model];
    const currentUsage = usageCount || 0;
    
    if (currentUsage >= planQuota) {
      return res.status(429).json({
        error: {
          message: `Quota exceeded. Used ${currentUsage}/${planQuota} requests this month.`,
          type: 'rate_limit_error',
          code: 'quota_exceeded'
        }
      });
    }

    // 7. 获取用户消息
    const lastUserMsg = [...(messages || [])].reverse().find((m: any) => m.role === 'user');
    const userMessage = lastUserMsg?.content || 'Hello';
    
    // 8. 生成 JWT token
    const jwtSecret = process.env.LEYOAI_JWT_SECRET;
    log(`JWT_SECRET exists: ${!!jwtSecret}`);
    
    let hfToken = '';
    if (jwtSecret) {
      try {
        hfToken = jwt.sign(
          {
            sub: profile.id,
            email: profile.email,
            role: 'authenticated',
            aud: 'authenticated',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 300,
          },
          jwtSecret,
          { algorithm: 'HS256' }
        );
        log(`JWT generated successfully, length: ${hfToken.length}`);
      } catch (jwtErr: any) {
        log(`JWT generation failed: ${jwtErr.message}`);
      }
    }

    // 9. 调用 HF Space
    const spaceUrl = SPACE_URLS[model];
    let assistantMessage: string;
    let hfCallSuccess = false;

    try {
      log(`Calling HF Space: ${spaceUrl}/gradio_api/call/respond`);
      
      const gradioResponse = await fetch(`${spaceUrl}/gradio_api/call/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [userMessage, [], "你是一位专业的AI助手。", temperature, 0.9, max_tokens, hfToken],
        }),
      });

      log(`Gradio response status: ${gradioResponse.status}`);

      if (!gradioResponse.ok) {
        throw new Error(`HTTP ${gradioResponse.status}`);
      }

      const { event_id } = await gradioResponse.json();
      log(`Got event_id: ${event_id}`);
      
      // 等待并获取结果
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const sseResponse = await fetch(`${spaceUrl}/gradio_api/call/respond/${event_id}`);
      const sseText = await sseResponse.text();
      
      log(`SSE response length: ${sseText.length}`);
      log(`SSE first 200 chars: ${sseText.substring(0, 200)}`);
      
      // 解析结果
      assistantMessage = parseGradioResponse(sseText);
      log(`Parsed message: ${assistantMessage.substring(0, 100)}`);
      
      if (assistantMessage && assistantMessage !== 'AI 未能生成回复') {
        hfCallSuccess = true;
      }

    } catch (error: any) {
      log(`HF Space error: ${error.message}`);
      assistantMessage = `[调试信息]\n\n用户: ${profile.email}\n问题: "${userMessage}"\n模型: ${model}\nJWT: ${hfToken ? '已生成' : '未生成'}\n\n日志:\n${logs.join('\n')}`;
    }

    // 10. 记录用量
    try {
      await supabase.from('usage_logs').insert({
        user_id: profile.id,
        product: model,
        tokens_used: Math.ceil(assistantMessage.length * 1.5),
        request_id: `req_${Date.now()}`,
      });
    } catch (logErr: any) {
      log(`Failed to log: ${logErr.message}`);
    }

    // 返回响应
    if (!stream) {
      return res.status(200).json({
        id: `chatcmpl-${Date.now().toString(36)}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: assistantMessage },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: Math.ceil(userMessage.length * 1.5),
          completion_tokens: Math.ceil(assistantMessage.length * 1.5),
          total_tokens: Math.ceil((userMessage.length + assistantMessage.length) * 1.5)
        },
        _debug: { logs, hfCallSuccess }
      });
    }

    // 流式响应
    res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({ id: `chatcmpl-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now()/1000), model, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] })}\n\n`);
    
    res.write(`data: ${JSON.stringify({ id: `chatcmpl-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now()/1000), model, choices: [{ index: 0, delta: { content: assistantMessage }, finish_reason: null }] })}\n\n`);
    
    res.write(`data: ${JSON.stringify({ id: `chatcmpl-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now()/1000), model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err: any) {
    console.error('[chat] Error:', err.message);
    return res.status(500).json({
      error: { message: err.message || 'Internal server error', type: 'server_error' },
      _debug: { logs }
    });
  }
}

function parseGradioResponse(sseText: string): string {
  const lines = sseText.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        if (data?.output?.data) {
          for (const item of data.output.data) {
            if (typeof item === 'string') return item;
            if (Array.isArray(item) && item.length > 0) {
              const last = item[item.length - 1];
              if (last?.content) return last.content;
            }
          }
        }
      } catch (e) {}
    }
  }
  
  return 'AI 未能生成回复';
}