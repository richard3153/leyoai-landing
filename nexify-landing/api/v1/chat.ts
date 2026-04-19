// 最小化测试版本
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  // 解析 API Key
  const authHeader = req.headers.authorization || '';
  const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  
  if (!apiKey) {
    return res.status(401).json({
      error: { message: 'Missing API key', type: 'authentication_error' }
    });
  }

  // 简单返回测试响应（不查数据库）
  return res.status(200).json({
    id: 'chatcmpl-test',
    object: 'chat.completion',
    model: req.body?.model || 'cyber',
    choices: [{
      index: 0,
      message: { role: 'assistant', content: 'API Gateway 运行正常！这是测试响应。' },
      finish_reason: 'stop'
    }],
    usage: { prompt_tokens: 0, completion_tokens: 10, total_tokens: 10 }
  });
}
