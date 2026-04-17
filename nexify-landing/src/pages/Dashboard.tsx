import { useEffect, useState } from 'react'
import { useAuth } from '../components/AuthProvider'
import { supabase } from '../lib/supabase'
import { useLang } from '../contexts/LanguageContext'

const HF_SPACE_MAP: Record<string, string> = {
  cyber:     'https://FFZwai-leyoai-cyber-assistant.hf.space',
  video:     'https://FFZwai-leyoai-video-safety.hf.space',
  flow:      'https://FFZwai-leyoai-flow-assistant.hf.space',
  analytics: 'https://FFZwai-leyoai-analytics-assistant.hf.space',
}

const PRODUCTS = [
  { key: 'cyber',     name: 'Cyber Model',     icon: '🛡️', color: 'from-emerald-500 to-teal-600',   barColor: 'bg-emerald-500' },
  { key: 'video',     name: 'Video Model',      icon: '🎬', color: 'from-violet-500 to-purple-600',  barColor: 'bg-violet-500' },
  { key: 'flow',      name: 'Flow Model',        icon: '⚙️', color: 'from-blue-500 to-cyan-600',      barColor: 'bg-blue-500' },
  { key: 'analytics', name: 'Analytics Model',   icon: '📊', color: 'from-orange-500 to-amber-600',    barColor: 'bg-orange-500' },
]

export default function Dashboard() {
  const { user, session } = useAuth()
  const { t } = useLang()
  const [usage, setUsage] = useState<Record<string, number>>({})
  const [quotas, setQuotas] = useState<Record<string, number>>({})
  const [userPlan, setUserPlan] = useState('free')
  const [loading, setLoading] = useState(true)

  const PLAN_LABELS: Record<string, string> = {
    free: t('免费版', 'Free'),
    starter: t('起步版', 'Starter'),
    pro: t('专业版', 'Pro'),
    enterprise: t('企业版', 'Enterprise'),
  }

  const openAssistant = (productKey: string) => {
    const baseUrl = HF_SPACE_MAP[productKey]
    if (!baseUrl) return
    const url = session?.access_token
      ? `${baseUrl}/?token=${encodeURIComponent(session.access_token)}`
      : baseUrl
    window.open(url, '_blank', 'noreferrer')
  }

  useEffect(() => {
    async function fetchData() {
      if (!user) return

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const plan = userPlan

      // 1. 查询用户套餐
      const { data: profileData } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single()
      if (profileData?.plan) setUserPlan(profileData.plan)

      // 2. 查询当月用量（按产品计数）
      const { data: usageRows } = await supabase
        .from('usage_logs')
        .select('product')
        .eq('user_id', user.id)
        .gte('created_at', monthStart)

      const usageMap: Record<string, number> = { cyber: 0, video: 0, flow: 0, analytics: 0 }
      ;(usageRows ?? []).forEach((row: { product: string }) => {
        if (row.product in usageMap) usageMap[row.product]++
      })
      setUsage(usageMap)

      // 3. 查询配额（该套餐所有产品）
      const { data: quotaRows } = await supabase
        .from('plan_quotas')
        .select('product, monthly_limit')
        .eq('plan', plan)

      const quotaMap: Record<string, number> = { cyber: 100, video: 100, flow: 100, analytics: 100 }
      ;(quotaRows ?? []).forEach(row => {
        if (row.product in quotaMap) quotaMap[row.product] = row.monthly_limit
      })
      setQuotas(quotaMap)
      setLoading(false)
    }

    fetchData()
  }, [user, userPlan])

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t('概览', 'Overview')}</h1>
        <p className="text-slate-400 text-sm mt-1">{t('查看你的账号信息和模型用量', 'View your account info and model usage')}</p>
      </div>

      {/* Account cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-lg">📧</div>
            <span className="text-sm text-slate-400">{t('邮箱', 'Email')}</span>
          </div>
          <p className="text-white font-medium truncate">{user?.email || '—'}</p>
        </div>

        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center text-lg">📅</div>
            <span className="text-sm text-slate-400">{t('注册时间', 'Registered')}</span>
          </div>
          <p className="text-white font-medium">{formatDate(user?.created_at)}</p>
        </div>

        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center text-lg">💎</div>
            <span className="text-sm text-slate-400">{t('当前套餐', 'Current Plan')}</span>
          </div>
          <p className="text-white font-medium">{PLAN_LABELS[userPlan] ?? userPlan}</p>
        </div>
      </div>

      {/* Usage cards */}
      <div>
        <h2 className="text-lg font-bold mb-4">{t('本月用量', 'This Month Usage')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PRODUCTS.map(product => {
            const used = usage[product.key] ?? 0
            const quota = quotas[product.key] ?? 100
            const unlimited = quota < 0
            const percentage = unlimited ? 0 : Math.min((used / quota) * 100, 100)

            return (
              <div key={product.key} className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${product.color} flex items-center justify-center text-lg`}>
                      {product.icon}
                    </div>
                    <span className="font-semibold">{product.name}</span>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-3">
                  {loading ? (
                    <div className="h-7 w-20 bg-white/5 rounded animate-pulse" />
                  ) : (
                    <>
                      <span className="text-2xl font-bold">{used}</span>
                      <span className="text-slate-500 text-sm">
                        {unlimited ? ' / ∞' : ` / ${quota}`}
                      </span>
                    </>
                  )}
                </div>

                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${product.barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {unlimited
                    ? t('✦ 不限用量', '✦ Unlimited')
                    : percentage >= 100
                    ? t('已达到配额上限', 'Quota limit reached')
                    : t(`已使用 ${percentage.toFixed(1)}%`, `Used ${percentage.toFixed(1)}%`)}
                </p>
                <button
                  onClick={() => openAssistant(product.key)}
                  className="mt-3 w-full py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-600/20 to-violet-600/20 border border-indigo-500/20 text-indigo-400 hover:from-indigo-600/30 hover:to-violet-600/30 hover:border-indigo-500/40 transition-all"
                >
                  🚀 {t('打开助手', 'Open Assistant')}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
