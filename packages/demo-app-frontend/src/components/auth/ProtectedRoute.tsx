import { type ReactNode, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount, useDisconnect } from 'wagmi' // Added useDisconnect
import { useTrustAnchorData } from '../../hooks/useTrustAnchor'
import { Loader2, WifiOff, LogOut } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'admin' | 'company'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isConnected, address } = useAccount()
  const { disconnect } = useDisconnect() // Hook to kill session
  const navigate = useNavigate()

  // Now fetching isError too
  const { owners, isLoading, isError } = useTrustAnchorData()

  useEffect(() => {
    // 1. If wallet disconnected, kick to Landing
    if (!isConnected) {
      navigate('/', { replace: true })
      return
    }

    // 2. Wait for loading. If ERROR, do nothing (render error state below)
    if (isLoading || isError || !address) return

    const isTrustAnchorAdmin = owners.some((owner) => owner.toLowerCase() === address.toLowerCase())

    // 3. Role enforcement
    if (requiredRole === 'admin' && !isTrustAnchorAdmin) {
      navigate('/company/onboarding', { replace: true })
    }

    if (requiredRole === 'company' && isTrustAnchorAdmin) {
      navigate('/trust-anchor', { replace: true })
    }
  }, [isConnected, isLoading, isError, owners, address, requiredRole, navigate])

  // --- LOADING STATE ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-slate-500 text-sm">Verifying Identity...</p>

        {/* Emergency Logout if loading hangs */}
        <button
          onClick={() => {
            disconnect()
            navigate('/')
          }}
          className="text-xs text-red-500 hover:underline mt-4"
        >
          Taking too long? Disconnect
        </button>
      </div>
    )
  }

  // --- ERROR STATE (Blockchain Down) ---
  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <WifiOff className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Network Connection Failed</h2>
        <p className="text-slate-500 mt-2 max-w-md">
          We couldn't fetch data from the blockchain. Please check if your wallet is connected to
          the correct network or if the RPC is reachable.
        </p>
        <button
          onClick={() => {
            disconnect()
            navigate('/')
          }}
          className="mt-6 flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect & Retry
        </button>
      </div>
    )
  }

  if (!isConnected) return null

  return <>{children}</>
}
