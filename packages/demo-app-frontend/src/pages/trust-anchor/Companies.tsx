import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Building2,
  UserPlus,
  UserMinus,
  Link,
  Clock,
  Info,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useReadContract, usePublicClient } from 'wagmi'
import { useCRSetManagement } from '../../hooks/useCRSetManagement'
import { useDIDSync, useReadCID } from '../../hooks/useDIDSync'
import {
  REGISTRY_ADDRESS,
  REGISTRY_ABI,
  TRUST_ANCHOR_ADDRESS,
  CRSET_REGISTRY_ADDRESS,
  CRSET_REGISTRY_ABI,
} from '../../lib/contracts'
import { isAddress, keccak256, toBytes } from 'viem'
import { toast } from 'sonner'

export function CompaniesPage() {
  const [inputAddress, setInputAddress] = useState('')
  const [debouncedAddress, setDebouncedAddress] = useState<`0x${string}` | undefined>(undefined)

  // State for Admin Tools
  const [adminAddress, setAdminAddress] = useState('')
  const [hasStaticEndpoint, setHasStaticEndpoint] = useState(false)
  const [isCheckingEndpoint, setIsCheckingEndpoint] = useState(false)

  // Hooks
  const publicClient = usePublicClient()
  const {
    addCompanyAdmin,
    removeCompanyAdmin,
    isPending: isAdminPending,
    isSuccess: isAdminSuccess,
  } = useCRSetManagement()
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

  // Check if static endpoint is already set
  useEffect(() => {
    async function checkEndpoint() {
      if (!debouncedAddress || !publicClient) return

      setIsCheckingEndpoint(true)
      try {
        const attributeName = keccak256(toBytes('did/svc/CredentialRevocationList'))

        // Use proper ABI from contracts.ts
        const didAttributeChangedEvent = REGISTRY_ABI.find(
          (item) => item.type === 'event' && item.name === 'DIDAttributeChanged'
        )

        if (!didAttributeChangedEvent) {
          console.error('DIDAttributeChanged event not found in ABI')
          setHasStaticEndpoint(false)
          setIsCheckingEndpoint(false)
          return
        }

        const logs = await publicClient.getLogs({
          address: REGISTRY_ADDRESS,
          event: didAttributeChangedEvent as typeof didAttributeChangedEvent,
          args: { identity: debouncedAddress },
          fromBlock: 0n,
        })

        // check if any event matches the attribute name
        const endpointSet = logs.some(
          (log: unknown) => (log as { args: { name: string } }).args.name === attributeName
        )
        setHasStaticEndpoint(endpointSet)
      } catch (error) {
        console.error('Error checking endpoint:', error)
        setHasStaticEndpoint(false)
      } finally {
        setIsCheckingEndpoint(false)
      }
    }

    checkEndpoint()
  }, [debouncedAddress, publicClient])

  // Notifications
  useEffect(() => {
    if (isAdminSuccess) toast.success('Admin Updated Successfully')
    if (isSyncSuccess) {
      toast.success('Static Endpoint Initialized')
      setHasStaticEndpoint(true)
    }
  }, [isAdminSuccess, isSyncSuccess])

  // 1. READ: Identity Owner
  const { data: currentOwner, isLoading: isCheckingOwner } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'identityOwner',
    args: debouncedAddress ? [debouncedAddress] : undefined,
    query: { enabled: !!debouncedAddress },
  })

  // 2. READ: Is Already Admin (Registered)
  const { data: isRegisteredAdmin, isLoading: isCheckingAdmin } = useReadContract({
    address: CRSET_REGISTRY_ADDRESS,
    abi: CRSET_REGISTRY_ABI,
    functionName: 'isCompanyAdmin',
    args: debouncedAddress ? [debouncedAddress, debouncedAddress] : undefined, // Check if company is admin of itself
    query: { enabled: !!debouncedAddress },
  })

  const isLoading = isCheckingOwner || isCheckingAdmin

  // --- LOGIC: 3 STATES ---
  const isManaged =
    currentOwner &&
    TRUST_ANCHOR_ADDRESS &&
    currentOwner.toLowerCase() === TRUST_ANCHOR_ADDRESS.toLowerCase()

  // State 1: Unmanaged (Needs Delegation)
  const isUnmanaged = !isManaged

  // State 2: Delegated but NOT Registered (Needs Action from TA)
  const isPendingRegistration = isManaged && !isRegisteredAdmin

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
    if (!debouncedAddress) return
    syncCIDToDID(debouncedAddress)
  }

  // --- UI RENDERERS ---

  const renderStatus = () => {
    if (!inputAddress)
      return (
        <div className="text-center py-12 text-slate-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Enter a DID address to check status</p>
        </div>
      )

    if (!isAddress(inputAddress))
      return (
        <div className="text-center py-12 text-red-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Invalid Ethereum Address</p>
        </div>
      )

    if (isLoading)
      return (
        <div className="text-center py-12 text-slate-500">
          <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-indigo-500" />
          <p>Verifying Identity Status...</p>
        </div>
      )

    // STATE 1: Unmanaged (Red)
    if (isUnmanaged) {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <div className="p-6 rounded-xl border-2 border-red-200 bg-red-50/50">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-slate-900">Action Required: Delegation</h4>
                <p className="text-slate-600 mt-1">
                  This identity is NOT controlled by the Trust Anchor. The company must delegate
                  control first via the Onboarding page.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // STATE 2: Pending Registration (Yellow)
    if (isPendingRegistration) {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <div className="p-6 rounded-xl border-2 border-amber-300 bg-amber-50">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-amber-100 text-amber-700">
                <Clock className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-slate-900">
                  Identity Managed (Step 1 Complete)
                </h4>
                <p className="text-slate-700 mt-1 text-sm">
                  The Trust Anchor owns this identity, but the company wallet has no write access
                  yet.
                </p>
                <div className="mt-4 p-3 bg-white/80 rounded border border-amber-200 text-amber-800 text-sm font-medium flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Action Required: Add this address to "CRSet Admins" below.
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // STATE 3: Fully Registered (Green)
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2">
        <div className="p-6 rounded-xl border-2 border-green-200 bg-green-50/50">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-slate-900">Fully Verified</h4>
              <p className="text-slate-600 mt-1">
                Identity is managed and the company has full admin access to their CRSet.
              </p>
            </div>
          </div>
        </div>
        {/* No Register Button here - it's already done */}
      </div>
    )
  }

  // ... (Advanced Tools render remains the same)
  const renderAdvancedTools = () => {
    if (!isManaged || !debouncedAddress) return null

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
                {isAdminPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-1" /> Add
                  </>
                )}
              </button>
              <button
                onClick={handleRemoveAdmin}
                disabled={isAdminPending || !adminAddress}
                className="flex-1 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 flex justify-center items-center"
              >
                {isAdminPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserMinus className="w-4 h-4 mr-1" /> Remove
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* TOOL 2: STATIC ENDPOINT SETUP */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Link className="w-5 h-5 text-blue-600" />
            Static Endpoint Setup
          </h3>
          <div className="space-y-4">
            {/* Info Banner */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800">
                One-time setup that links this company's DID to their revocation list contract.
                After initialization, verifiers read CID updates automatically.
              </p>
            </div>

            {/* Current Status */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-xs text-slate-500 uppercase font-bold mb-2">Endpoint Status</p>
              {isCheckingEndpoint ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Checking...</span>
                </div>
              ) : hasStaticEndpoint ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Initialized</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Not Set</span>
                </div>
              )}
            </div>

            {/* Current CID Preview */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-xs text-slate-500 uppercase font-bold mb-1">
                Latest Published CID
              </p>
              {isCIDLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : companyCID ? (
                <div>
                  <p className="font-mono text-xs text-slate-800 break-all mb-2">{companyCID}</p>
                  <p className="text-xs text-slate-500 italic">
                    Verifiers read this automatically via the static endpoint
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No CID published yet</p>
              )}
            </div>

            {/* Action Button */}
            <button
              onClick={handleSync}
              disabled={isSyncPending || hasStaticEndpoint}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {isSyncPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Initializing...
                </>
              ) : hasStaticEndpoint ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Already Initialized
                </>
              ) : (
                <>
                  <Link className="w-4 h-4 mr-2" /> Initialize Static Endpoint
                </>
              )}
            </button>

            {hasStaticEndpoint && (
              <p className="text-xs text-slate-500 text-center">
                No further action needed. Verifiers will read CID updates automatically from the
                contract.
              </p>
            )}
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

        <div className="mt-6 border-t border-slate-100 pt-6">{renderStatus()}</div>
      </div>

      {/* Advanced Tools */}
      {renderAdvancedTools()}
    </div>
  )
}
