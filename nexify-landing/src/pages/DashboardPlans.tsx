import { useEffect, useState } from 'react'
import { useAuth } from '../components/AuthProvider'
import { supabase } from '../lib/supabase'

interface PlanQuota {
  plan: string
  product: string
  monthly_limit: number
  context_window: number
  priority: number
  features: Record<string, unknown>
}

const PLAN_ORDER = ['free', 'starter', 'pro', 'enterprise']

const PLAN_LABELS: Record<string, string> = {
  free: '免费版',
  starter: '起步版',
  pro: '专业版',
  enterprise: '企业版',
}

const PLAN_PRICES: Record<string, string> = {
  free: '¥0',
  starter: '¥29',
  pro: '¥79',
  enterprise: '¥299',
}

const PLAN_PERIODS: Record<string, string> = {
  free: '永久免费',
  starter: '/月',
  pro: '/月',
  enterprise: '/月起',
}

const PLAN_DESCS: Record<string, string> = {
  free: '个人学习与体验',
  starter: '小团队安全防护',
  pro: '中小企业安全部门',
  enterprise: '大规模定制需求',
}

// 从 plan_quotas 表提取某套餐四产品的月度限额，生成 feature 列表
function buildFeatures(quotas: PlanQuota[]): string[] {
  const cyber = quotas.find(q => q.product === 'cyber')
  const video = quotas.find(q => q.product === 'video')
  const flow  = quotas.find(q => q.product === 'flow')
  const anly  = quotas.find(q => q.product === 'analytics')

  const fmt = (q: PlanQuota | undefined, unit: string) => {
    if (!q) return null
    if (q.monthly_limit < 0) return `✦ 不限${unit}/月`
    return `${q.monthly_limit.toLocaleString()}${unit}/月`
  }

  const feats: string[] = []
  if (cyber) feats.push(`Cyber ${fmt(cyber, '次')}`)
  if (video) feats.push(`Video ${fmt(video, '分钟')}`)
  if (flow)   feats.push(`Flow  ${fmt(flow, '次')}`)
  if (anly)   feats.push(`Analytics ${fmt(anly, '次')}`)

  if (cyber) {
    const f = cyber.features as Record<string, unknown>
    if (f?.['api_access'] || f?.['api_access'] === 1) feats.push('API 接入')
    if (f?.['sla']) feats.push(`SLA ${f['sla']}`)
    if (f?.['dedicated_support']) feats.push('7×24 技术支持')
    if (f?.['private_deploy']) feats.push('私有化部署')
    if (f?.['custom_model']) feats.push('定制模型训练')
  }

  feats.push('HF Spaces 在线访问')
  return feats
}

export default function DashboardPlans() {
  const { user } = useAuth()
  const [userPlan, setUserPlan] = useState('free')
  const [allQuotas, setAllQuotas] = useState<PlanQuota[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return

      // 1. 查用户套餐
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single()
      if (profile?.plan) setUserPlan(profile.plan)

      // 2. 查所有配额（供四套餐展示用）
      const { data: quotas } = await supabase
        .from('plan_quotas')
        .select('plan, product, monthly_limit, context_window, priority, features')
        .in('plan', PLAN_ORDER)
        .order('plan')
        .order('product')

      if (quotas) setAllQuotas(quotas)
      setLoading(false)
    }

    load()
  }, [user])

  const currentQuota = allQuotas.filter(q => q.plan === userPlan)
  const currentLabel = PLAN_LABELS[userPlan] ?? userPlan
  const currentPrice = PLAN_PRICES[userPlan] ?? '¥0'
  const currentPeriod = PLAN_PERIODS[userPlan] ?? ''

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">套餐</h1>
        <p className="text-slate-400 text-sm mt-1">管理你的订阅和套餐信息</p>
      </div>

      {/* Current plan banner */}
      <div className="bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-indigo-500/30 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">💎</span>
              <h2 className="text-xl font-bold">当前套餐：{currentLabel}</h2>
            </div>
            <p className="text-slate-400 text-sm">
              {user?.email}
              {currentQuota[0] && currentQuota[0].monthly_limit > 0
                ? ` · 每月 ${currentQuota[0].monthly_limit.toLocaleString()} 次调用`
                : ' · 不限用量'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-white">{currentPrice}</div>
            <div className="text-slate-500 text-sm">{currentPeriod}</div>
          </div>
        </div>
      </div>

      {/* Plan comparison */}
      <div>
        <h2 className="text-lg font-bold mb-4">套餐对比</h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLAN_ORDER.map(planKey => {
              const isCurrent = planKey === userPlan
              const isDisabled = PLAN_ORDER.indexOf(planKey) > PLAN_ORDER.indexOf(userPlan)
              const planQuotas = allQuotas.filter(q => q.plan === planKey)
              const features = buildFeatures(planQuotas)

              return (
                <div
                  key={planKey}
                  className={`relative rounded-2xl border p-6 flex flex-col ${
                    isCurrent
                      ? 'bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border-indigo-500/50'
                      : 'bg-slate-900/50 border-white/5'
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full">当前方案</span>
                    </div>
                  )}
                  {isDisabled && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-slate-700 text-slate-300 text-xs font-bold px-4 py-1 rounded-full">即将开放</span>
                    </div>
                  )}

                  <div className="text-center mb-6 pt-2">
                    <h3 className="text-xl font-bold mb-2">{PLAN_LABELS[planKey]}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-black">{PLAN_PRICES[planKey]}</span>
                      <span className="text-slate-500 text-sm">{PLAN_PERIODS[planKey]}</span>
                    </div>
                    <p className="text-slate-500 text-sm mt-2">{PLAN_DESCS[planKey]}</p>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {features.slice(0, 5).map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-indigo-400 shrink-0">✓</span>
                        <span className="text-slate-300">{f}</span>
                      </li>
                    ))}
                    {features.length > 5 && (
                      <li className="text-slate-600 text-xs">+{features.length - 5} 更多权益</li>
                    )}
                  </ul>

                  <button
                    disabled={isCurrent || isDisabled}
                    className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                      isCurrent
                        ? 'bg-indigo-600/20 text-indigo-400 cursor-default'
                        : isDisabled
                        ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {isCurrent ? '当前方案' : isDisabled ? '即将开放' : '升级'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
