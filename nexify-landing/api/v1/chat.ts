/**
 * POST /api/v1/chat — 极简测试版（无外部依赖）
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    const apiKey = (req.headers.authorization || '').replace('Bearer ', '');
    
    if (!apiKey) {
      return res.status(401).json({
        error: { message: 'Missing API key', type: 'authentication_error' }
      });
    }

    // 简单的 API Key 验证（硬编码测试 key）
    const validKeys = {
      'lya_test_1776596298': { userId: 'test-user', email: 'test@leyoai.com', plan: 'free' }
    };

    const keyData = validKeys[apiKey];
    if (!keyData) {
      return res.status(401).json({
        error: { message: 'Invalid API key', type: 'authentication_error' }
      });
    }

    const { model, messages } = req.body || {};
    const validModels = ['cyber', 'video', 'flow', 'analytics'];
    
    if (!model || !validModels.includes(model)) {
      return res.status(400).json({
        error: { message: `Invalid model: ${model}`, type: 'invalid_request_error' }
      });
    }

    const lastUserMsg = [...(messages || [])].reverse().find((m: any) => m.role === 'user');
    const userMessage = lastUserMsg?.content || 'Hello';

    return res.status(200).json({
      id: 'chatcmpl-' + Math.random().toString(36).slice(2, 14),
      object: 'chat.completion',
      model,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: `[测试] 收到: ${userMessage}` },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 0, completion_tokens: 10, total_tokens: 10 }
    });

  } catch (err: any) {
    console.error('[chat] Error:', err.message);
    return res.status(500).json({
      error: { message: err.message || 'Internal error', type: 'server_error' }
    });
  }
}
