/**
 * POST /api/v1/chat — 调试版本（带详细错误信息）
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

  const debugSteps: string[] = [];

  try {
    debugSteps.push('1. Parsing API Key...');
    const authHeader = req.headers.authorization || '';
    const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    
    if (!apiKey) {
      return res.status(401).json({
        error: { message: 'Missing API key', type: 'authentication_error' },
        debug: debugSteps
      });
    }
    debugSteps.push(`1. API Key parsed: ${apiKey.slice(0, 10)}...`);

    debugSteps.push('2. Initializing Supabase...');
    const supabaseUrl = process.env.SUPABASE_URL || 'https://drbeynfabvbydukjajrz.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceKey) {
      return res.status(500).json({
        error: { message: 'SUPABASE_SERVICE_ROLE_KEY not configured', type: 'server_error' },
        debug: debugSteps
      });
    }
    debugSteps.push('2. SUPABASE_SERVICE_ROLE_KEY exists');
    
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    debugSteps.push('2. Supabase client created');

    debugSteps.push('3. Hashing API Key...');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    debugSteps.push(`3. Key hash: ${keyHash.slice(0, 16)}...`);
    
    debugSteps.push('4. Querying api_keys table...');
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, name, is_active')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single();

    if (keyError) {
      debugSteps.push(`4. Key query error: ${keyError.message}`);
      return res.status(401).json({
        error: { message: 'Invalid API key', type: 'authentication_error' },
        debug: debugSteps,
        dbError: keyError
      });
    }

    if (!keyData) {
      debugSteps.push('4. No key found in database');
      return res.status(401).json({
        error: { message: 'Invalid API key', type: 'authentication_error' },
        debug: debugSteps
      });
    }
    debugSteps.push(`4. Key found: ${keyData.name}`);

    debugSteps.push('5. Querying profiles table...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, plan')
      .eq('id', keyData.user_id)
      .single();

    if (profileError) {
      debugSteps.push(`5. Profile query error: ${profileError.message}`);
      return res.status(401).json({
        error: { message: 'User not found', type: 'authentication_error' },
        debug: debugSteps
      });
    }

    if (!profile) {
      debugSteps.push('5. No profile found');
      return res.status(401).json({
        error: { message: 'User not found', type: 'authentication_error' },
        debug: debugSteps
      });
    }
    debugSteps.push(`5. Profile found: ${profile.email}`);

    debugSteps.push('6. Validating request body...');
    const { model, messages } = req.body || {};
    const validModels = ['cyber', 'video', 'flow', 'analytics'];
    
    if (!model || !validModels.includes(model)) {
      return res.status(400).json({
        error: { message: `Invalid model: ${model}`, type: 'invalid_request_error' },
        debug: debugSteps
      });
    }
    debugSteps.push(`6. Model validated: ${model}`);

    // 返回成功（调试模式）
    return res.status(200).json({
      id: `chatcmpl-${Date.now().toString(36)}`,
      object: 'chat.completion',
      model,
      debug: debugSteps,
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
          content: `✅ 数据库连接成功！\n\n用户信息：\n- 邮箱: ${profile.email}\n- 套餐: ${profile.plan}\n- API Key: ${keyData.name}\n\n调试步骤：\n${debugSteps.join('\n')}`
        },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    });

  } catch (err: any) {
    debugSteps.push(`ERROR: ${err.message}`);
    console.error('[chat] Error:', err.message);
    return res.status(500).json({
      error: { message: err.message || 'Internal server error', type: 'server_error' },
      debug: debugSteps
    });
  }
}
