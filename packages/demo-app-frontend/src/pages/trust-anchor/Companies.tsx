import { Building2, Plus, ArrowRight, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useGovernance } from '../../hooks/useGovernance'

export function CompaniesPage() {
  const { isConnected } = useAccount()
  const [companyAddress, setCompanyAddress] = useState('')
  
  // Initialize our governance hook logic
  const { proposeCompanyRegistration, isPending, isSuccess, error } = useGovernance()

  // Placeholder list (later we will fetch this from events)
  const companies = [
    { name: 'BMW Group', address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', status: 'Managed' },
  ]

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyAddress.startsWith('0x') || companyAddress.length !== 42) {
      return
    }
    
    // Call the smart contract to create a Proposal
    proposeCompanyRegistration(companyAddress as `0x${string}`)
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Registration Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
              <Plus className="w-4 h-4 mr-2 text-indigo-500" />
              Register New Company
            </h3>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  Company Wallet Address
                </label>
                <input 
                  type="text"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="0x..."
                  disabled={isPending}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-sm disabled:bg-slate-50"
                />
              </div>

              <button 
                type="submit"
                disabled={!isConnected || !companyAddress || isPending}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Pending...
                  </>
                ) : (
                  <>
                    Propose Registration
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>

              {/* Transaction Status Messages */}
              {isSuccess && (
                <div className="flex items-center text-green-600 text-sm mt-2 p-2 bg-green-50 rounded">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Proposal created! Now other admins must approve it.
                </div>
              )}

              {error && (
                <div className="text-red-600 text-xs mt-2 p-2 bg-red-50 rounded break-words">
                  Error: {error.message.split('.')[0]}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Companies List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center">
                <Building2 className="w-4 h-4 mr-2 text-indigo-500" />
                Managed Companies
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {companies.map((company, idx) => (
                <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <h4 className="font-medium text-slate-900">{company.name}</h4>
                    <p className="text-xs font-mono text-slate-500 mt-1">{company.address}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                    {company.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}