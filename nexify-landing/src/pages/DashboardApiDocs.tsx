import { useLang } from '../contexts/LanguageContext'

export default function DashboardApiDocs() {
  const { t } = useLang()

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">{t('API 文档', 'API Documentation')}</h1>
        <p className="text-slate-400 text-sm mt-1">
          {t('LeyoAI Chat Completions API — 兼容 OpenAI 格式', 'LeyoAI Chat Completions API — OpenAI Compatible')}
        </p>
      </div>

      {/* Base URL */}
      <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
        <h2 className="font-bold mb-3">{t('接口地址', 'Base URL')}</h2>
        <code className="block bg-slate-950/50 px-4 py-3 rounded-xl text-sm text-emerald-300 font-mono">
          https://leyoai.vercel.app/api/v1
        </code>
      </div>

      {/* Auth */}
      <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
        <h2 className="font-bold mb-3">{t('认证方式', 'Authentication')}</h2>
        <p className="text-slate-400 text-sm mb-3">
          {t('所有请求需在 Header 中携带 API Key：', 'All requests require an API Key in the header:')}
        </p>
        <pre className="bg-slate-950/50 px-4 py-3 rounded-xl text-sm text-emerald-300 font-mono overflow-x-auto">
{`Authorization: Bearer lya_your_api_key_here`}
        </pre>
        <p className="text-slate-500 text-xs mt-3">
          {t('在 API Keys 页面生成你的密钥', 'Generate your key on the API Keys page')}
        </p>
      </div>

      {/* Chat Completions */}
      <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
        <h2 className="font-bold mb-3">{t('Chat Completions', 'Chat Completions')}</h2>
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded">POST</span>
          <code className="text-sm text-slate-300 font-mono">/chat</code>
        </div>

        <h3 className="text-sm font-semibold text-slate-300 mb-2">{t('请求参数', 'Request Body')}</h3>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-white/5">
                <th className="text-left py-2 pr-4">{t('参数', 'Param')}</th>
                <th className="text-left py-2 pr-4">{t('类型', 'Type')}</th>
                <th className="text-left py-2 pr-4">{t('必填', 'Required')}</th>
                <th className="text-left py-2">{t('说明', 'Description')}</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4 font-mono text-emerald-300">model</td>
                <td className="py-2 pr-4">string</td>
                <td className="py-2 pr-4">{t('是', 'Yes')}</td>
                <td className="py-2">{t('cyber | video | flow | analytics', 'cyber | video | flow | analytics')}</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4 font-mono text-emerald-300">messages</td>
                <td className="py-2 pr-4">array</td>
                <td className="py-2 pr-4">{t('是', 'Yes')}</td>
                <td className="py-2">{t('消息数组，格式同 OpenAI', 'Message array, same format as OpenAI')}</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4 font-mono text-emerald-300">temperature</td>
                <td className="py-2 pr-4">number</td>
                <td className="py-2 pr-4">{t('否', 'No')}</td>
                <td className="py-2">{t('0-1.5，默认 0.7', '0-1.5, default 0.7')}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-emerald-300">max_tokens</td>
                <td className="py-2 pr-4">number</td>
                <td className="py-2 pr-4">{t('否', 'No')}</td>
                <td className="py-2">{t('最大生成 token 数，默认 64', 'Max tokens to generate, default 64')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-sm font-semibold text-slate-300 mb-2">{t('请求示例', 'Request Example')}</h3>
        <pre className="bg-slate-950/50 px-4 py-3 rounded-xl text-sm text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap">
{`curl https://leyoai.vercel.app/api/v1/chat \\
  -H "Authorization: Bearer lya_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "cyber",
    "messages": [
      {"role": "user", "content": "如何识别钓鱼网站？"}
    ]
  }'`}
        </pre>

        <h3 className="text-sm font-semibold text-slate-300 mb-2 mt-4">{t('响应示例', 'Response Example')}</h3>
        <pre className="bg-slate-950/50 px-4 py-3 rounded-xl text-sm text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap">
{`{
  "id": "chatcmpl-a1b2c3d4",
  "object": "chat.completion",
  "model": "cyber",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "识别钓鱼网站可以从以下几个方面入手..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  }
}`}
        </pre>
      </div>

      {/* Models */}
      <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
        <h2 className="font-bold mb-3">{t('可用模型', 'Available Models')}</h2>
        <div className="space-y-3">
          {[
            { id: 'cyber', name: 'Cyber Model', nameCn: 'AI 安全助手', desc: 'Phishing detection, scam prevention, privacy protection', descCn: '钓鱼网站识别、诈骗信息判断、隐私泄露检测' },
            { id: 'video', name: 'Video Model', nameCn: '视频安全助手', desc: 'Content moderation, risk detection, compliance review', descCn: '内容审核、风险检测、合规审查' },
            { id: 'flow', name: 'Flow Model', nameCn: '流程自动化助手', desc: 'Workflow automation, RPA, integration', descCn: '工作流自动化、RPA、集成' },
            { id: 'analytics', name: 'Analytics Model', nameCn: '数据分析助手', desc: 'Data analysis, visualization, insights', descCn: '数据分析、可视化、洞察' },
          ].map(m => (
            <div key={m.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
              <code className="text-sm text-emerald-300 font-mono shrink-0">{m.id}</code>
              <div>
                <span className="text-sm font-medium">{t(m.nameCn, m.name)}</span>
                <span className="text-xs text-slate-500 ml-2">{t(m.descCn, m.desc)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Python SDK */}
      <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
        <h2 className="font-bold mb-3">{t('Python SDK 示例', 'Python SDK Example')}</h2>
        <pre className="bg-slate-950/50 px-4 py-3 rounded-xl text-sm text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap">
{`from openai import OpenAI

client = OpenAI(
    base_url="https://leyoai.vercel.app/api/v1",
    api_key="lya_your_api_key_here"
)

response = client.chat.completions.create(
    model="cyber",
    messages=[
        {"role": "user", "content": "如何识别钓鱼网站？"}
    ]
)

print(response.choices[0].message.content)`}
        </pre>
        <p className="text-slate-500 text-xs mt-3">
          {t('直接使用 OpenAI SDK，只需修改 base_url 和 api_key', 'Use the OpenAI SDK directly — just change base_url and api_key')}
        </p>
      </div>

      {/* Error codes */}
      <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
        <h2 className="font-bold mb-3">{t('错误码', 'Error Codes')}</h2>
        <div className="space-y-2 text-sm">
          <div className="flex gap-4">
            <code className="text-red-400 font-mono shrink-0 w-8">401</code>
            <span className="text-slate-400">{t('API Key 无效或缺失', 'Invalid or missing API key')}</span>
          </div>
          <div className="flex gap-4">
            <code className="text-red-400 font-mono shrink-0 w-8">400</code>
            <span className="text-slate-400">{t('请求参数错误', 'Invalid request parameters')}</span>
          </div>
          <div className="flex gap-4">
            <code className="text-red-400 font-mono shrink-0 w-8">429</code>
            <span className="text-slate-400">{t('配额用完，请升级套餐', 'Quota exceeded, upgrade your plan')}</span>
          </div>
          <div className="flex gap-4">
            <code className="text-red-400 font-mono shrink-0 w-8">502</code>
            <span className="text-slate-400">{t('模型推理失败，请稍后重试', 'Model inference failed, retry later')}</span>
          </div>
        </div>
      </div>

      {/* Rate limits */}
      <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
        <h2 className="font-bold mb-3">{t('配额说明', 'Rate Limits')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-white/5">
                <th className="text-left py-2 pr-4">{t('套餐', 'Plan')}</th>
                <th className="text-left py-2 pr-4">Cyber</th>
                <th className="text-left py-2 pr-4">Video</th>
                <th className="text-left py-2 pr-4">Flow</th>
                <th className="text-left py-2">Analytics</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4 font-medium">{t('免费版', 'Free')}</td>
                <td className="py-2 pr-4">100/{t('月', 'mo')}</td>
                <td className="py-2 pr-4">500/{t('月', 'mo')}</td>
                <td className="py-2 pr-4">500/{t('月', 'mo')}</td>
                <td className="py-2">1,000/{t('月', 'mo')}</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4 font-medium text-blue-400">{t('起步版', 'Starter')}</td>
                <td className="py-2 pr-4">5,000/{t('月', 'mo')}</td>
                <td className="py-2 pr-4">5,000/{t('月', 'mo')}</td>
                <td className="py-2 pr-4">5,000/{t('月', 'mo')}</td>
                <td className="py-2">10,000/{t('月', 'mo')}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-indigo-400">{t('专业版', 'Pro')}</td>
                <td className="py-2 pr-4">30,000/{t('月', 'mo')}</td>
                <td className="py-2 pr-4">30,000/{t('月', 'mo')}</td>
                <td className="py-2 pr-4">30,000/{t('月', 'mo')}</td>
                <td className="py-2">50,000/{t('月', 'mo')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
