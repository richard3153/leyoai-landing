/**
 * GET /api/v1/models — 列出可用模型
 *
 * OpenAI 兼容格式，方便开发者发现可用模型
 */
import type { IncomingMessage, ServerResponse } from 'http';
type VercelRequest = IncomingMessage & { query: Record<string,string>; body: unknown; method: string };
type VercelResponse = ServerResponse & { status(code:number): VercelResponse; json(body:unknown): VercelResponse; setHeader(k:string,v:string): VercelResponse; send(body?:string|object): VercelResponse };
import { VALID_PRODUCTS } from '../_lib/supabase';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

const MODEL_LIST = VALID_PRODUCTS.map(id => ({
  id,
  object: 'model' as const,
  created: 1745000000,
  owned_by: 'leyoai',
  permission: [],
  root: id,
  parent: null,
}));

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(204).set(CORS_HEADERS).send('');
  }

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  return res.status(200).json({
    object: 'list',
    data: MODEL_LIST,
  });
}
