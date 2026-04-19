import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { useLang } from '../contexts/LanguageContext'
import { LanguageToggle } from './LanguageToggle'
import { useState } from 'react'

export function DashboardLayout() {
  const { user, signOut } = useAuth()
  const { t } = useLang()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const SIDEBAR_ITEMS = [
    { label: t('概览', 'Overview'), href: '/dashboard', icon: '📊' },
    { label: 'API Keys', href: '/dashboard/keys', icon: '🔑' },
    { label: t('API 文档', 'API Docs'), href: '/dashboard/api-docs', icon: '📖' },
    { label: t('套餐', 'Plans'), href: '/dashboard/plans', icon: '💎' },
  ]

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-white/5 z-50 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-500/25">
              L
            </div>
            <span className="font-bold text-lg">LeyoAI</span>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {SIDEBAR_ITEMS.map(item => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/dashboard'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center text-xs font-bold">
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email}</p>
              <p className="text-xs text-slate-500">{t('免费版', 'Free Plan')}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-slate-500 hover:text-white transition-colors"
              title={t('退出登录', 'Sign Out')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-6 h-14">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="hidden lg:block text-sm text-slate-500">{t('控制台', 'Dashboard')}</div>
            <div className="flex items-center gap-4">
              <LanguageToggle />
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-medium">
                ● {t('在线', 'Active')}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
