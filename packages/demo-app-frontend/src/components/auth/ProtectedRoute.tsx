import { type ReactNode, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useTrustAnchorData } from '../../hooks/useTrustAnchor'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'admin' | 'company' // 'company' means 'non-admin' in this context
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isConnected, address } = useAccount()
  const navigate = useNavigate()
  const { owners, isLoading } = useTrustAnchorData()

  useEffect(() => {
    // 1. If wallet disconnected, kick to Landing
    if (!isConnected) {
      navigate('/', { replace: true })
      return
    }

    // 2. Wait for TA data to load before making decisions
    if (isLoading || !address) return

    const isTrustAnchorAdmin = owners.some(
      (owner) => owner.toLowerCase() === address.toLowerCase()
    )

    // 3. Role enforcement
    if (requiredRole === 'admin' && !isTrustAnchorAdmin) {
      // Trying to access Admin area but is NOT admin -> go to company flow
      navigate('/company/onboarding', { replace: true })
    }

    if (requiredRole === 'company' && isTrustAnchorAdmin) {
      // Trying to access Company area but IS admin -> go to admin dashboard
      navigate('/trust-anchor', { replace: true })
    }

  }, [isConnected, isLoading, owners, address, requiredRole, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    )
  }

  // If not connected, we return null because useEffect will redirect. 
  // This prevents flashing of protected content.
  if (!isConnected) return null

  return <>{children}</>
}