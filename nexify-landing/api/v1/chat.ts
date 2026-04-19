/**
 * POST /api/v1/chat — OpenAI 兼容的 Chat Completions 端点
 * 
 * 完整功能：
 * 1. API Key 验证（查数据库）
 * 2. 配额检查
 * 3. 调用 HF Space
 * 4. 记录用量
 * 5. 触发告警
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

// 动态导入避免构建问题
const createClient = async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient;
};

const crypto = require('crypto');

// HF Space 配置
const SPACE_URLS: Record<string, string> = {
  cyber: 'https://ffzwai-leyoai-cyber-assistant.hf.space',
  video: 'https://ffzwai-leyoai-video-safety.hf.space',
  flow: 'https://ffzwai-leyoai-flow-assistant.hf.space',
  analytics: 'https://ffzwai-leyoai-analytics-assistant.hf.space',
};

const SPACE_FN: Record<string, string> = {
  cyber: 'respond',
  video: 'answer',
  flow: 'answer',
  analytics: 'answer',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const { createClient: createSupabaseClient } = await createClient();
    const supabaseUrl = process.env.SUPABASE_URL || 'https://drbeynfabvbydukjajrz.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }
    
    const supabase = createSupabaseClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. 验证 API Key（SHA-256 哈希）
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, name, is_active, product')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      console.log('[chat] Invalid API key:', keyHash.slice(0, 16) + '...');
      return res.status(401).json({
        error: { message: 'Invalid API key', type: 'authentication_error' }
      });
    }

    // 4. 获取用户信息和套餐
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
    const { model, messages, stream = false } = req.body || {};
    const validModels = ['cyber', 'video', 'flow', 'analytics'];
    
    if (!model || !validModels.includes(model)) {
      return res.status(400).json({
        error: { 
          message: `Invalid model: ${model}. Must be one of: ${validModels.join(', ')}`, 
          type: 'invalid_request_error' 
        }
      });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: { message: 'messages is required', type: 'invalid_request_error' }
      });
    }

    // 6. 检查配额
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    const { data: quotaData } = await supabase
      .from('plan_quotas')
      .select('monthly_limit')
      .eq('product', model)
      .eq('plan', profile.plan)
      .single();

    const monthlyLimit = quotaData?.monthly_limit || 100;

    const { data: usageData } = await supabase
      .from('usage_logs')
      .select('tokens_used')
      .eq('user_id', profile.id)
      .eq('product', model)
      .gte('created_at', `${currentMonth}-01`)
      .lte('created_at', `${currentMonth}-31`);

    const currentUsage = usageData?.reduce((sum, row) => sum + (row.tokens_used || 0), 0) || 0;

    if (currentUsage >= monthlyLimit) {
      return res.status(429).json({
        error: { 
          message: `Quota exceeded. Used ${currentUsage}/${monthlyLimit} tokens this month.`, 
          type: 'rate_limit_error' 
        }
      });
    }

    // 7. 调用 HF Space
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
    const userMessage = lastUserMsg?.content || 'Hello';
    
    const spaceUrl = SPACE_URLS[model];
    const fnName = SPACE_FN[model];
    
    let assistantMessage: string;
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      // 使用 Gradio Client API
      const response = await fetch(`${spaceUrl}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fn_index: 0,
          data: [userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error(`HF Space error: ${response.status}`);
      }

      const result = await response.json();
      assistantMessage = result.data?.[0] || '抱歉，服务暂时不可用，请稍后再试。';
      
      // 估算 token 数（中文字符约 1.5 tokens/字）
      promptTokens = Math.ceil(userMessage.length * 1.5);
      completionTokens = Math.ceil(assistantMessage.length * 1.5);

    } catch (hfError: any) {
      console.error('[chat] HF Space error:', hfError.message);
      // HF Space 调用失败时返回友好提示
      assistantMessage = 'AI 服务暂时不可用，请稍后再试。';
      promptTokens = Math.ceil(userMessage.length * 1.5);
      completionTokens = Math.ceil(assistantMessage.length * 1.5);
    }

    const totalTokens = promptTokens + completionTokens;

    // 8. 记录用量
    await supabase.from('usage_logs').insert({
      user_id: profile.id,
      product: model,
      tokens_used: totalTokens,
      request_id: `req_${Date.now()}`,
    });

    // 9. 检查是否需要告警（80% 和 100%）
    const newUsage = currentUsage + totalTokens;
    const usagePercent = (newUsage / monthlyLimit) * 100;
    
    if (usagePercent >= 100 || (usagePercent >= 80 && usagePercent < 85)) {
      // 异步发送告警邮件（不阻塞响应）
      sendQuotaAlert(profile.email, model, profile.plan, newUsage, monthlyLimit, usagePercent)
        .catch(err => console.error('[chat] Alert error:', err));
    }

    // 10. 返回 OpenAI 兼容格式
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

// 配额告警邮件（异步）
async function sendQuotaAlert(
  email: string, 
  product: string, 
  plan: string, 
  usage: number, 
  limit: number, 
  percent: number
) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.log('[alert] RESEND_API_KEY not configured, skipping email');
    return;
  }

  const isOverLimit = percent >= 100;
  const subject = isOverLimit 
    ? `LeyoAI 配额已用完 - ${product} Model`
    : `LeyoAI 配额提醒 - ${product} Model 已使用 ${Math.floor(percent)}%`;

  const body = isOverLimit
    ? `您的 ${product} Model 本月已用完 ${limit} 次配额。\n\n请访问 https://leyoai.vercel.app/pricing.html 升级套餐。`
    : `您的 ${product} Model 本月已使用 ${usage}/${limit} 次（${Math.floor(percent)}%）。\n\n剩余 ${limit - usage} 次，建议关注用量。`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'LeyoAI <alerts@leyoai.com>',
        to: email,
        subject,
        text: `亲爱的 ${email}：\n\n${body}\n\n—— LeyoAI 团队`,
      }),
    });
    console.log('[alert] Email sent to', email);
  } catch (e: any) {
    console.error('[alert] Failed to send email:', e.message);
  }
}
