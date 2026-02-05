import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import {
  REGISTRY_ADDRESS,
  REGISTRY_ABI,
  TRUST_ANCHOR_ADDRESS,
  CRSET_REGISTRY_ADDRESS,
  CRSET_REGISTRY_ABI,
} from '../../lib/contracts'
import {
  ArrowRight,
  CheckCircle2,
  Building,
  Loader2,
  ShieldCheck,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { useEffect } from 'react'

interface StepProps {
  num: number
  title: string
  desc: string
  status: 'pending' | 'current' | 'completed'
  isPending?: boolean
  isConfirming?: boolean
  isOwnerLoading?: boolean
  isAdminLoading?: boolean
  address?: `0x${string}`
  handOverControl?: () => void
  refetchAdmin?: () => void
}

const Step = ({
  num,
  title,
  desc,
  status,
  isPending,
  isConfirming,
  isOwnerLoading,
  isAdminLoading,
  address,
  handOverControl,
  refetchAdmin,
}: StepProps) => (
  <div
    className={`relative flex items-start pb-12 last:pb-0 ${status === 'pending' ? 'opacity-40' : 'opacity-100'}`}
  >
    <div className="absolute left-4 top-10 -bottom-2 w-0.5 bg-slate-200 last:hidden"></div>

    <div
      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 mr-4 flex-shrink-0 transition-colors ${
        status === 'completed'
          ? 'bg-green-100 border-green-500 text-green-600'
          : status === 'current'
            ? 'bg-indigo-50 border-indigo-600 text-indigo-600'
            : 'bg-slate-50 border-slate-300 text-slate-400'
      }`}
    >
      {status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <span>{num}</span>}
    </div>

    <div className="pt-1 w-full">
      <h4 className={`font-bold ${status === 'current' ? 'text-indigo-700' : 'text-slate-900'}`}>
        {title}
      </h4>
      <p className="text-sm text-slate-500 mt-1 max-w-sm leading-relaxed">{desc}</p>

      {status === 'current' && num === 1 && (
        <div className="mt-4">
          <button
            onClick={handOverControl}
            disabled={isPending || isConfirming || !address || isOwnerLoading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center transition-colors shadow-sm disabled:opacity-50"
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
              </>
            ) : isOwnerLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading status...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 mr-2" /> Delegate Identity
              </>
            )}
          </button>
        </div>
      )}

      {status === 'current' && num === 2 && (
        <div className="mt-4 flex items-center gap-3 p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-100 text-sm">
          <Clock className="w-4 h-4 flex-shrink-0 animate-pulse" />
          <div>
            <p className="font-semibold">Verification Pending</p>
            <p className="text-xs opacity-80 mt-1">
              Contact Trust Anchor to approve your registration.
            </p>
          </div>
          <button
            onClick={() => refetchAdmin?.()}
            className="ml-auto p-2 hover:bg-amber-100 rounded-full"
            title="Check Status"
          >
            <RefreshCw className={`w-4 h-4 ${isAdminLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}
    </div>
  </div>
)

export function CompanyOnboardingPage() {
  const { address } = useAccount()
  const {
    writeContract,
    data: hash,
    isPending,
  } = useWriteContract({
    mutation: {
      onError: (err) =>
        toast.error('Delegation Failed', { description: err.message.split('\n')[0] }),
    },
  })

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // 1. Check Identity Ownership
  const {
    data: identityOwner,
    isLoading: isOwnerLoading,
    refetch: refetchOwner,
  } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'identityOwner',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 3000 },
  })

  // 2. Check CRSet Admin Status
  const {
    data: isCompanyAdmin,
    isLoading: isAdminLoading,
    refetch: refetchAdmin,
  } = useReadContract({
    address: CRSET_REGISTRY_ADDRESS,
    abi: CRSET_REGISTRY_ABI,
    functionName: 'isCompanyAdmin',
    args: address ? [address, address] : undefined,
    query: { enabled: !!address, refetchInterval: 3000 },
  })

  // Refetch data when transaction succeeds
  useEffect(() => {
    if (isSuccess) {
      refetchOwner()
      setTimeout(refetchOwner, 2000) // Double check for indexing delay
    }
  }, [isSuccess, refetchOwner])

  // DERIVE STATE
  const isManaged =
    identityOwner &&
    TRUST_ANCHOR_ADDRESS &&
    identityOwner.toLowerCase() === TRUST_ANCHOR_ADDRESS.toLowerCase()

  const isFullyOnboarded = isManaged && isCompanyAdmin

  const handOverControl = () => {
    if (!address) return
    toast.info('Check your wallet', { description: 'Please sign the delegation transaction.' })
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'changeOwner',
      args: [address, TRUST_ANCHOR_ADDRESS],
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Company Onboarding</h1>
        <p className="text-slate-500 mt-2">
          Secure your digital identity within the Trust Anchor ecosystem.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* LEFT: STEPS (Non-blocking) */}
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          <div className="mt-2">
            <Step
              num={1}
              title="Delegate Control"
              desc="Transfer ownership of your did:ethr identity to the Trust Anchor smart contract."
              status={isManaged ? 'completed' : 'current'}
              isPending={isPending}
              isConfirming={isConfirming}
              address={address}
              isOwnerLoading={isOwnerLoading}
              handOverControl={handOverControl}
            />
            <Step
              num={2}
              title="Trust Anchor Verification"
              desc="The Trust Anchor admins will verify your company details and register you."
              status={isManaged ? (isFullyOnboarded ? 'completed' : 'current') : 'pending'}
              isAdminLoading={isAdminLoading}
              refetchAdmin={refetchAdmin}
            />
            <Step
              num={3}
              title="Onboarding Complete"
              desc="You now have full access to manage your Credential Revocation Lists."
              status={isFullyOnboarded ? 'completed' : 'pending'}
            />
          </div>
        </div>

        {/* RIGHT: STATUS CARD */}
        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-400">
                <Building className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <h3 className="font-bold text-slate-900">Your Identity</h3>
                <p className="text-xs font-mono text-slate-500 truncate">
                  {address || 'Not Connected'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm py-2 border-b border-slate-200">
                <span className="text-slate-500">Identity Status</span>
                {isOwnerLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                ) : (
                  <span className={`font-bold ${isManaged ? 'text-green-600' : 'text-amber-600'}`}>
                    {isManaged ? 'Managed by TA' : 'Self-Sovereign'}
                  </span>
                )}
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-slate-200">
                <span className="text-slate-500">Service Access</span>
                {isAdminLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                ) : (
                  <span
                    className={`font-bold ${isCompanyAdmin ? 'text-green-600' : 'text-slate-400'}`}
                  >
                    {isCompanyAdmin ? 'Authorized' : 'Restricted'}
                  </span>
                )}
              </div>
            </div>

            {isFullyOnboarded && (
              <div className="mt-6">
                <Link
                  to="/company/revocations"
                  className="block w-full py-3 bg-emerald-600 text-white text-center rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  Go to Revocation Manager <ArrowRight className="w-4 h-4 inline ml-1" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
