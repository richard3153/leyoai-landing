import type { VercelRequest, VercelResponse } from '@vercel/node';

const MODEL_LIST = [
  { id: 'cyber', object: 'model', created: 1745000000, owned_by: 'leyoai', permission: [], root: 'cyber', parent: null },
  { id: 'video', object: 'model', created: 1745000000, owned_by: 'leyoai', permission: [], root: 'video', parent: null },
  { id: 'flow', object: 'model', created: 1745000000, owned_by: 'leyoai', permission: [], root: 'flow', parent: null },
  { id: 'analytics', object: 'model', created: 1745000000, owned_by: 'leyoai', permission: [], root: 'analytics', parent: null },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  return res.status(200).json({ object: 'list', data: MODEL_LIST });
}
