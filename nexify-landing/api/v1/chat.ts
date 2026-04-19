/**
 * POST /api/v1/chat — OpenAI 兼容的 Chat Completions 端点
 * 
 * 当前状态：HF Space Gradio API 有技术问题，返回错误
 * 临时方案：返回友好提示，引导用户使用网页界面
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

// 模型显示名称
const MODEL_NAMES: Record<string, string> = {
  cyber: 'Cyber Assistant',
  video: 'Video Safety',
  flow: 'Flow Assistant',
  analytics: 'Analytics Assistant',
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
    
    // 7. 尝试调用 HF Space
    const spaceUrl = SPACE_URLS[model];
    let assistantMessage: string;
    let promptTokens = Math.ceil(userMessage.length * 1.5);
    let completionTokens = 0;
    let hfError = null;

    try {
      // 调用 Gradio API
      const gradioResponse = await fetch(`${spaceUrl}/gradio_api/call/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [
            userMessage,           // 1. 用户输入
            [],                    // 2. 聊天历史
            "你是一位专业的AI助手。", // 3. System Prompt
            0.7,                   // 4. Temperature
            0.9,                   // 5. Top-P
            512,                   // 6. Max Tokens
            ""                     // 7. JWT Token
          ],
        }),
      });

      if (!gradioResponse.ok) {
        throw new Error(`HTTP ${gradioResponse.status}`);
      }

      const { event_id } = await gradioResponse.json();
      
      // 等待并获取 SSE 结果
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const sseResponse = await fetch(`${spaceUrl}/gradio_api/call/respond/${event_id}`, {
        headers: { 'Accept': 'text/event-stream' },
      });

      const sseText = await sseResponse.text();
      
      // 检查是否是错误
      if (sseText.includes('event: error')) {
        throw new Error('HF Space returned error event');
      }
      
      // 解析结果
      assistantMessage = parseGradioResponse(sseText);
      
      if (!assistantMessage || assistantMessage === 'AI 未能生成回复') {
        throw new Error('Empty response from HF Space');
      }
      
      completionTokens = Math.ceil(assistantMessage.length * 1.5);

    } catch (error: any) {
      hfError = error.message;
      console.error(`[chat] HF Space error (${model}):`, error.message);
      
      // 返回临时提示信息
      assistantMessage = `您好！我是 LeyoAI ${MODEL_NAMES[model]}。

您的问题："${userMessage}"

⚠️ 当前 API 服务正在维护中，暂时无法通过 API 直接调用 AI 模型。

💡 替代方案：
请访问网页版使用完整功能：
${spaceUrl}

或访问 LeyoAI 官网：
https://leyoai.vercel.app

我们正在修复此问题，感谢您的耐心！`;
      
      completionTokens = Math.ceil(assistantMessage.length * 1.5);
    }

    const totalTokens = promptTokens + completionTokens;

    // 8. 记录用量和错误日志
    try {
      await supabase.from('usage_logs').insert({
        user_id: profile.id,
        product: model,
        tokens_used: totalTokens,
        request_id: `req_${Date.now()}`,
      });
      
      // 如果有错误，记录到 alert_logs
      if (hfError) {
        await supabase.from('alert_logs').insert({
          user_id: profile.id,
          alert_type: 'api_error',
          message: `HF Space ${model} error: ${hfError}`,
        }).catch(() => {}); // 忽略 alert_logs 错误
      }
    } catch (logErr: any) {
      console.error('[chat] Failed to log:', logErr.message);
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

// 解析 Gradio SSE 响应
function parseGradioResponse(sseText: string): string {
  const lines = sseText.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        
        // 处理完成事件
        if (data && data.output && data.output.data) {
          const outputData = data.output.data;
          
          // 查找聊天历史（第二个输出通常是 chatbot）
          for (const item of outputData) {
            if (Array.isArray(item) && item.length > 0) {
              const lastMsg = item[item.length - 1];
              if (lastMsg && typeof lastMsg === 'object') {
                // Gradio Chatbot 格式
                if (lastMsg.content) {
                  return lastMsg.content;
                }
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
