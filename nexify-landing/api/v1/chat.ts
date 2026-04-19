/**
 * POST /api/v1/chat — OpenAI 兼容的 Chat Completions 端点
 * 
 * 稳定版：带 HF Space 集成
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
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    // 1. 验证 API Key
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
        error: { message: 'Server error', type: 'server_error' }
      });
    }
    
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. 查找 API Key
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const { data: keyData } = await supabase
      .from('api_keys')
      .select('id, user_id, is_active')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single();

    if (!keyData) {
      return res.status(401).json({
        error: { message: 'Invalid API key', type: 'authentication_error' }
      });
    }

    // 4. 获取用户信息
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, plan')
      .eq('id', keyData.user_id)
      .single();

    if (!profile) {
      return res.status(401).json({
        error: { message: 'User not found', type: 'authentication_error' }
      });
    }

    // 5. 验证参数
    const { model, messages, stream = false } = req.body || {};
    const validModels = ['cyber', 'video', 'flow', 'analytics'];
    
    if (!model || !validModels.includes(model)) {
      return res.status(400).json({
        error: { message: `Invalid model`, type: 'invalid_request_error' }
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
    
    if ((usageCount || 0) >= planQuota) {
      return res.status(429).json({
        error: { message: `Quota exceeded`, type: 'rate_limit_error' }
      });
    }

    // 7. 获取用户消息
    const lastUserMsg = [...(messages || [])].reverse().find((m: any) => m.role === 'user');
    const userMessage = lastUserMsg?.content || 'Hello';
    
    // 8. 生成 JWT for HF Space
    const jwtSecret = process.env.LEYOAI_JWT_SECRET;
    let hfToken = '';
    
    if (jwtSecret) {
      try {
        hfToken = jwt.sign(
          {
            sub: profile.id,
            email: profile.email,
            role: 'authenticated',
            aud: 'authenticated',
            exp: Math.floor(Date.now() / 1000) + 300,
          },
          jwtSecret,
          { algorithm: 'HS256' }
        );
      } catch (e) {
        console.error('JWT generation failed:', e);
      }
    }

    // 9. 调用 HF Space
    const spaceUrl = SPACE_URLS[model];
    let assistantMessage: string;
    let hfSuccess = false;

    try {
      // 调用 Gradio
      const gradioRes = await fetch(`${spaceUrl}/gradio_api/call/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [userMessage, [], "AI助手", 0.7, 0.9, 512, hfToken],
        }),
      });

      if (!gradioRes.ok) throw new Error(`HTTP ${gradioRes.status}`);

      const { event_id } = await gradioRes.json();
      
      // 等待结果
      await new Promise(r => setTimeout(r, 5000));
      
      const sseRes = await fetch(`${spaceUrl}/gradio_api/call/respond/${event_id}`);
      const sseText = await sseRes.text();
      
      // 解析结果
      if (sseText.includes('event: complete')) {
        const match = sseText.match(/data: (.+)/);
        if (match) {
          const data = JSON.parse(match[1]);
          if (data?.output?.data?.[0]) {
            assistantMessage = data.output.data[0];
            hfSuccess = true;
          } else {
            throw new Error('Empty output');
          }
        } else {
          throw new Error('No data');
        }
      } else {
        throw new Error('HF error');
      }
    } catch (err: any) {
      console.error('HF Space error:', err.message);
      assistantMessage = `【HF Space 暂不可用】${userMessage}\n\n错误: ${err.message}`;
    }

    // 10. 记录用量
    const promptTokens = Math.ceil(userMessage.length * 1.5);
    const completionTokens = Math.ceil(assistantMessage.length * 1.5);
    
    try {
      await supabase.from('usage_logs').insert({
        user_id: profile.id,
        product: model,
        tokens_used: promptTokens + completionTokens,
        request_id: `req_${Date.now()}`,
      });
    } catch (e) {}

    // 11. 返回
    if (!stream) {
      return res.status(200).json({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: assistantMessage },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens
        },
        _hf_success: hfSuccess
      });
    }

    // 流式
    res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({ id: `chatcmpl-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now()/1000), model, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] })}

`);
    res.write(`data: ${JSON.stringify({ id: `chatcmpl-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now()/1000), model, choices: [{ index: 0, delta: { content: assistantMessage }, finish_reason: null }] })}

`);
    res.write(`data: ${JSON.stringify({ id: `chatcmpl-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now()/1000), model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}

`);
    res.write('data: [DONE]

');
    res.end();

  } catch (err: any) {
    console.error('[chat] Error:', err);
    return res.status(500).json({
      error: { message: 'Internal error', type: 'server_error' }
    });
  }
}