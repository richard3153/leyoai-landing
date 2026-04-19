import { useEffect, useState } from 'react'
import { useAuth } from '../components/AuthProvider'
import { supabase } from '../lib/supabase'
import { useLang } from '../contexts/LanguageContext'

interface ApiKeyRow {
  id: string
  name: string
  key_prefix: string
  key_hash: string
  is_active: boolean
  created_at: string
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

/** SHA-256 哈希 API Key（浏览器端） */
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function DashboardKeys() {
  const { user } = useAuth()
  const { t } = useLang()
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchKeys = async () => {
    if (!user) return
    const { data } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, key_hash, is_active, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setKeys(data)
    setLoading(false)
  }

  useEffect(() => { fetchKeys() }, [user])

  const handleCreate = async () => {
    if (!user || !newKeyName.trim()) return
    setCreating(true)
    const fullKey = generateApiKey()
    const prefix = fullKey.slice(0, 8)
    const hashed = await hashApiKey(fullKey)
    const { error } = await supabase.from('api_keys').insert([{
      user_id: user.id,
      name: newKeyName.trim(),
      key_prefix: prefix,
      key_hash: hashed,
      is_active: true,
    }])
    if (!error) {
      setRevealedKey(fullKey)
      setNewKeyName('')
      setShowForm(false)
      setCopied(false)
      await fetchKeys()
    } else {
      console.error('Failed to create API key:', error)
    }
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('api_keys').delete().eq('id', id)
    setKeys(prev => prev.filter(k => k.id !== id))
  }

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('API 密钥管理', 'API Key Management')}</h1>
          <p className="text-slate-400 text-sm mt-1">{t('管理你的 API 密钥', 'Manage your API keys')}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/25"
        >
          + {t('生成新 Key', 'Generate New Key')}
        </button>
      </div>

      {/* Newly created key reveal */}
      {revealedKey && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-emerald-400 font-bold mb-1">🔑 {t('新密钥已生成', 'New Key Generated')}</h3>
              <p className="text-slate-400 text-sm mb-3">{t('请立即保存此密钥，关闭后无法再次查看完整密钥', 'Save this key now - it won\'t be shown again')}</p>
              <code className="block bg-slate-950/50 px-4 py-3 rounded-xl text-sm text-emerald-300 font-mono break-all">
                {revealedKey}
              </code>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => handleCopy(revealedKey)} className="px-4 py-2 bg-white/5 border border-white/10 text-sm rounded-lg hover:bg-white/10">
                {copied ? t('✓ 已复制', '✓ Copied') : t('复制', 'Copy')}
              </button>
              <button onClick={() => setRevealedKey(null)} className="px-4 py-2 bg-white/5 border border-white/10 text-sm rounded-lg hover:bg-white/10">
                {t('关闭', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
          <h3 className="font-bold mb-4">{t('创建新密钥', 'Create New Key')}</h3>
          <div className="flex gap-3">
            <input
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              placeholder={t('密钥名称，例如：生产环境', 'Key name, e.g. Production')}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newKeyName.trim()}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              {creating ? t('生成中…', 'Generating…') : t('生成', 'Generate')}
            </button>
            <button onClick={() => { setShowForm(false); setNewKeyName('') }} className="px-4 py-3 bg-white/5 border border-white/10 text-slate-400 rounded-xl hover:bg-white/10">
              {t('取消', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 h-20 animate-pulse" />)}
        </div>
      ) : keys.length === 0 ? (
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-4">🔑</div>
          <h3 className="text-lg font-bold mb-2">{t('还没有 API Key', 'No API Keys Yet')}</h3>
          <p className="text-slate-400 text-sm">{t('点击"生成新 Key"创建你的第一个密钥', 'Click "Generate New Key" to create your first key')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map(key => (
            <div key={key.id} className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold truncate">{key.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    key.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {key.is_active ? t('活跃', 'Active') : t('已吊销', 'Revoked')}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <code className="font-mono">{key.key_prefix}••••••••</code>
                  <span>{t(`创建于 ${formatDate(key.created_at)}`, `Created ${formatDate(key.created_at)}`)}</span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(key.id)}
                className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                {t('删除', 'Delete')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
