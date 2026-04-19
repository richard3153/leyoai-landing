/**
 * POST /api/v1/chat — OpenAI 兼容的 Chat Completions 端点
 * 
 * 调用 HF Space FastAPI 端点（/api/v1/chat）进行推理
 * 功能完整：API Key 验证、配额检查、用量记录、流式响应、JWT 传递
 */
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SPACE_URLS: Record<string, string> = {
  cyber: 'https://ffzwai-leyoai-cyber-assistant.hf.space',
  video: 'https://ffzwai-leyoai-video-safety.hf.space',
  flow: 'https://ffzwai-leyoai-flow-assistant.hf.space',
  analytics: 'https://ffzwai-leyoai-analytics-assistant.hf.space',
};

const MODEL_NAMES: Record<string, string> = {
  cyber: 'Cyber Assistant',
  video: 'Video Safety',
  flow: 'Flow Assistant',
  analytics: 'Analytics Assistant',
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

  try {
    // 1. 解析 API Key
    const authHeader = req.headers.authorization || '';
    const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    
    if (!apiKey) {
      return res.status(401).json({
        error: { message: 'Missing API key. Use: Authorization: Bearer lya_xxx', type: 'authentication_error' }
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
          message: `Quota exceeded. Used ${currentUsage}/${planQuota} requests this month. Upgrade at https://leyoai.vercel.app/pricing`,
          type: 'rate_limit_error',
          code: 'quota_exceeded'
        }
      });
    }

    // 7. 获取用户消息
    const lastUserMsg = [...(messages || [])].reverse().find((m: any) => m.role === 'user');
    const userMessage = lastUserMsg?.content || 'Hello';
    
    // 8. 调用 HF Space FastAPI 端点
    const spaceUrl = SPACE_URLS[model];
    const internalKey = process.env.LEYOAI_INTERNAL_KEY || 'leyoai-internal-2026';
    let assistantMessage = '';
    let usedFallback = false;

    try {
      const hfResponse = await fetch(`${spaceUrl}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          api_key: internalKey,
          user_id: profile.id,
          user_email: profile.email,
          temperature,
          max_tokens,
        }),
        signal: AbortSignal.timeout(100000), // 100s 超时（CPU 推理慢）
      });

      if (hfResponse.ok) {
        const hfData = await hfResponse.json();
        assistantMessage = hfData.response || hfData.message || '';
      } else {
        const errBody = await hfResponse.text().catch(() => '');
        console.error(`[chat] HF Space ${model} returned ${hfResponse.status}: ${errBody}`);
        usedFallback = true;
      }
    } catch (err: any) {
      console.error(`[chat] HF Space ${model} error: ${err.message}`);
      usedFallback = true;
    }

    // 降级处理：HF Space 不可用时返回友好提示
    if (usedFallback || !assistantMessage) {
      assistantMessage = `⚠️ AI 模型暂时不可用，请稍后再试。\n\n` +
        `您可以访问网页版直接使用：${spaceUrl}\n` +
        `状态：用户 ${profile.email} 已验证，配额 ${currentUsage}/${planQuota}`;
    }

    const promptTokens = Math.ceil(userMessage.length * 1.5);
    const completionTokens = Math.ceil(assistantMessage.length * 1.5);

    // 10. 记录用量
    try {
      await supabase.from('usage_logs').insert({
        user_id: profile.id,
        product: model,
        tokens_used: promptTokens + completionTokens,
        request_id: `req_${Date.now()}`,
      });
    } catch (e) {}

    // 11. 返回响应
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
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens
        }
      });
    }

    // 流式响应
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write(`data: ${JSON.stringify({ id: `chatcmpl-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now()/1000), model, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] })}\n\n`);
    
    const chunks = assistantMessage.match(/.{1,20}/g) || [assistantMessage];
    for (const chunk of chunks) {
      res.write(`data: ${JSON.stringify({ id: `chatcmpl-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now()/1000), model, choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }] })}\n\n`);
    }
    
    res.write(`data: ${JSON.stringify({ id: `chatcmpl-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now()/1000), model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err: any) {
    console.error('[chat] Error:', err.message);
    return res.status(500).json({
      error: { message: err.message || 'Internal server error', type: 'server_error' }
    });
  }
}
