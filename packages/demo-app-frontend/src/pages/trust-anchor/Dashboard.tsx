import { Users, Shield, Globe, Key } from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { useTrustAnchorData } from '../../hooks/useTrustAnchor'
import { useAccount } from 'wagmi'

export function TrustAnchorDashboard() {
  // 1. Connect to our custom hook to fetch data from the blockchain
  const { quorum, isLoading } = useTrustAnchorData()
  
  // 2. Check wallet connection status
  const { isConnected } = useAccount()

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Trust Anchor Overview</h1>
        <p className="text-slate-500 mt-2">Manage your identity, admins, and governance policies.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Quorum (Real Data) */}
        <StatCard 
          title="Consensus Quorum" 
          // Show "..." while loading, otherwise show the actual number from the smart contract
          value={isLoading ? "..." : quorum} 
          icon={<Shield className="w-5 h-5" />}
          description={isConnected ? "Synced from Chain" : "Connect Wallet to View"}
        />
        
        {/* Card 2: Admins (Placeholder for now) */}
        <StatCard 
          title="Active Admins" 
          value="3" 
          icon={<Users className="w-5 h-5" />}
          description="Ultimate Governance Layer"
        />

        {/* Card 3: Companies (Placeholder for now) */}
        <StatCard 
          title="Managed Companies" 
          value="12" 
          icon={<Globe className="w-5 h-5" />}
          description="Speed Layer Active"
        />
      </div>

      {/* Main Action Area */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">Governance Proposals</h3>
          <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">View All History</button>
        </div>
        
        <div className="p-12 text-center text-slate-400">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <Key className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-lg">No active proposals pending approval.</p>
          
          {/* Button is disabled if wallet is not connected */}
          <button 
            disabled={!isConnected} 
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create New Proposal
          </button>
        </div>
      </div>
    </div>
  )
}