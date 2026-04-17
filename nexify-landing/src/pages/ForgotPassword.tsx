import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../components/AuthProvider'
import { useLang } from '../contexts/LanguageContext'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { resetPassword } = useAuth()
  const { t } = useLang()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await resetPassword(email)
    if (error) {
      setError(error === 'User not found' ? t('未找到该邮箱对应的账号', 'No account found with this email') : error)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-500/25">
              L
            </div>
            <span className="font-bold text-xl text-white">LeyoAI</span>
          </Link>
          <h1 className="text-2xl font-bold mt-6 mb-2">{t('忘记密码', 'Forgot Password')}</h1>
          <p className="text-slate-400 text-sm">{t('输入邮箱，我们将发送重置链接', 'Enter your email and we\'ll send you a reset link')}</p>
        </div>

        {sent ? (
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">📧</div>
            <h2 className="text-xl font-bold text-white mb-2">{t('重置链接已发送到您的邮箱', 'Reset link sent to your email')}</h2>
            <p className="text-slate-400 text-sm mb-6">{t('请检查您的收件箱并按照提示重置密码', 'Check your inbox and follow the instructions to reset your password')}</p>
            <Link
              to="/login"
              className="inline-block w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/25"
            >
              {t('返回登录', 'Back to Login')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-slate-900/50 border border-white/5 rounded-2xl p-8 space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('邮箱', 'Email')}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('发送中...', 'Sending...') : t('发送重置链接', 'Send Reset Link')}
            </button>
          </form>
        )}

        <p className="text-center text-slate-500 text-sm mt-6">
          {t('记起密码了？', 'Remember your password?')}{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            {t('返回登录', 'Back to Login')}
          </Link>
        </p>
      </div>
    </div>
  )
}
