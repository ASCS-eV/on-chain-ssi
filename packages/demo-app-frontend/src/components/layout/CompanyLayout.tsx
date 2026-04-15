import { type ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SatelliteDishIcon, Building, ListX, ChevronLeft, ChevronRight } from 'lucide-react'
import { UserBadge } from '../ui/UserBadge'

interface CompanyLayoutProps {
  children: ReactNode
}

export function CompanyLayout({ children }: CompanyLayoutProps) {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const navItems = [
    { label: 'Onboarding', path: '/company/onboarding', icon: SatelliteDishIcon },
    { label: 'Revocation List', path: '/company/revocations', icon: ListX },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* SIDEBAR (Dark Theme - Company Emerald Variant) */}
      <aside
        className={`bg-slate-900 text-white flex flex-col fixed h-full z-20 shadow-xl transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Header */}
        <div className="h-16 flex items-center px-4 border-b border-slate-800 overflow-hidden whitespace-nowrap">
          <Building className="w-8 h-8 text-emerald-500 min-w-[32px]" />
          <span
            className={`font-bold text-lg tracking-wide ml-3 transition-opacity duration-200 ${
              isCollapsed ? 'opacity-0 w-0' : 'opacity-100'
            }`}
          >
            Company
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : ''}
                className={`flex items-center px-3 py-3 rounded-lg transition-all duration-200 group overflow-hidden whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon
                  className={`w-6 h-6 min-w-[24px] ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}
                />
                <span
                  className={`font-medium ml-3 transition-opacity duration-200 ${
                    isCollapsed ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`mb-4 p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition-colors ${
            isCollapsed ? 'self-center' : 'self-end mr-4'
          }`}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>

        {/* User Profile */}
        <div className="border-t border-slate-800 overflow-hidden">
          <UserBadge isCollapsed={isCollapsed} />
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        {/* Top Bar */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center px-8 text-sm text-slate-500 sticky top-0 z-10">
          <span>Company Portal</span>
          <span className="mx-2">/</span>
          <span className="font-medium text-slate-900 capitalize">
            {location.pathname.split('/').pop() || 'Dashboard'}
          </span>
        </div>

        <div className="p-8 flex-1">
          <div className="w-full max-w-[1920px]">{children}</div>
        </div>

        <footer className="border-t border-slate-200 bg-white py-4 px-8 text-left text-xs text-slate-400">
          &copy; 2026 ASC-S e.V. | Tezos Etherlink Testnet
        </footer>
      </main>
    </div>
  )
}
