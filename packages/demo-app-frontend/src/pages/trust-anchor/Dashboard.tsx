import { Users, Shield, Globe, ShieldCheck, Filter } from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { ProposalCard } from '../../components/ui/ProposalCard'
import { useTrustAnchorData } from '../../hooks/useTrustAnchor'
import { useGovernance } from '../../hooks/useGovernance'
import { useAccount } from 'wagmi'
import { useState } from 'react'

export function TrustAnchorDashboard() {
  const { quorum, owners, proposals, totalAdmins, approvals, isLoading } = useTrustAnchorData()
  const { isConnected, address } = useAccount()
  const { approveProposal, isPending } = useGovernance()

  const [filter, setFilter] = useState<'all' | 'needs_vote'>('needs_vote')

  const isTrustAnchorAdmin =
    isConnected && address && owners.some((owner) => owner.toLowerCase() === address.toLowerCase())

  const filteredProposals = proposals.filter((p) => {
    // In a real app, you might hide executed proposals or move them to a separate list
    // For this demo, we assume the hook returns active proposals
    if (filter === 'all') return true

    const hasVoted = address && approvals[p.id]?.includes(address)
    return !hasVoted
  })

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Trust Anchor Overview</h1>
          <p className="text-slate-500 mt-2">Managing the root of trust on Etherlink.</p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100 text-xs font-bold">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          System Operational
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Consensus Threshold"
          value={isLoading ? '...' : `${quorum}/${totalAdmins}`}
          icon={<Shield className="w-5 h-5" />}
          description="Signatures required"
          trend="neutral"
        />
        <StatCard
          title="Active Admins"
          value={isLoading ? '...' : totalAdmins}
          icon={<Users className="w-5 h-5" />}
          description="Governance members"
        />
        <StatCard
          title="Active Proposals"
          value={proposals.length}
          icon={<Globe className="w-5 h-5" />}
          description="Pending actions"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Governance Proposals
          </h3>

          <div className="flex bg-white p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setFilter('needs_vote')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'needs_vote'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Needs My Vote
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'all'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All Proposals
            </button>
          </div>
        </div>

        {filteredProposals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProposals.map((p) => {
              const currentVotes = approvals[p.id]?.length || 0
              const hasVoted = address ? approvals[p.id]?.includes(address) : false

              return (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  quorum={quorum}
                  totalAdmins={totalAdmins}
                  currentVotes={currentVotes}
                  hasVoted={!!hasVoted}
                  isTrustAnchorAdmin={!!isTrustAnchorAdmin}
                  onApprove={approveProposal}
                  isPending={isPending}
                />
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 border-dashed p-12 text-center">
            <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <Filter className="w-6 h-6 text-slate-300" />
            </div>
            <h3 className="text-slate-900 font-medium">No proposals found</h3>
            <p className="text-slate-500 text-sm mt-1">
              {filter === 'needs_vote'
                ? "You're all caught up! No pending votes."
                : 'There are no active proposals in the system.'}
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
            Network Administrators
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-slate-100">
              {owners.map((owner, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-600">{owner}</td>
                  <td className="px-6 py-4 text-right">
                    {owner.toLowerCase() === address?.toLowerCase() && (
                      <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase">
                        You
                      </span>
                    )}
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
