import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SatelliteDishIcon, Building, LogOut } from 'lucide-react'
import { useAccount, useDisconnect, useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

interface CompanyLayoutProps {
  children: ReactNode
}

export function CompanyLayout({ children }: CompanyLayoutProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { connect } = useConnect()
  const location = useLocation()

  const navItems = [
    { label: 'Onboarding', path: '/company/onboarding', icon: SatelliteDishIcon },
  ]

  const shortAddress = address 
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : ''

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* COMPANY SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <Building className="w-6 h-6 text-emerald-600 mr-2" />
          <span className="font-bold text-lg tracking-wide text-slate-800">Company Portal</span>
        </div>

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

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          {isConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase font-semibold">Company Wallet</span>
                <span className="text-sm font-mono text-slate-700">{shortAddress}</span>
              </div>
              <button 
                onClick={() => disconnect()}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-red-500"
                title="Disconnect"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => connect({ connector: injected() })}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </aside>

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