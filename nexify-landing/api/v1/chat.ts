/**
 * POST /api/v1/chat — OpenAI 兼容的 Chat Completions 端点（完整版）
 * 
 * 功能：
 * 1. API Key 验证
 * 2. 配额检查（返回 429 如果超限）
 * 3. JWT 生成（用于 HF Space 鉴权）
 * 4. HF Space 调用
 * 5. 流式响应支持（stream: true）
 * 6. 用量记录
 */
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// HF Space 配置
const SPACE_URLS: Record<string, string> = {
  cyber: 'https://ffzwai-leyoai-cyber-assistant.hf.space',
  video: 'https://ffzwai-leyoai-video-safety.hf.space',
  flow: 'https://ffzwai-leyoai-flow-assistant.hf.space',
  analytics: 'https://ffzwai-leyoai-analytics-assistant.hf.space',
};

// 配额配置（与数据库 plan_quotas 表保持一致）
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

  const startTime = Date.now();
  const requestId = `req_${startTime.toString(36)}`;

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
    
    const { count: usageCount, error: usageError } = await supabase
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
          param: null,
          code: 'quota_exceeded'
        }
      });
    }

    // 7. 获取用户消息
    const lastUserMsg = [...(messages || [])].reverse().find((m: any) => m.role === 'user');
    const userMessage = lastUserMsg?.content || 'Hello';
    
    // 8. 生成 JWT token 给 HF Space
    const jwtSecret = process.env.LEYOAI_JWT_SECRET;
    let hfToken = '';
    
    if (jwtSecret) {
      hfToken = jwt.sign(
        {
          sub: profile.id,
          email: profile.email,
          role: 'authenticated',
          aud: 'authenticated',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 300, // 5分钟有效
        },
        jwtSecret,
        { algorithm: 'HS256' }
      );
    }

    // 9. 调用 HF Space
    const spaceUrl = SPACE_URLS[model];
    let assistantMessage: string;
    let promptTokens = Math.ceil(userMessage.length * 1.5);
    let completionTokens = 0;

    try {
      // 调用 Gradio API
      const gradioResponse = await fetch(`${spaceUrl}/gradio_api/call/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [
            userMessage,
            [],
            "你是一位专业的AI助手。请用中文简洁回答。",
            temperature,
            0.9,
            max_tokens,
            hfToken
          ],
        }),
      });

      if (!gradioResponse.ok) {
        throw new Error(`HTTP ${gradioResponse.status}`);
      }

      const { event_id } = await gradioResponse.json();
      
      // 等待并获取结果
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const sseResponse = await fetch(`${spaceUrl}/gradio_api/call/respond/${event_id}`);
      const sseText = await sseResponse.text();
      
      // 解析结果
      assistantMessage = parseGradioResponse(sseText);
      
      // 检查是否是 token 错误
      if (assistantMessage.includes('Token 无效') || assistantMessage.includes('请先登录')) {
        throw new Error('HF Space JWT verification failed');
      }
      
      completionTokens = Math.ceil(assistantMessage.length * 1.5);

    } catch (error: any) {
      console.error(`[chat] HF Space error:`, error.message);
      
      // 返回模拟响应（开发阶段）
      assistantMessage = `【模拟响应】收到您的问题："${userMessage}"

这是一个测试回复。实际生产环境中，这里将返回 AI 模型的真实回复。

当前时间：${new Date().toLocaleString('zh-CN')}
模型：${model}
用户：${profile.email}`;
      
      completionTokens = Math.ceil(assistantMessage.length * 1.5);
    }

    const totalTokens = promptTokens + completionTokens;

    // 10. 记录用量
    try {
      await supabase.from('usage_logs').insert({
        user_id: profile.id,
        product: model,
        tokens_used: totalTokens,
        request_id: requestId,
      });
    } catch (logErr: any) {
      console.error('[chat] Failed to log usage:', logErr.message);
    }

    // 11. 返回响应（非流式）
    if (!stream) {
      return res.status(200).json({
        id: `chatcmpl-${requestId}`,
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
    }

    // 12. 流式响应
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 发送开始事件
    res.write(`data: ${JSON.stringify({
      id: `chatcmpl-${requestId}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }]
    })}\n\n`);

    // 模拟流式发送（实际应该逐字发送）
    const words = assistantMessage.split('');
    for (let i = 0; i < words.length; i += 10) {
      const chunk = words.slice(i, i + 10).join('');
      res.write(`data: ${JSON.stringify({
        id: `chatcmpl-${requestId}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }]
      })}\n\n`);
      await new Promise(r => setTimeout(r, 50));
    }

    // 发送结束事件
    res.write(`data: ${JSON.stringify({
      id: `chatcmpl-${requestId}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
    })}\n\n`);

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err: any) {
    console.error('[chat] Error:', err.message);
    return res.status(500).json({
      error: { message: err.message || 'Internal server error', type: 'server_error' }
    });
  }
}

// 解析 Gradio SSE 响应
function parseGradioResponse(sseText: string): string {
  const lines = sseText.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        
        if (data && data.output && data.output.data) {
          const outputData = data.output.data;
          
          // 查找第一个字符串输出（通常是回复内容）
          for (const item of outputData) {
            if (typeof item === 'string') {
              return item;
            }
            if (Array.isArray(item) && item.length > 0) {
              const lastMsg = item[item.length - 1];
              if (lastMsg && typeof lastMsg === 'object' && lastMsg.content) {
                return lastMsg.content;
              }
            }
          }
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
  }
  
  return 'AI 未能生成回复';
}