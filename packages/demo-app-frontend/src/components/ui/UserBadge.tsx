import { LogOut, Copy, Check } from 'lucide-react'
import { useDisconnect } from 'wagmi'
import { useIdentity } from '../../hooks/useIdentity'
import { useState } from 'react'

export function UserBadge() {
  const { disconnect } = useDisconnect()
  const { role, shortAddress, roleLabel, address } = useIdentity()
  const [copied, setCopied] = useState(false)

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Generate a deterministic gradient based on address for "Avatar" look
  const avatarGradient = address 
    ? `linear-gradient(135deg, #${address.slice(2, 8)} 0%, #${address.slice(address.length - 6)} 100%)`
    : 'bg-slate-700'

  const badgeColor = role === 'admin' 
    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'

  return (
    <div className="p-4 border-t border-slate-800 bg-slate-950/50">
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        <div 
          className="w-10 h-10 rounded-full shadow-inner ring-2 ring-slate-800"
          style={{ background: avatarGradient }}
        />
        
        <div className="flex-1 min-w-0">
          <div className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 px-1.5 py-0.5 rounded border w-fit ${badgeColor}`}>
            {roleLabel}
          </div>
          <button 
            onClick={copyAddress}
            className="group flex items-center text-sm font-mono text-slate-300 hover:text-white transition-colors"
            title="Copy Address"
          >
            {shortAddress}
            {copied ? (
              <Check className="w-3 h-3 ml-1.5 text-green-400" />
            ) : (
              <Copy className="w-3 h-3 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
            )}
          </button>
        </div>
      </div>

      <button 
        onClick={() => disconnect()}
        className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all border border-transparent hover:border-red-900/50"
      >
        <LogOut className="w-3 h-3 mr-2" />
        Disconnect Wallet
      </button>
    </div>
  )
}