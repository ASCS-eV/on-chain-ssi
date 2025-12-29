import { Users, Shield, Globe, ShieldCheck, CheckCircle, Clock } from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { useTrustAnchorData } from '../../hooks/useTrustAnchor'
import { useGovernance } from '../../hooks/useGovernance'
import { useAccount } from 'wagmi'

export function TrustAnchorDashboard() {
  const { quorum, owners, proposals, totalAdmins, approvals, isLoading } = useTrustAnchorData()
  const { isConnected, address } = useAccount()
  const { approveProposal, isPending } = useGovernance()

  const isTrustAnchorAdmin = isConnected && address && owners.some(
    (owner) => owner.toLowerCase() === address.toLowerCase()
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Trust Anchor Overview</h1>
        <p className="text-slate-500 mt-2">Managing the root of trust on Etherlink.</p>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Required Quorum" 
          value={isLoading ? "..." : `${quorum} of ${totalAdmins}`} 
          icon={<Shield className="w-5 h-5" />}
          description="Consensus Threshold"
        />
        <StatCard 
          title="Active Admins" 
          value={isLoading ? "..." : totalAdmins} 
          icon={<Users className="w-5 h-5" />}
          description="Total TA Owners"
        />
        <StatCard 
          title="Companies" 
          value="-" 
          icon={<Globe className="w-5 h-5" />}
          description="Controlled Entities"
        />
      </div>

      {/* ACTIVE PROPOSALS SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Governance Proposals</h3>
        </div>
        
        <div className="divide-y divide-slate-100">
          {proposals.length > 0 ? (
            proposals.map((p, idx) => {
              const hasVoted = address && approvals[p.id]?.includes(address)
              const currentVotes = approvals[p.id]?.length || 0
              
              // Note: using p.rawInfo because we updated the Type in hook
              const requiredVotes = p.rawInfo.requiresUnanimity ? totalAdmins : quorum 
              const progressPercent = Math.min((currentVotes / requiredVotes) * 100, 100)
              const isDisabled = !isConnected || isPending || hasVoted || !isTrustAnchorAdmin

              return (
                <div key={idx} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      {/* HERE IS THE FIX: DISPLAY DECODED DESCRIPTION */}
                      <p className="text-lg font-bold text-slate-900">
                        {p.description}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                            p.rawInfo.requiresUnanimity ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                            {p.rawInfo.requiresUnanimity ? 'Unanimity' : 'Standard'}
                        </span>
                        <span className="text-xs font-mono text-slate-400">ID: {p.id.slice(0, 8)}...</span>
                      </div>
                      
                      {/* Voting Progress */}
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 w-24 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 transition-all duration-500" 
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600">
                          {currentVotes} / {requiredVotes} Votes
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => approveProposal(p.id as `0x${string}`)}
                    disabled={isDisabled}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isDisabled
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                    }`}
                  >
                    {!isTrustAnchorAdmin && isConnected ? (
                       <>Unauthorized</>
                    ) : hasVoted ? (
                       <><CheckCircle className="w-4 h-4" /> Voted</>
                    ) : (
                       <><CheckCircle className="w-4 h-4" /> {isPending ? 'Signing...' : 'Approve'}</>
                    )}
                  </button>
                </div>
              )
            })
          ) : (
            <div className="p-12 text-center text-slate-400">
              <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg">No active proposals. Everything is up to date.</p>
            </div>
          )}
        </div>
      </div>

      {/* ADMINS LIST TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 flex items-center">
            <ShieldCheck className="w-4 h-4 mr-2 text-indigo-500" />
            Trust Anchor Admins
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-3">Admin Address</th>
                <th className="px-6 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {owners.map((owner, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-600">{owner}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                      Active Owner
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}