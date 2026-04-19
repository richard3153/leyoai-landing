/**
 * API Key 验证模块
 *
 * 流程：
 * 1. 客户端发送 Authorization: Bearer lya_xxxxxxxx
 * 2. 对 lya_xxx 做 SHA-256 哈希
 * 3. 在 Supabase api_keys 表查找 key_hash 匹配的记录
 * 4. 返回用户信息（user_id, email, plan）
 *
 * 安全：完整 API Key 不存储在数据库，只存哈希值
 */
import { supabase } from './supabase';
import crypto from 'crypto';

export interface AuthResult {
  userId: string;
  email: string;
  plan: string;
  keyName: string;
  keyId: string;
}

/** 对 API Key 做 SHA-256 哈希 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/** 从 Authorization header 提取 API Key */
export function extractApiKey(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    const key = parts[1];
    if (key.startsWith('lya_')) return key;
  }
  // 也支持直接传 lya_xxx
  if (authHeader.startsWith('lya_')) return authHeader;
  return null;
}

/**
 * 验证 API Key → 返回用户信息
 *
 * 兼容两种存储格式：
 * - 新格式：key_hash 存 SHA-256 哈希
 * - 旧格式：key_hash 存完整明文（迁移期兼容）
 */
export async function verifyApiKey(apiKey: string): Promise<AuthResult | null> {
  if (!apiKey || !apiKey.startsWith('lya_')) return null;

  const hashed = hashApiKey(apiKey);

  // 先按新格式（哈希）查找
  const { data: byHash, error: err1 } = await supabase
    .from('api_keys')
    .select('id, user_id, name, is_active')
    .eq('key_hash', hashed)
    .eq('is_active', true)
    .single();

  if (!err1 && byHash) {
    return await enrichAuthResult(byHash);
  }

  // 回退：按旧格式（明文）查找，自动迁移为哈希
  const { data: byPlain, error: err2 } = await supabase
    .from('api_keys')
    .select('id, user_id, name, is_active, key_hash')
    .eq('key_hash', apiKey)
    .eq('is_active', true)
    .single();

  if (!err2 && byPlain) {
    // 自动迁移：将明文替换为哈希
    await supabase
      .from('api_keys')
      .update({ key_hash: hashed })
      .eq('id', byPlain.id);

    return await enrichAuthResult(byPlain);
  }

  return null;
}

/** 从 api_keys 记录补充用户信息 */
async function enrichAuthResult(keyRow: {
  id: string;
  user_id: string;
  name: string;
}): Promise<AuthResult | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, plan')
    .eq('id', keyRow.user_id)
    .single();

  if (!profile) return null;

  return {
    userId: keyRow.user_id,
    email: profile.email || '',
    plan: profile.plan || 'free',
    keyName: keyRow.name,
    keyId: keyRow.id,
  };
}
