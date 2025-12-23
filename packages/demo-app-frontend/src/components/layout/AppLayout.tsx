import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Building2, ShieldCheck, LogOut } from 'lucide-react'
import { useAccount, useDisconnect, useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { connect } = useConnect()
  const location = useLocation()

  const navItems = [
    { label: 'Trust Anchor', path: '/', icon: ShieldCheck },
    { label: 'Companies', path: '/companies', icon: Building2 },
  ]

  // Helper to shorten address (e.g. 0x1234...5678)
  const shortAddress = address 
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : ''

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full shadow-xl z-10">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <LayoutDashboard className="w-6 h-6 text-indigo-400 mr-2" />
          <span className="font-bold text-lg tracking-wide">SSI Portal</span>
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

        {/* User Profile in Sidebar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          {isConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase font-semibold">Wallet</span>
                <span className="text-sm font-mono text-slate-300">{shortAddress}</span>
              </div>
              <button 
                onClick={() => disconnect()}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-red-400"
                title="Disconnect"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => connect({ connector: injected() })}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}