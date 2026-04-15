import { useEffect, useState } from 'react'
import { useAuth } from '../components/AuthProvider'
import { supabase } from '../lib/supabase'

interface UsageData {
  cyber: number
  video: number
  flow: number
  analytics: number
}

interface QuotaData {
  cyber: number
  video: number
  flow: number
  analytics: number
}

const PRODUCTS = [
  { key: 'cyber' as const, name: 'Cyber Model', icon: '🛡️', color: 'from-emerald-500 to-teal-600', barColor: 'bg-emerald-500' },
  { key: 'video' as const, name: 'Video Model', icon: '🎬', color: 'from-violet-500 to-purple-600', barColor: 'bg-violet-500' },
  { key: 'flow' as const, name: 'Flow Model', icon: '⚙️', color: 'from-blue-500 to-cyan-600', barColor: 'bg-blue-500' },
  { key: 'analytics' as const, name: 'Analytics Model', icon: '📊', color: 'from-orange-500 to-amber-600', barColor: 'bg-orange-500' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [usage, setUsage] = useState<UsageData>({ cyber: 0, video: 0, flow: 0, analytics: 0 })
  const [quotas, setQuotas] = useState<QuotaData>({ cyber: 100, video: 100, flow: 100, analytics: 100 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!user) return

      try {
        // Get current month range
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        // Fetch usage logs for current month
        const { data: usageData, error: usageError } = await supabase
          .from('usage_logs')
          .select('product, count')
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth)

        if (!usageError && usageData) {
          const aggregated: UsageData = { cyber: 0, video: 0, flow: 0, analytics: 0 }
          usageData.forEach((row: any) => {
            const product = row.product as keyof UsageData
            if (product in aggregated) {
              aggregated[product] += row.count || 1
            }
          })
          setUsage(aggregated)
        }

        // Fetch plan quotas
        const { data: quotaData, error: quotaError } = await supabase
          .from('plan_quotas')
          .select('cyber, video, flow, analytics')
          .eq('plan_name', 'free')
          .single()

        if (!quotaError && quotaData) {
          setQuotas({
            cyber: quotaData.cyber || 100,
            video: quotaData.video || 100,
            flow: quotaData.flow || 100,
            analytics: quotaData.analytics || 100,
          })
        }
      } catch {
        // Silently fail - will show placeholder data
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold">概览</h1>
        <p className="text-slate-400 text-sm mt-1">查看你的账号信息和模型用量</p>
      </div>

      {/* Account info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-lg">📧</div>
            <span className="text-sm text-slate-400">邮箱</span>
          </div>
          <p className="text-white font-medium truncate">{user?.email || '—'}</p>
        </div>

        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center text-lg">📅</div>
            <span className="text-sm text-slate-400">注册时间</span>
          </div>
          <p className="text-white font-medium">{formatDate(user?.created_at)}</p>
        </div>

        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center text-lg">💎</div>
            <span className="text-sm text-slate-400">当前套餐</span>
          </div>
          <p className="text-white font-medium">免费版</p>
        </div>
      </div>

      {/* Usage cards */}
      <div>
        <h2 className="text-lg font-bold mb-4">本月用量</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PRODUCTS.map(product => {
            const used = usage[product.key]
            const quota = quotas[product.key]
            const percentage = quota > 0 ? Math.min((used / quota) * 100, 100) : 0

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
                      <span className="text-slate-500 text-sm">/ {quota} 次</span>
                    </>
                  )}
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${product.barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {percentage >= 100 ? '已达到配额上限' : `已使用 ${percentage.toFixed(1)}%`}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
