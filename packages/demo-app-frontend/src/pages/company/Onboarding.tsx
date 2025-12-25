import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { REGISTRY_ADDRESS, REGISTRY_ABI, TRUST_ANCHOR_ADDRESS } from '../../lib/contracts'
import { ArrowRight, CheckCircle2, Building, Loader2, AlertCircle } from 'lucide-react'

export function CompanyOnboardingPage() {
  const { address, isConnected } = useAccount()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const handOverControl = () => {
    if (!address) return

    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'changeOwner',
      // We change owner of 'address' (Identity) to 'TRUST_ANCHOR_ADDRESS' (New Owner)
      args: [address, TRUST_ANCHOR_ADDRESS], 
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Company Onboarding</h1>
        <p className="text-slate-500 mt-2">Delegate control of your DID to the Trust Anchor.</p>
      </div>

      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
            <Building className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Step 1: Delegate Identity</h3>
            <p className="text-sm text-slate-500">
              {isConnected && address ? (
                 <>You are logged in as: <span className="font-mono bg-slate-100 px-1 rounded">{address.slice(0,10)}...</span></>
              ) : (
                 "Please connect wallet"
              )}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg flex items-start text-sm">
             <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
             <span className="break-all">Error: {error.message.split('\n')[0]}</span>
          </div>
        )}

        {!isConnected ? (
          <div className="text-amber-600 bg-amber-50 p-4 rounded-lg text-sm font-medium">
            Please connect the Company Wallet first.
          </div>
        ) : isSuccess ? (
          <div className="flex items-center p-4 bg-green-50 text-green-700 rounded-lg">
            <CheckCircle2 className="w-5 h-5 mr-3" />
            <div>
              <p className="font-medium">Success! Control delegated.</p>
              <p className="text-sm">Now the Trust Anchor admins can vote to register your company.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-600 text-sm">
              By clicking below, you will sign a transaction on the DID Registry to set the 
              <strong> Trust Anchor Contract </strong> as the controller of your identity.
            </p>
            
            <button
              onClick={handOverControl}
              disabled={isPending || isConfirming || !address}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Delegate to Trust Anchor
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}