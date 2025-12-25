import { Building2, Plus, ArrowRight, ShieldAlert, Loader2, CheckCircle2, Search } from 'lucide-react'
import { useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { useGovernance } from '../../hooks/useGovernance'
import { REGISTRY_ADDRESS, REGISTRY_ABI, TRUST_ANCHOR_ADDRESS } from '../../lib/contracts'

export function CompaniesPage() {
  const { isConnected } = useAccount()
  const [inputAddress, setInputAddress] = useState('')
  const [checkAddress, setCheckAddress] = useState<`0x${string}` | undefined>(undefined)
  
  const { proposeCompanyRegistration, isPending, isSuccess, error } = useGovernance()

  // READ: Check who is the actual owner of the entered address in the Registry
  const { data: currentOwner, isLoading: isChecking } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'identityOwner',
    args: checkAddress ? [checkAddress] : undefined,
    query: {
      enabled: !!checkAddress, // Only run query if we have an address to check
    }
  })

  // Determine status based on on-chain data
  const isManaged = currentOwner && TRUST_ANCHOR_ADDRESS && 
    currentOwner.toLowerCase() === TRUST_ANCHOR_ADDRESS.toLowerCase()

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputAddress.startsWith('0x') || inputAddress.length !== 42) return
    proposeCompanyRegistration(inputAddress as `0x${string}`)
  }

  const handleCheckStatus = () => {
     if (inputAddress.startsWith('0x')) {
        setCheckAddress(inputAddress as `0x${string}`)
     }
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Registration Form */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
              <Plus className="w-4 h-4 mr-2 text-indigo-500" />
              Actions
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  Company Wallet Address
                </label>
                <div className="flex gap-2">
                    <input 
                    type="text"
                    value={inputAddress}
                    onChange={(e) => {
                        setInputAddress(e.target.value)
                        setCheckAddress(undefined) // Reset check on type
                    }}
                    placeholder="0x..."
                    disabled={isPending}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-sm disabled:bg-slate-50"
                    />
                    <button
                        type="button" 
                        onClick={handleCheckStatus}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                        title="Check current status"
                    >
                        <Search className="w-4 h-4" />
                    </button>
                </div>
              </div>

              {/* Status Display Area */}
              {checkAddress && (
                  <div className={`p-4 rounded-lg border ${isManaged ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                      <h4 className="text-sm font-semibold mb-1">Current Status:</h4>
                      {isChecking ? (
                          <span className="text-sm text-slate-500">Checking registry...</span>
                      ) : (
                          <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                  <span className="text-sm text-slate-600">Is Managed?</span>
                                  {isManaged ? (
                                      <span className="px-2 py-0.5 rounded-full bg-green-200 text-green-800 text-xs font-bold">YES (Managed by TA)</span>
                                  ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-medium">NO (Independent)</span>
                                  )}
                              </div>
                              <div className="text-xs text-slate-400 font-mono break-all">
                                  Owner: {currentOwner}
                              </div>
                          </div>
                      )}
                  </div>
              )}

              <div className="pt-2 border-t border-slate-100"></div>

              <button 
                onClick={handleRegister}
                disabled={!isConnected || !inputAddress || isPending}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Pending...
                  </>
                ) : (
                  <>
                    Propose Registration (Change Owner)
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>

              {isSuccess && (
                <div className="flex items-center text-green-600 text-sm mt-2 p-2 bg-green-50 rounded">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Proposal created! Check Dashboard to vote.
                </div>
              )}

              {error && (
                <div className="text-red-600 text-xs mt-2 p-2 bg-red-50 rounded break-words">
                  Error: {error.message.split('.')[0]}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info / Companies List Placeholder */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center">
                <Building2 className="w-4 h-4 mr-2 text-indigo-500" />
                Verified Companies
              </h3>
            </div>
            <div className="p-6 text-center text-slate-500 text-sm">
                <p>Enter an address on the left and click the <Search className="w-3 h-3 inline mx-1"/> icon to verify its on-chain status.</p>
                <p className="mt-4 text-xs bg-slate-50 p-2 rounded">
                    Once a company delegates control and the Trust Anchor approves it, the status will change to <strong>Managed</strong>.
                </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}