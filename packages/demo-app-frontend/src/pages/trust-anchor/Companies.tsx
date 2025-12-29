import { Plus, ArrowRight, ShieldAlert, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { useGovernance } from '../../hooks/useGovernance'
import { REGISTRY_ADDRESS, REGISTRY_ABI, TRUST_ANCHOR_ADDRESS } from '../../lib/contracts'

export function CompaniesPage() {
  const { isConnected } = useAccount()
  const [inputAddress, setInputAddress] = useState('')
  const [checkAddress, setCheckAddress] = useState<`0x${string}` | undefined>(undefined)
  
  const { proposeCompanyRegistration, isPending, isSuccess, error } = useGovernance()

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
      </div>
    </div>
  )
}