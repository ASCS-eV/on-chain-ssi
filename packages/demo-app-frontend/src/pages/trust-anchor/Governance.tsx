import { useState } from 'react'
import { Shield, UserPlus, UserMinus, Loader2, AlertTriangle, Info } from 'lucide-react'
import { useGovernance } from '../../hooks/useGovernance'
import { useTrustAnchorData } from '../../hooks/useTrustAnchor'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { isAddress } from 'viem'

export function GovernancePage() {
  const { isConnected } = useAccount()
  const { proposeAddOwner, proposeRemoveOwner, proposeQuorumUpdate, isPending } = useGovernance()
  const { totalAdmins, quorum } = useTrustAnchorData()

  const [newAdminAddress, setNewAdminAddress] = useState('')
  const [removeAdminAddress, setRemoveAdminAddress] = useState('')
  const [newQuorumValue, setNewQuorumValue] = useState('')

  // Helper to validate and execute
  const handleAction = (
    actionName: string,
    validator: () => string | null, // returns error or null
    executor: () => void
  ) => {
    const error = validator()
    if (error) {
      toast.error('Validation Error', { description: error })
      return
    }
    toast.promise(
      new Promise<void>((resolve, reject) => {
        try {
          executor()
          resolve()
        } catch (e) {
          reject(e)
        }
      }),
      {
        loading: `Proposing ${actionName}...`,
        success: 'Proposal Created!',
        error: 'Failed to create proposal',
      }
    )
  }

  const handleAddOwner = () => {
    handleAction(
      'Add Admin',
      () => (!isAddress(newAdminAddress) ? 'Invalid Ethereum Address' : null),
      () => {
        proposeAddOwner(newAdminAddress as `0x${string}`)
        setNewAdminAddress('')
      }
    )
  }

  const handleRemoveOwner = () => {
    handleAction(
      'Remove Admin',
      () => {
        if (!isAddress(removeAdminAddress)) return 'Invalid Ethereum Address'
        if (quorum > totalAdmins - 1)
          return 'Warning: Removing this admin will verify lock the contract (Quorum > Total). Update Quorum first!'
        return null
      },
      () => {
        proposeRemoveOwner(removeAdminAddress as `0x${string}`)
        setRemoveAdminAddress('')
      }
    )
  }

  const handleQuorumUpdate = () => {
    handleAction(
      'Update Quorum',
      () => {
        const val = parseInt(newQuorumValue)
        if (isNaN(val) || val <= 0) return 'Quorum must be at least 1'
        if (val > totalAdmins) return 'Quorum cannot exceed total admins'
        return null
      },
      () => {
        proposeQuorumUpdate(parseInt(newQuorumValue))
        setNewQuorumValue('')
      }
    )
  }

  if (!isConnected)
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <Shield className="w-12 h-12 mb-4 opacity-20" />
        <p>Please connect your admin wallet to access governance.</p>
      </div>
    )

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Governance Actions</h1>
        <p className="text-slate-500 mt-2">
          Execute critical changes to the Trust Anchor configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION: ADMIN MANAGEMENT */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Admin Management
          </h3>

          {/* ADD CARD */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900">Add New Admin</h3>
                <p className="text-sm text-slate-500 mt-1">Grant full governance rights.</p>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <UserPlus className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="0x..."
                value={newAdminAddress}
                onChange={(e) => setNewAdminAddress(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-sm"
              />
              <button
                onClick={handleAddOwner}
                disabled={isPending || !newAdminAddress}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors flex items-center justify-center"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Propose Add'}
              </button>
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs text-slate-400 bg-slate-50 p-2 rounded">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <p>Requires 100% consensus (Unanimity).</p>
            </div>
          </div>

          {/* REMOVE CARD */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-red-200 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900">Remove Admin</h3>
                <p className="text-sm text-slate-500 mt-1">Revoke all access rights.</p>
              </div>
              <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                <UserMinus className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="0x..."
                value={removeAdminAddress}
                onChange={(e) => setRemoveAdminAddress(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 font-mono text-sm"
              />
              <button
                onClick={handleRemoveOwner}
                disabled={isPending || !removeAdminAddress}
                className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 font-medium transition-colors flex items-center justify-center"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Propose Removal'}
              </button>
            </div>
          </div>
        </div>

        {/* SECTION: SECURITY CONFIG */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4" /> Security Configuration
          </h3>

          {/* QUORUM CARD */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900">Update Quorum</h3>
                <p className="text-sm text-slate-500 mt-1">Change M-of-N threshold.</p>
              </div>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Shield className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-center flex-1 border-r border-slate-200">
                <p className="text-xs text-slate-500 uppercase">Current</p>
                <p className="text-xl font-bold text-slate-900">{quorum}</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-xs text-slate-500 uppercase">Total Admins</p>
                <p className="text-xl font-bold text-slate-900">{totalAdmins}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type="number"
                  placeholder="New Threshold"
                  value={newQuorumValue}
                  onChange={(e) => setNewQuorumValue(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono text-sm"
                />
                {/* <span className="absolute right-4 top-2 text-slate-400 text-sm">/ {totalAdmins}</span> */}
              </div>

              <button
                onClick={handleQuorumUpdate}
                disabled={isPending || !newQuorumValue}
                className="w-full py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium transition-colors flex items-center justify-center"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Propose New Quorum'}
              </button>
            </div>

            <div className="mt-4 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded border border-amber-100">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                <strong>Warning:</strong> Setting a low quorum reduces security. Setting it too high
                might lock the system if admins lose access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
