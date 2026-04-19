/**
 * POST /api/v1/chat — 调试版本（逐步添加功能）
 */
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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
        error: { 
          message: `Invalid model: ${model}`, 
          type: 'invalid_request_error' 
        }
      });
    }

    // 6. 返回成功（暂不调用 HF Space）
    return res.status(200).json({
      id: `chatcmpl-${Date.now().toString(36)}`,
      object: 'chat.completion',
      model,
      user: {
        id: profile.id,
        email: profile.email,
        plan: profile.plan,
        key_name: keyData.name
      },
      choices: [{
        index: 0,
        message: { 
          role: 'assistant', 
          content: `[调试模式] 数据库连接成功！\n\n用户信息：\n- 邮箱: ${profile.email}\n- 套餐: ${profile.plan}\n- Key: ${keyData.name}\n\n下一步将连接 HF Space 获取真实 AI 回复。`
        },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    });

  } catch (err: any) {
    console.error('[chat] Error:', err.message);
    return res.status(500).json({
      error: { message: err.message || 'Internal server error', type: 'server_error' }
    });
  }
}
