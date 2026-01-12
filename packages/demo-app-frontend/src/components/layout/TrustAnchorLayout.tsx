import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Building2, ShieldCheck, Settings } from 'lucide-react'
import { UserBadge } from '../ui/UserBadge'

interface TrustAnchorLayoutProps {
  children: ReactNode
}

export function TrustAnchorLayout({ children }: TrustAnchorLayoutProps) {
  const location = useLocation()

  const navItems = [
    { label: 'Overview', path: '/trust-anchor', icon: LayoutDashboard },
    { label: 'Companies', path: '/trust-anchor/companies', icon: Building2 },
    { label: 'Governance', path: '/trust-anchor/governance', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* TA SIDEBAR (Dark Theme) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full shadow-xl z-10">
        
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <ShieldCheck className="w-6 h-6 text-indigo-400 mr-2" />
          <span className="font-bold text-lg tracking-wide">Trust Anchor</span>
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
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Profile Section - Integrated UserBadge */}
        <UserBadge />
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