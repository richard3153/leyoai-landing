/**
 * POST /api/v1/chat — OpenAI 兼容的 Chat Completions 端点（完整版）
 * 
 * 实现 Gradio SSE API 调用获取完整响应
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

// 系统提示词配置
const SYSTEM_PROMPTS: Record<string, string> = {
  cyber: "你是一位专业的AI安全专家。你的职责是帮助用户识别和预防网络安全威胁、诈骗行为、个人信息泄露、恶意软件等安全风险。回答要求：专业、实用、简洁，用中文回复。",
  video: "你是一位专业的视频内容安全审核专家。你的职责是帮助用户识别视频中的违规内容、版权问题、敏感信息等。回答要求：专业、准确、简洁，用中文回复。",
  flow: "你是一位专业的业务流程自动化专家。你的职责是帮助用户优化工作流程、设计自动化方案、提高效率。回答要求：专业、实用、简洁，用中文回复。",
  analytics: "你是一位专业的数据分析专家。你的职责是帮助用户理解数据、发现洞察、做出数据驱动的决策。回答要求：专业、清晰、简洁，用中文回复。",
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
    
    // 7. 调用 HF Space（Gradio SSE API）
    const spaceUrl = SPACE_URLS[model];
    let assistantMessage: string;
    let promptTokens = Math.ceil(userMessage.length * 1.5);
    let completionTokens = 0;

    try {
      // 调用 Gradio API 获取 event_id
      const gradioResponse = await fetch(`${spaceUrl}/gradio_api/call/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [
            userMessage,           // 1. 用户输入 (textbox)
            [],                    // 2. 聊天历史 (chatbot)
            SYSTEM_PROMPTS[model], // 3. System Prompt
            0.7,                   // 4. Temperature
            0.9,                   // 5. Top-P
            512,                   // 6. Max Tokens
            ""                     // 7. JWT Token (API模式为空)
          ],
        }),
      });

      if (!gradioResponse.ok) {
        const errorText = await gradioResponse.text();
        throw new Error(`HF Space returned ${gradioResponse.status}: ${errorText}`);
      }

      const { event_id } = await gradioResponse.json();
      
      // 等待并获取 SSE 结果
      assistantMessage = await fetchGradioResult(spaceUrl, event_id);
      completionTokens = Math.ceil(assistantMessage.length * 1.5);

    } catch (hfError: any) {
      console.error('[chat] HF Space error:', hfError.message);
      assistantMessage = `[AI服务暂时不可用] ${hfError.message}`;
      completionTokens = Math.ceil(assistantMessage.length * 1.5);
    }

    const totalTokens = promptTokens + completionTokens;

    // 8. 记录用量
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

// 获取 Gradio SSE 结果
async function fetchGradioResult(spaceUrl: string, eventId: string): Promise<string> {
  const sseUrl = `${spaceUrl}/gradio_api/call/respond/${eventId}`;
  
  // 等待一段时间让模型生成响应
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 获取结果
  const response = await fetch(sseUrl, {
    headers: {
      'Accept': 'text/event-stream',
    },
  });

  if (!response.ok) {
    throw new Error(`SSE request failed: ${response.status}`);
  }

  const text = await response.text();
  
  // 解析 SSE 数据
  const lines = text.split('\n');
  let result = '';
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        // Gradio 返回的数据格式: { "output": { "data": [...] } }
        if (data && typeof data === 'object') {
          if (data.output && data.output.data) {
            // 找到聊天机器人的输出（通常是第二个返回值）
            const chatData = data.output.data[1]; // chatbot 是第二个输出
            if (chatData && Array.isArray(chatData) && chatData.length > 0) {
              const lastMessage = chatData[chatData.length - 1];
              if (lastMessage && lastMessage.content) {
                result = lastMessage.content;
              } else if (typeof lastMessage === 'string') {
                result = lastMessage;
              }
            }
          }
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
  }
  
  if (!result) {
    // 如果无法解析，返回原始响应的一部分
    result = text.slice(0, 500);
  }
  
  return result || 'AI 未能生成回复';
}
