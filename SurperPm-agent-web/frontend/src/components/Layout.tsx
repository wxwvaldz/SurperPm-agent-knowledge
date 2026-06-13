import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/setup', label: 'Setup' },
  { to: '/config', label: 'Config' },
  { to: '/knowledge', label: 'Knowledge' },
  { to: '/goal', label: 'Goal' },
]

export default function Layout() {
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
        <div className="ml-auto text-sm text-gray-500">
          v0.1.0 wireframe
        </div>
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
