import { useAuth } from '../components/AuthProvider'

const PLANS = [
  {
    name: '免费版',
    price: '¥0',
    period: '永久免费',
    desc: '个人学习与体验',
    features: ['Cyber 100次/月', 'Video 500分钟/月', 'Flow 500次/月', 'Analytics 1,000次/月', 'HF Spaces 在线访问'],
    current: true,
    disabled: false,
  },
  {
    name: '起步版',
    price: '¥29',
    period: '/月',
    desc: '小团队安全防护',
    features: ['Cyber 5,000次/月', 'Video 5,000分钟/月', 'Flow 5,000次/月', 'Analytics 10,000次/月', 'API 接入'],
    current: false,
    disabled: true,
  },
  {
    name: '专业版',
    price: '¥79',
    period: '/月',
    desc: '中小企业安全部门',
    features: ['Cyber 30,000次/月', 'Video 30,000分钟/月', 'Flow 30,000次/月', 'Analytics 50,000次/月', 'SLA 99.5%'],
    current: false,
    disabled: true,
  },
  {
    name: '企业版',
    price: '¥299',
    period: '/月起',
    desc: '大规模定制需求',
    features: ['四款产品均不限量', '私有化部署', '定制模型训练', '7×24 技术支持'],
    current: false,
    disabled: true,
  },
]

export default function DashboardPlans() {
  const { user } = useAuth()

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold">套餐</h1>
        <p className="text-slate-400 text-sm mt-1">管理你的订阅和套餐信息</p>
      </div>

      {/* Current plan */}
      <div className="bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-indigo-500/30 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">💎</span>
              <h2 className="text-xl font-bold">当前套餐：免费版</h2>
            </div>
            <p className="text-slate-400 text-sm">
              {user?.email} · 每日 100 次调用 · 基础模型访问
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-white">¥0</div>
            <div className="text-slate-500 text-sm">永久免费</div>
          </div>
        </div>
      </div>

      {/* Plan comparison */}
      <div>
        <h2 className="text-lg font-bold mb-4">套餐对比</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 ${
                plan.current
                  ? 'bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border-indigo-500/50'
                  : 'bg-slate-900/50 border-white/5'
              } ${plan.disabled ? 'opacity-70' : ''}`}
            >
              {/* Current badge */}
              {plan.current && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                    当前方案
                  </span>
                </div>
              )}

              {/* Coming soon badge */}
              {plan.disabled && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-slate-700 text-slate-300 text-xs font-bold px-4 py-1 rounded-full">
                    即将开放
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="text-center mb-6 pt-2">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className="text-slate-500 text-sm">{plan.period}</span>
                </div>
                <p className="text-slate-500 text-sm mt-2">{plan.desc}</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <span className="text-indigo-400">✓</span>
                    <span className="text-slate-300">{f}</span>
                  </li>
                ))}
              </ul>

              {/* Button */}
              <button
                disabled={plan.current || plan.disabled}
                className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                  plan.current
                    ? 'bg-indigo-600/20 text-indigo-400 cursor-default'
                    : plan.disabled
                    ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {plan.current ? '当前方案' : plan.disabled ? '即将开放' : '升级'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
