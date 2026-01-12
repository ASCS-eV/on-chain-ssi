import { Plus, Loader2, CheckCircle2, AlertTriangle, Search, Building2, UserPlus, UserMinus, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { useGovernance } from '../../hooks/useGovernance'
import { useCRSetManagement } from '../../hooks/useCRSetManagement'
import { useDIDSync, useReadCID } from '../../hooks/useDIDSync'
import { REGISTRY_ADDRESS, REGISTRY_ABI, TRUST_ANCHOR_ADDRESS } from '../../lib/contracts'
import { isAddress } from 'viem'
import { toast } from 'sonner'

export function CompaniesPage() {
  const { isConnected } = useAccount()
  const [inputAddress, setInputAddress] = useState('')
  const [debouncedAddress, setDebouncedAddress] = useState<`0x${string}` | undefined>(undefined)
  
  // State for Admin Tools
  const [adminAddress, setAdminAddress] = useState('')

  // Hooks
  const { proposeCompanyRegistration, isPending } = useGovernance()
  const { addCompanyAdmin, removeCompanyAdmin, isPending: isAdminPending, isSuccess: isAdminSuccess } = useCRSetManagement()
  const { syncCIDToDID, isPending: isSyncPending, isSuccess: isSyncSuccess } = useDIDSync()
  const { cid: companyCID, isLoading: isCIDLoading } = useReadCID(debouncedAddress)

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
        if (isAddress(inputAddress)) {
            setDebouncedAddress(inputAddress as `0x${string}`)
        } else {
            setDebouncedAddress(undefined)
        }
    }, 500)
    return () => clearTimeout(timer)
  }, [inputAddress])

  // Notifications for side-effects
  useEffect(() => {
      if (isAdminSuccess) toast.success("Admin Updated Successfully")
      if (isSyncSuccess) toast.success("DID Document Synced Successfully")
  }, [isAdminSuccess, isSyncSuccess])

  // READ Status
  const { data: currentOwner, isLoading: isChecking } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'identityOwner',
    args: debouncedAddress ? [debouncedAddress] : undefined,
    query: { enabled: !!debouncedAddress }
  })

  // Determine Status
  const isManaged = currentOwner && TRUST_ANCHOR_ADDRESS && 
    currentOwner.toLowerCase() === TRUST_ANCHOR_ADDRESS.toLowerCase()

  const handleRegister = () => {
    if (!debouncedAddress) return
    proposeCompanyRegistration(debouncedAddress)
  }

  // Admin Handlers
  const handleAddAdmin = () => {
      if (!debouncedAddress || !adminAddress) return
      addCompanyAdmin(debouncedAddress, adminAddress as `0x${string}`)
  }

  const handleRemoveAdmin = () => {
      if (!debouncedAddress || !adminAddress) return
      removeCompanyAdmin(debouncedAddress, adminAddress as `0x${string}`)
  }

  const handleSync = () => {
      if (!debouncedAddress || !companyCID) return
      syncCIDToDID(debouncedAddress, companyCID)
  }

  // --- UI RENDERERS ---

  const renderStatus = () => {
      if (!inputAddress) return (
          <div className="text-center py-12 text-slate-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Enter a DID address to check status</p>
          </div>
      )
      
      if (!isAddress(inputAddress)) return (
          <div className="text-center py-12 text-red-400">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Invalid Ethereum Address</p>
          </div>
      )

      if (isChecking) return (
          <div className="text-center py-12 text-slate-500">
              <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-indigo-500" />
              <p>Verifying Identity Status...</p>
          </div>
      )

      return (
          <div className="animate-in fade-in slide-in-from-bottom-2">
              <div className={`p-6 rounded-xl border-2 ${
                  isManaged ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'
              }`}>
                  <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-full ${
                          isManaged ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                          {isManaged ? <CheckCircle2 className="w-6 h-6"/> : <AlertTriangle className="w-6 h-6"/>}
                      </div>
                      <div className="flex-1">
                          <h4 className="text-lg font-bold text-slate-900">
                              {isManaged ? 'Identity is Managed' : 'Action Required'}
                          </h4>
                          <p className="text-slate-600 mt-1">
                              {isManaged 
                                  ? "This identity is correctly delegated to the Trust Anchor." 
                                  : "This identity is NOT controlled by the Trust Anchor."}
                          </p>
                          
                          {!isManaged && (
                             <div className="mt-4 bg-white p-4 rounded-lg border border-amber-200 text-sm text-slate-600">
                                 <strong>Next Step:</strong> The company must delegate control using their wallet via the Company Onboarding portal.
                             </div>
                          )}
                      </div>
                  </div>
              </div>

              {isManaged && (
                  <div className="mt-6">
                      <button 
                        onClick={handleRegister}
                        disabled={isPending || !isConnected}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center justify-center transition-colors shadow-sm disabled:opacity-50"
                      >
                        {isPending ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating Proposal...</>
                        ) : (
                            <><Plus className="w-5 h-5 mr-2" /> Register Company (Create Proposal)</>
                        )}
                      </button>
                      <p className="text-xs text-center text-slate-400 mt-3">
                          This will create a governance proposal to officialy register the company.
                      </p>
                  </div>
              )}
          </div>
      )
  }

  // --- RESTORED FUNCTIONALITY ---
  const renderAdvancedTools = () => {
      if (!isManaged || !debouncedAddress) return null;

      return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 animate-in fade-in">
              {/* TOOL 1: ADMIN MANAGEMENT */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-emerald-600" />
                      CRSet Admins
                  </h3>
                  <div className="space-y-3">
                      <input 
                          type="text" 
                          placeholder="Admin Wallet Address (0x...)"
                          value={adminAddress}
                          onChange={(e) => setAdminAddress(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <div className="flex gap-2">
                          <button 
                              onClick={handleAddAdmin}
                              disabled={isAdminPending || !adminAddress}
                              className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex justify-center items-center"
                          >
                              {isAdminPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <><UserPlus className="w-4 h-4 mr-1"/> Add</>}
                          </button>
                          <button 
                              onClick={handleRemoveAdmin}
                              disabled={isAdminPending || !adminAddress}
                              className="flex-1 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 flex justify-center items-center"
                          >
                              {isAdminPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <><UserMinus className="w-4 h-4 mr-1"/> Remove</>}
                          </button>
                      </div>
                  </div>
              </div>

              {/* TOOL 2: DID SYNC */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-blue-600" />
                      DID Synchronization
                  </h3>
                  <div className="space-y-4">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-xs text-slate-500 uppercase font-bold mb-1">Current Registry CID</p>
                          {isCIDLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-slate-400"/>
                          ) : (
                              <p className="font-mono text-sm text-slate-800 break-all">{companyCID || "No CID found"}</p>
                          )}
                      </div>
                      <button 
                          onClick={handleSync}
                          disabled={isSyncPending || !companyCID}
                          className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center"
                      >
                          {isSyncPending ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Syncing...</>
                          ) : (
                              <><RefreshCw className="w-4 h-4 mr-2"/> Sync to DID Document</>
                          )}
                      </button>
                  </div>
              </div>
          </div>
      )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
          <h1 className="text-3xl font-bold text-slate-900">Company Registry</h1>
          <p className="text-slate-500 mt-2">Lookup and manage decentralized identities.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-500" />
              Identity Lookup
          </h3>
          
          <div className="relative">
              <input 
                type="text" 
                placeholder="0x... (Company DID Address)"
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-sm transition-all"
              />
              <Building2 className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
          </div>

          <div className="mt-6 border-t border-slate-100 pt-6">
              {renderStatus()}
          </div>
      </div>

      {/* Restored Advanced Tools */}
      {renderAdvancedTools()}
    </div>
  )
}