import { Plus, ArrowRight, ShieldAlert, Loader2, CheckCircle2, AlertTriangle, UserPlus, UserMinus, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { useGovernance } from '../../hooks/useGovernance'
import { useCRSetManagement } from '../../hooks/useCRSetManagement'
import { useDIDSync, useReadCID } from '../../hooks/useDIDSync'
import { REGISTRY_ADDRESS, REGISTRY_ABI, TRUST_ANCHOR_ADDRESS } from '../../lib/contracts'

export function CompaniesPage() {
  const { isConnected } = useAccount()
  const [inputAddress, setInputAddress] = useState('')
  const [checkAddress, setCheckAddress] = useState<`0x${string}` | undefined>(undefined)
  
  // CRSet admin management
  const [adminCompanyDID, setAdminCompanyDID] = useState('')
  const [adminAddress, setAdminAddress] = useState('')
  
  // DID sync management, this is manual now, we could use a cron job from the crset backend later, or an oracle, or change the approach after meeting
  // DID sync refers to syncing the revocation CID from CRSetRegistry to the DID document in Registry
  const [syncCompanyDID, setSyncCompanyDID] = useState('')
  const [syncCheckDID, setSyncCheckDID] = useState<`0x${string}` | undefined>(undefined)
  
  const { proposeCompanyRegistration, isPending, isSuccess, error } = useGovernance()
  const { 
    addCompanyAdmin, 
    removeCompanyAdmin, 
    isPending: isAdminPending, 
    isSuccess: isAdminSuccess, 
    error: adminError 
  } = useCRSetManagement()

  const { syncCIDToDID, isPending: isSyncPending, isSuccess: isSyncSuccess, error: syncError } = useDIDSync()
  
  // Debounce sync company DID check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (syncCompanyDID.startsWith('0x') && syncCompanyDID.length === 42) {
        setSyncCheckDID(syncCompanyDID as `0x${string}`)
      } else {
        setSyncCheckDID(undefined)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [syncCompanyDID])

  const { cid: companyCID, isLoading: isLoadingCID } = useReadCID(syncCheckDID)

  // DEBOUNCE LOGIC
  useEffect(() => {
    const timer = setTimeout(() => {
        if (inputAddress.startsWith('0x') && inputAddress.length === 42) {
            setCheckAddress(inputAddress as `0x${string}`)
        } else {
            setCheckAddress(undefined)
        }
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)
  }, [inputAddress])


  // READ Registry Status
  const { data: currentOwner, isLoading: isChecking } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'identityOwner',
    args: checkAddress ? [checkAddress] : undefined,
    query: { enabled: !!checkAddress }
  })

  // STATES:
  // 1. Managed: Owner is TA.
  const isManaged = currentOwner && TRUST_ANCHOR_ADDRESS && 
    currentOwner.toLowerCase() === TRUST_ANCHOR_ADDRESS.toLowerCase()

  // 2. Ready: Owner is neither TA nor Self? (Or implicitly, if we want to support a transition state, usually it's just Managed vs Not)
  // Logic: Use "Ready to Propose" only if it's Managed. If it's waiting, we block.
  const isReadyForProposal = isManaged

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkAddress) return
    proposeCompanyRegistration(checkAddress)
  }

  // admin and crset syncing handlers

  const handleAddAdmin = () => {
    if (!adminCompanyDID || !adminAddress) return
    addCompanyAdmin(adminCompanyDID as `0x${string}`, adminAddress as `0x${string}`)
  }

  const handleRemoveAdmin = () => {
    if (!adminCompanyDID || !adminAddress) return
    removeCompanyAdmin(adminCompanyDID as `0x${string}`, adminAddress as `0x${string}`)
  }

  const handleSyncCID = () => {
    if (!syncCheckDID || !companyCID) return
    syncCIDToDID(syncCheckDID, companyCID)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Company Management</h1>
        <p className="text-slate-500 mt-2">Register and manage did:ethr identifiers for companies.</p>
      </div>

      {!isConnected && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center text-amber-800">
          <ShieldAlert className="w-5 h-5 mr-3" />
          <p className="text-sm font-medium">Please connect your wallet to manage companies.</p>
        </div>
      )}

      <div className="max-w-3xl">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
             <Plus className="w-4 h-4 mr-2 text-indigo-500" />
             Actions
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                Search Company Address
              </label>
              <input 
                type="text" 
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
                placeholder="0x..." 
                disabled={isPending}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-sm disabled:bg-slate-50"
              />
            </div>

            {/* AUTOMATIC STATUS DISPLAY */}
            {checkAddress && (
                <div className={`p-5 rounded-lg border transition-all duration-300 ${
                    isChecking ? 'bg-slate-50 border-slate-100 opacity-70' :
                    isManaged ? 'bg-green-50 border-green-200' :
                    'bg-amber-50 border-amber-200'
                }`}>
                    {isChecking ? (
                        <div className="flex items-center text-slate-500">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            <span className="text-sm">Verifying on-chain status...</span>
                        </div>
                    ) : (
                        <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-full ${isManaged ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                {isManaged ? <CheckCircle2 className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                            </div>
                            <div>
                                <h4 className={`text-sm font-bold ${isManaged ? 'text-green-800' : 'text-amber-800'}`}>
                                    {isManaged ? 'Company is Managed' : 'Waiting for Delegation'}
                                </h4>
                                <p className="text-xs mt-1 text-slate-600">
                                    {isManaged 
                                        ? "This identity is correctly controlled by the Trust Anchor. You can propose governance actions."
                                        : "The Company controls this identity. They must delegate control via the Company Portal first."
                                    }
                                </p>
                                <div className="mt-2 text-[10px] text-slate-400 font-mono">
                                    Current Owner: {currentOwner}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="pt-2 border-t border-slate-100"></div>

            <button 
              onClick={handleRegister}
              disabled={!isConnected || !isReadyForProposal || isPending}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing Proposal...
                </>
              ) : (
                <>
                  Propose Governance Action
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>

            {isSuccess && (
              <div className="flex items-center text-green-600 text-sm mt-2 p-3 bg-green-50 border border-green-100 rounded-lg animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Proposal successfully created on-chain.
              </div>
            )}

            {error && (
              <div className="text-red-600 text-xs mt-2 p-3 bg-red-50 border border-red-100 rounded-lg break-words animate-in fade-in slide-in-from-top-2">
                <strong>Error:</strong> {error.message.split('.')[0]}
              </div>
            )}
          </div>
        </div>

        {/* CRSet Admin Management */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
            <UserPlus className="w-4 h-4 mr-2 text-emerald-500" />
            Manage CRSet Admins
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                Company DID
              </label>
              <input 
                type="text" 
                value={adminCompanyDID}
                onChange={(e) => setAdminCompanyDID(e.target.value)}
                placeholder="0x..." 
                disabled={isAdminPending}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono text-sm disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                Admin Address
              </label>
              <input 
                type="text" 
                value={adminAddress}
                onChange={(e) => setAdminAddress(e.target.value)}
                placeholder="0x..." 
                disabled={isAdminPending}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono text-sm disabled:bg-slate-50"
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleAddAdmin}
                disabled={!isConnected || !adminCompanyDID || !adminAddress || isAdminPending}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-sm"
              >
                {isAdminPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Admin
                  </>
                )}
              </button>

              <button 
                onClick={handleRemoveAdmin}
                disabled={!isConnected || !adminCompanyDID || !adminAddress || isAdminPending}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-sm"
              >
                {isAdminPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <UserMinus className="w-4 h-4 mr-2" />
                    Remove Admin
                  </>
                )}
              </button>
            </div>

            {isAdminSuccess && (
              <div className="flex items-center text-green-600 text-sm p-3 bg-green-50 border border-green-100 rounded-lg animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Admin operation completed successfully.
              </div>
            )}

            {adminError && (
              <div className="text-red-600 text-xs p-3 bg-red-50 border border-red-100 rounded-lg break-words animate-in fade-in slide-in-from-top-2">
                <strong>Error:</strong> {adminError.message.split('.')[0]}
              </div>
            )}
          </div>
        </div>

        {/* DID Sync Management */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
            <RefreshCw className="w-4 h-4 mr-2 text-indigo-500" />
            Sync Revocation CID to DID Document
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                Company DID
              </label>
              <input 
                type="text" 
                value={syncCompanyDID}
                onChange={(e) => setSyncCompanyDID(e.target.value)}
                placeholder="0x..." 
                disabled={isSyncPending}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-sm disabled:bg-slate-50"
              />
            </div>

            {syncCheckDID && (
              <div className={`p-4 rounded-lg border ${
                isLoadingCID ? 'bg-slate-50 border-slate-200' :
                companyCID ? 'bg-green-50 border-green-200' :
                'bg-amber-50 border-amber-200'
              }`}>
                {isLoadingCID ? (
                  <div className="flex items-center text-slate-500">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="text-sm">Checking registry...</span>
                  </div>
                ) : companyCID ? (
                  <div>
                    <p className="text-xs text-green-700 font-semibold uppercase mb-1">Current CID</p>
                    <p className="text-sm text-green-900 font-mono break-all">{companyCID}</p>
                  </div>
                ) : (
                  <div className="flex items-center text-amber-700">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    <span className="text-sm">No CID found for this company</span>
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={handleSyncCID}
              disabled={!isConnected || !syncCheckDID || !companyCID || isSyncPending}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-sm"
            >
              {isSyncPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing to DID...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync to DID Document
                </>
              )}
            </button>

            {isSyncSuccess && (
              <div className="flex items-center text-green-600 text-sm p-3 bg-green-50 border border-green-100 rounded-lg animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                CID successfully synced to DID document!
              </div>
            )}

            {syncError && (
              <div className="text-red-600 text-xs p-3 bg-red-50 border border-red-100 rounded-lg break-words animate-in fade-in slide-in-from-top-2">
                <strong>Error:</strong> {syncError.message.split('.')[0]}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}