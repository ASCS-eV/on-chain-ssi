import { useState } from 'react'
import { Shield, UserPlus, UserMinus, Loader2, AlertTriangle } from 'lucide-react'
import { useGovernance } from '../../hooks/useGovernance'
import { useTrustAnchorData } from '../../hooks/useTrustAnchor'
import { useAccount } from 'wagmi'

export function GovernancePage() {
  const { isConnected } = useAccount()
  const { proposeAddOwner, proposeRemoveOwner, proposeQuorumUpdate, isPending } = useGovernance()
  const { totalAdmins, quorum } = useTrustAnchorData() // Need current stats for validation

  const [newAdminAddress, setNewAdminAddress] = useState('')
  const [removeAdminAddress, setRemoveAdminAddress] = useState('')
  const [newQuorumValue, setNewQuorumValue] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleAddOwner = () => {
    if(!newAdminAddress) return
    setValidationError(null)
    proposeAddOwner(newAdminAddress as `0x${string}`)
    setNewAdminAddress('')
  }

  const handleRemoveOwner = () => {
    if(!removeAdminAddress) return
    setValidationError(null)
    // Warning: Removing an owner might make the current quorum impossible if quorum > newTotal.
    // The smart contract allows removal, but we should warn.
    if (quorum > totalAdmins - 1) {
        setValidationError("Warning: Removing this admin will make Quorum > Total Admins. Update Quorum first!")
        return
    }
    proposeRemoveOwner(removeAdminAddress as `0x${string}`)
    setRemoveAdminAddress('')
  }

  const handleQuorumUpdate = () => {
    if(!newQuorumValue) return
    setValidationError(null)
    
    const val = parseInt(newQuorumValue)
    
    // LOGIC BUG FIX:
    if (val <= 0) {
        setValidationError("Quorum must be at least 1.")
        return
    }
    if (val > totalAdmins) {
        setValidationError(`Cannot set Quorum (${val}) higher than total admins (${totalAdmins}). This would brick the contract.`)
        return
    }

    proposeQuorumUpdate(val)
    setNewQuorumValue('')
  }

  if (!isConnected) return <div>Please connect admin wallet.</div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Governance Actions</h1>
        <p className="text-slate-500 mt-2">Execute critical changes to the Trust Anchor configuration.</p>
      </div>

      {validationError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            {validationError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        
        {/* ADD ADMIN */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                    <UserPlus className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">Add New Admin</h3>
                    <p className="text-sm text-slate-500">Propose adding a new owner. Requires unanimity.</p>
                </div>
            </div>
            <div className="flex gap-4">
                <input 
                    type="text" 
                    placeholder="0x..." 
                    value={newAdminAddress}
                    onChange={(e) => setNewAdminAddress(e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-sm"
                />
                <button 
                    onClick={handleAddOwner}
                    disabled={isPending || !newAdminAddress}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors"
                >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Propose Add'}
                </button>
            </div>
        </div>

        {/* REMOVE ADMIN */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                    <UserMinus className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">Remove Admin</h3>
                    <p className="text-sm text-slate-500">Propose removing an owner. Requires unanimity (minus the target).</p>
                </div>
            </div>
            <div className="flex gap-4">
                <input 
                    type="text" 
                    placeholder="0x..." 
                    value={removeAdminAddress}
                    onChange={(e) => setRemoveAdminAddress(e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 font-mono text-sm"
                />
                <button 
                    onClick={handleRemoveOwner}
                    disabled={isPending || !removeAdminAddress}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium transition-colors"
                >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Propose Remove'}
                </button>
            </div>
        </div>

        {/* UPDATE QUORUM */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                    <Shield className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">Update Quorum</h3>
                    <p className="text-sm text-slate-500">Current Admins: <strong>{totalAdmins}</strong>. Current Quorum: <strong>{quorum}</strong>.</p>
                </div>
            </div>
            <div className="flex gap-4">
                <input 
                    type="number" 
                    placeholder="New Threshold" 
                    value={newQuorumValue}
                    onChange={(e) => setNewQuorumValue(e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono text-sm"
                />
                <button 
                    onClick={handleQuorumUpdate}
                    disabled={isPending || !newQuorumValue}
                    className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium transition-colors"
                >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Propose Update'}
                </button>
            </div>
        </div>

      </div>
    </div>
  )
}