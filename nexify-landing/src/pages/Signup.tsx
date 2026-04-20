import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthProvider'
import { useLang } from '../contexts/LanguageContext'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp, signIn } = useAuth()
  const navigate = useNavigate()
  const { t } = useLang()

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return t('密码至少需要8个字符', 'Password must be at least 8 characters')
    if (!/[a-zA-Z]/.test(pwd)) return t('密码需要包含字母', 'Password must contain letters')
    if (!/[0-9]/.test(pwd)) return t('密码需要包含数字', 'Password must contain numbers')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('两次输入的密码不一致', 'Passwords do not match'))
      return
    }

    const pwdError = validatePassword(password)
    if (pwdError) {
      setError(pwdError)
      return
    }

    setLoading(true)

    const { error: signUpError } = await signUp(email, password)
    if (signUpError) {
      setError(signUpError === 'User already registered' ? t('该邮箱已被注册', 'Email already registered') : signUpError)
      setLoading(false)
      return
    }

    // Auto sign in after signup
    const { error: signInError } = await signIn(email, password)
    if (signInError) {
      // If auto-login fails, redirect to login page
      navigate('/login')
      return
    }

    navigate('/dashboard')
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
            <img src="/logo/leyoai-logo-horizontal-light.svg" alt="LeyoAI" className="h-10" />
          </Link>
          <h1 className="text-2xl font-bold mt-6 mb-2">{t('创建账号', 'Create Account')}</h1>
          <p className="text-slate-400 text-sm">{t('注册以开始使用 LeyoAI', 'Sign up to get started with LeyoAI')}</p>
        </div>

        {/* Form */}
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

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{t('密码', 'Password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder={t('至少8位，包含字母和数字', 'At least 8 chars, letters and numbers')}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{t('确认密码', 'Confirm Password')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              placeholder={t('再次输入密码', 'Re-enter password')}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('注册中...', 'Signing up...') : t('免费注册', 'Sign Up')}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          {t('已有账号？', 'Already have an account?')}{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            {t('登录', 'Sign In')}
          </Link>
        </p>
      </div>
    </div>
  )
}
