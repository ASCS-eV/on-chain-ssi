import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SatelliteDishIcon, Building, ListX } from 'lucide-react'
import { UserBadge } from '../ui/UserBadge'

interface CompanyLayoutProps {
  children: ReactNode
}

export function CompanyLayout({ children }: CompanyLayoutProps) {
  const location = useLocation()

  const navItems = [
    { label: 'Onboarding', path: '/company/onboarding', icon: SatelliteDishIcon },
    { label: 'Revocation List', path: '/company/revocations', icon: ListX },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* COMPANY SIDEBAR (Light Theme) */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10">
        
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <Building className="w-6 h-6 text-emerald-600 mr-2" />
          <span className="font-bold text-lg tracking-wide text-slate-800">Company Portal</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-700 font-semibold' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Profile Section - Integrated UserBadge */}
        {/* Wrapped in dark div for contrast since UserBadge is dark-themed */}
        <div className="bg-slate-900">
             <UserBadge />
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        <div className="p-8 flex-1">
            <div className="max-w-6xl mx-auto">
                {children}
            </div>
        </div>
          {/* FOOTER */}
        <footer className="border-t border-slate-200 bg-white py-4 px-8 text-center">
            <p className="text-xs text-slate-400">
                &copy; 2026 ASC-S e.V. | Tezos Etherlink Testnet
            </p>
        </footer>
      </main>
    </div>
  )
}