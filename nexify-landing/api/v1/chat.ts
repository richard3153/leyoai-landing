/**
 * POST /api/v1/chat — OpenAI 兼容的 Chat Completions 端点（完整版）
 */
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// HF Space 配置
const SPACE_URLS: Record<string, string> = {
  cyber: 'https://ffzwai-leyoai-cyber-assistant.hf.space',
  video: 'https://ffzwai-leyoai-video-safety.hf.space',
  flow: 'https://ffzwai-leyoai-flow-assistant.hf.space',
  analytics: 'https://ffzwai-leyoai-analytics-assistant.hf.space',
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
        error: { message: 'Missing API key', type: 'authentication_error' }
      });
    }

    // 2. 初始化 Supabase
    const supabaseUrl = process.env.SUPABASE_URL || 'https://drbeynfabvbydukjajrz.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceKey) {
      return res.status(500).json({
        error: { message: 'SUPABASE_SERVICE_ROLE_KEY not configured', type: 'server_error' }
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
    const { model, messages } = req.body || {};
    const validModels = ['cyber', 'video', 'flow', 'analytics'];
    
    if (!model || !validModels.includes(model)) {
      return res.status(400).json({
        error: { message: `Invalid model: ${model}`, type: 'invalid_request_error' }
      });
    }

    // 6. 获取用户消息
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
    const userMessage = lastUserMsg?.content || 'Hello';
    
    // 7. 调用 HF Space
    const spaceUrl = SPACE_URLS[model];
    let assistantMessage: string;
    let promptTokens = Math.ceil(userMessage.length * 1.5);
    let completionTokens = 0;

    try {
      // 调用 Gradio API
      const response = await fetch(`${spaceUrl}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fn_index: 0,
          data: [userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error(`HF Space returned ${response.status}`);
      }

      const result = await response.json();
      assistantMessage = result.data?.[0] || '抱歉，AI 服务暂时无法响应。';
      completionTokens = Math.ceil(assistantMessage.length * 1.5);

    } catch (hfError: any) {
      console.error('[chat] HF Space error:', hfError.message);
      // HF Space 失败时返回友好提示
      assistantMessage = 'AI 服务暂时不可用，请稍后再试。';
      completionTokens = Math.ceil(assistantMessage.length * 1.5);
    }

    const totalTokens = promptTokens + completionTokens;

    // 8. 记录用量（异步，不阻塞响应）
    try {
      await supabase.from('usage_logs').insert({
        user_id: profile.id,
        product: model,
        tokens_used: totalTokens,
        request_id: `req_${Date.now()}`,
      });
    } catch (logErr: any) {
      console.error('[chat] Failed to log usage:', logErr.message);
    }

    // 9. 返回 OpenAI 兼容格式
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
        total_tokens: totalTokens
      }
    });

  } catch (err: any) {
    console.error('[chat] Error:', err.message);
    return res.status(500).json({
      error: { message: err.message || 'Internal server error', type: 'server_error' }
    });
  }
}
