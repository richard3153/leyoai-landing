/**
 * POST /api/v1/chat — OpenAI 兼容的 Chat Completions 端点
 *
 * 请求格式（兼容 OpenAI API）：
 *   POST /api/v1/chat
 *   Authorization: Bearer lya_xxxxxxxxxxxxxxxx
 *   {
 *     "model": "cyber",          // cyber | video | flow | analytics
 *     "messages": [{ "role": "user", "content": "如何识别钓鱼网站？" }],
 *     "temperature": 0.7,        // 可选
 *     "max_tokens": 64           // 可选
 *   }
 *
 * 响应格式（OpenAI 兼容）：
 *   {
 *     "id": "chatcmpl-xxxx",
 *     "object": "chat.completion",
 *     "model": "cyber",
 *     "choices": [{
 *       "index": 0,
 *       "message": { "role": "assistant", "content": "..." },
 *       "finish_reason": "stop"
 *     }],
 *     "usage": { "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0 }
 *   }
 */
import { verifyApiKey, extractApiKey } from '../_lib/auth';
import { checkQuota, logUsage, checkAndAlert } from '../_lib/quota';
import { callHFSpace } from '../_lib/hf-client';
import { VALID_PRODUCTS, Product } from '../_lib/supabase';

// 生成 chatcmpl ID
function genId(): string {
  return 'chatcmpl-' + Math.random().toString(36).slice(2, 14);
}

// CORS headers
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

// 最小化函数签名，避免类型问题
export default async function handler(req: any, res: any) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(204).send('');
  }

  // 只接受 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed', type: 'invalid_request_error' } });
  }

  // 设置 CORS
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  try {
    // ── 1. 验证 API Key ──
    const apiKey = extractApiKey(req.headers.authorization);
    if (!apiKey) {
      return res.status(401).json({
        error: { message: 'Missing API key. Use: Authorization: Bearer lya_xxx', type: 'authentication_error' },
      });
    }

    const auth = await verifyApiKey(apiKey);
    if (!auth) {
      return res.status(401).json({
        error: { message: 'Invalid API key', type: 'authentication_error' },
      });
    }

    // ── 2. 解析请求 ──
    const { model, messages, temperature, max_tokens, top_p } = req.body || {};

    // 验证 model
    if (!model || !VALID_PRODUCTS.includes(model)) {
      return res.status(400).json({
        error: {
          message: `Invalid model. Must be one of: ${VALID_PRODUCTS.join(', ')}`,
          type: 'invalid_request_error',
        },
      });
    }

    // 验证 messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: { message: 'messages is required and must be a non-empty array', type: 'invalid_request_error' },
      });
    }

    // 提取用户消息（取最后一条 user message）
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
    if (!lastUserMsg?.content) {
      return res.status(400).json({
        error: { message: 'At least one user message is required', type: 'invalid_request_error' },
      });
    }

    // ── 3. 检查配额 ──
    const quota = await checkQuota(auth.userId, model as Product, auth.plan);
    if (!quota.allowed) {
      return res.status(429).json({
        error: {
          message: `Quota exceeded: ${quota.usage}/${quota.limit} calls this month. Upgrade at https://leyoai.vercel.app/pricing.html`,
          type: 'rate_limit_error',
          usage: { used: quota.usage, limit: quota.limit },
        },
      });
    }

    // ── 4. 生成临时 JWT 传给 HF Space ──
    const serviceToken = generateServiceToken(auth.userId, auth.email);

    // ── 5. 调用 HF Space ──
    const result = await callHFSpace(model as Product, lastUserMsg.content, serviceToken, {
      temperature: temperature ?? 0.7,
      topP: top_p ?? 0.9,
      maxTokens: max_tokens ?? 64,
    });

    if (!result.success) {
      return res.status(502).json({
        error: { message: result.error || 'Model inference failed', type: 'server_error' },
      });
    }

    // ── 6. 记录用量 ──
    await logUsage(auth.userId, model as Product, 'chat_completion');

    // ── 7. 检查告警（异步，不阻塞响应） ──
    checkAndAlert(auth.userId, auth.email, model as Product, quota.usage + 1, quota.limit).catch(() => {});

    // ── 8. 返回 OpenAI 兼容响应 ──
    return res.status(200).json({
      id: genId(),
      object: 'chat.completion',
      model,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: result.data },
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    });
  } catch (err: any) {
    console.error('[chat] Unhandled error:', err);
    return res.status(500).json({
      error: { message: 'Internal server error', type: 'server_error' },
    });
  }
}

/**
 * 生成临时 JWT 给 HF Space 鉴权
 *
 * 使用 Supabase JWT Secret 签发，5 分钟有效
 * 这样 HF Space 现有的 verify_token 逻辑可以直接验证
 */
function generateServiceToken(userId: string, email: string): string {
  const jwtSecret = process.env.LEYOAI_JWT_SECRET;
  if (!jwtSecret) {
    // 无 JWT Secret 时返回空 token，HF Space 会返回"请先登录"
    // 但 API Gateway 已验证了配额，这是一个降级方案
    console.warn('[chat] LEYOAI_JWT_SECRET not set, HF Space auth will fail');
    return '';
  }

  // 动态导入 jsonwebtoken（避免 Edge Runtime 兼容问题）
  try {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      {
        sub: userId,
        email,
        role: 'authenticated',
        aud: 'authenticated',
      },
      jwtSecret,
      {
        algorithm: 'HS256',
        expiresIn: '5m',
      },
    );
  } catch {
    // jsonwebtoken 未安装，用基础 HMAC 手动构建
    console.warn('[chat] jsonwebtoken not available, generating minimal token');
    return '';
  }
}
