import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { to: '/setup', label: 'Setup' },
  { to: '/config', label: 'Config' },
  { to: '/knowledge', label: 'Knowledge' },
  { to: '/goal', label: 'Goal' },
]

export default function Layout() {
  const navigate = useNavigate()
  const { user, logout: doLogout } = useAuth()

  if (!user) return null

  const logout = async () => {
    await doLogout()
    navigate('/login')
  }

  const copyRepo = () => {
    void navigator.clipboard?.writeText(user.repo)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <nav className="border-b bg-white px-6 py-3 flex items-center gap-6 sticky top-0 z-10">
        <span className="font-bold text-lg">⚡ SuperPmAgent</span>
        <div className="flex gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={copyRepo}
            className="text-xs text-gray-500 hover:text-gray-900 font-mono"
            title="点击复制仓库地址"
          >
            📦 {user.repo}
          </button>
          <div className="w-px h-4 bg-gray-300" />
          <span className="text-sm font-medium">@{user.username}</span>
          <button
            onClick={logout}
            className="text-xs text-gray-500 hover:text-gray-900"
            title="清 cookie + 跳 /login(撤销 PAT 请去 GitHub)"
          >
            退出
          </button>
        </div>
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
