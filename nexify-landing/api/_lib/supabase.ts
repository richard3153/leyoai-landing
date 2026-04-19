/**
 * Supabase Admin Client — 服务端专用
 * 使用 service_role key 绕过 RLS，用于 API Gateway 鉴权查询
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

export const supabase: SupabaseClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** 产品标识 → HF Space 域名映射 */
export const SPACE_URLS: Record<string, string> = {
  cyber:     'https://ffzwai-leyoai-cyber-assistant.hf.space',
  video:     'https://ffzwai-leyoai-video-safety.hf.space',
  flow:      'https://ffzwai-leyoai-flow-assistant.hf.space',
  analytics: 'https://ffzwai-leyoai-analytics-assistant.hf.space',
};

/** 产品标识 → Gradio API 函数名 */
export const SPACE_FN: Record<string, string> = {
  cyber:     'respond',
  video:     'answer',
  flow:      'answer',
  analytics: 'answer',
};

/** 有效产品列表 */
export const VALID_PRODUCTS = ['cyber', 'video', 'flow', 'analytics'] as const;
export type Product = typeof VALID_PRODUCTS[number];
