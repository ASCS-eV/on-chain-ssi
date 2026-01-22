import { CheckCircle2, Clock, PlayCircle, AlertCircle, UserCheck } from 'lucide-react'
import type { DecodedProposal } from '../../hooks/useTrustAnchor'
import { decodeProposalData } from '../../lib/proposalDecoder'
import { useMemo } from 'react'
import { toast } from 'sonner'

interface ProposalCardProps {
  proposal: DecodedProposal
  quorum: number
  totalAdmins: number
  hasVoted: boolean
  isTrustAnchorAdmin: boolean
  currentVotes: number
  onApprove: (id: `0x${string}`) => void
  isPending: boolean
}

export function ProposalCard({
  proposal,
  quorum,
  totalAdmins,
  hasVoted,
  isTrustAnchorAdmin,
  currentVotes,
  onApprove,
  isPending
}: ProposalCardProps) {
  
  const info = useMemo(() => decodeProposalData(proposal.rawInfo.data), [proposal.rawInfo.data])
  
  const requiredVotes = proposal.rawInfo.requiresUnanimity ? totalAdmins : quorum
  const progressPercent = Math.min((currentVotes / requiredVotes) * 100, 100)
  const isReady = currentVotes >= requiredVotes

  const handleApprove = () => {
      if(!isTrustAnchorAdmin) {
          toast.error("Unauthorized")
          return
      }
      // Ensure the ID is treated as a hex string
      onApprove(proposal.id as `0x${string}`)
  }

  return (
    <div className={`border rounded-xl p-5 transition-all duration-200 ${
        hasVoted ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-indigo-100 shadow-sm hover:shadow-md'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-3">
            <div className={`mt-1 p-2 rounded-lg ${
                info.type === 'governance' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
            }`}>
                {info.type === 'governance' ? <AlertCircle className="w-5 h-5"/> : <UserCheck className="w-5 h-5"/>}
            </div>
            <div>
                <h4 className="font-bold text-slate-900">{info.title}</h4>
                <p className="text-sm text-slate-500 font-mono mt-1">{info.details}</p>
            </div>
        </div>
        
        {proposal.rawInfo.requiresUnanimity && (
            <span className="px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider rounded border border-purple-100">
                Unanimity
            </span>
        )}
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5 font-medium text-slate-500">
            <span>Progress ({currentVotes}/{requiredVotes})</span>
            <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
                className={`h-full transition-all duration-500 ${isReady ? 'bg-green-500' : 'bg-indigo-500'}`}
                style={{ width: `${progressPercent}%` }}
            />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-50">
          <span className="text-xs text-slate-400 font-mono">
              ID: {proposal.id.slice(0, 6)}...
          </span>

          <button
            onClick={handleApprove}
            disabled={hasVoted || isPending || !isTrustAnchorAdmin || isReady}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                hasVoted 
                    ? 'text-green-600 bg-green-50 cursor-default'
                    : isReady
                        ? 'text-slate-400 bg-slate-100 cursor-default'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
            }`}
          >
              {hasVoted ? (
                  <><CheckCircle2 className="w-4 h-4 mr-2"/> Voted</>
              ) : isReady ? (
                  <><PlayCircle className="w-4 h-4 mr-2"/> Executable</>
              ) : (
                  <><Clock className="w-4 h-4 mr-2"/> {isPending ? 'Signing...' : 'Approve'}</>
              )}
          </button>
      </div>
    </div>
  )
}