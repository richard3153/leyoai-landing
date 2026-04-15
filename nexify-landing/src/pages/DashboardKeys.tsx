import { useEffect, useState } from 'react'
import { useAuth } from '../components/AuthProvider'
import { supabase } from '../lib/supabase'

interface ApiKeyRow {
  id: string
  name: string
  key_prefix: string
  key_suffix: string
  created_at: string
  status: 'active' | 'revoked'
}

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const prefix = 'lya_'
  let key = prefix
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}

export default function DashboardKeys() {
  const { user } = useAuth()
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchKeys = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix, key_suffix, created_at, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setKeys(data as ApiKeyRow[])
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [user])

  const handleCreateKey = async () => {
    if (!user || !newKeyName.trim()) return
    setCreating(true)

    const fullKey = generateApiKey()
    const prefix = fullKey.slice(0, 8)
    const suffix = fullKey.slice(-4)

    try {
      const { error } = await supabase
        .from('api_keys')
        .insert([{
          user_id: user.id,
          name: newKeyName.trim(),
          key_prefix: prefix,
          key_suffix: suffix,
          key_hash: fullKey, // In production, this should be hashed
          status: 'active',
        }])

      if (!error) {
        setRevealedKey(fullKey)
        setNewKeyName('')
        setShowCreateForm(false)
        setCopied(false)
        await fetchKeys()
      }
    } catch {
      // Silently fail
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id)

      if (!error) {
        setKeys(prev => prev.filter(k => k.id !== id))
      }
    } catch {
      // Silently fail
    }
  }

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-slate-400 text-sm mt-1">管理你的 API 密钥</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/25"
        >
          + 生成新 Key
        </button>
      </div>

      {/* Revealed key banner */}
      {revealedKey && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-emerald-400 font-bold mb-1">🔑 新密钥已生成</h3>
              <p className="text-slate-400 text-sm mb-3">请立即保存此密钥，关闭后无法再次查看完整密钥</p>
              <code className="block bg-slate-950/50 px-4 py-3 rounded-xl text-sm text-emerald-300 font-mono break-all">
                {revealedKey}
              </code>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleCopyKey(revealedKey)}
                className="px-4 py-2 bg-white/5 border border-white/10 text-sm rounded-lg hover:bg-white/10 transition-colors"
              >
                {copied ? '✓ 已复制' : '复制'}
              </button>
              <button
                onClick={() => setRevealedKey(null)}
                className="px-4 py-2 bg-white/5 border border-white/10 text-sm rounded-lg hover:bg-white/10 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create key form */}
      {showCreateForm && (
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
          <h3 className="font-bold mb-4">创建新密钥</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              placeholder="密钥名称，例如：生产环境"
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all"
            />
            <button
              onClick={handleCreateKey}
              disabled={creating || !newKeyName.trim()}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? '生成中...' : '生成'}
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setNewKeyName('') }}
              className="px-4 py-3 bg-white/5 border border-white/10 text-slate-400 rounded-xl hover:bg-white/10 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 animate-pulse">
              <div className="h-5 bg-white/5 rounded w-1/3 mb-3" />
              <div className="h-4 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : keys.length === 0 ? (
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-4">🔑</div>
          <h3 className="text-lg font-bold text-white mb-2">还没有 API Key</h3>
          <p className="text-slate-400 text-sm">点击"生成新 Key"创建你的第一个密钥</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map(key => (
            <div key={key.id} className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold truncate">{key.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    key.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {key.status === 'active' ? '活跃' : '已吊销'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <code className="font-mono">{key.key_prefix}{'****'}</code>
                  <span>创建于 {formatDate(key.created_at)}</span>
                </div>
              </div>
              <button
                onClick={() => handleDeleteKey(key.id)}
                className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
