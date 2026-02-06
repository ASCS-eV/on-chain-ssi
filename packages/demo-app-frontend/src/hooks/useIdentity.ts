import { useAccount } from 'wagmi'
import { useTrustAnchorData } from './useTrustAnchor'
import { useMemo } from 'react'

export type UserRole = 'admin' | 'company' | 'guest'

export function useIdentity() {
  const { address, isConnected } = useAccount()
  const { owners, isLoading } = useTrustAnchorData()

  const role: UserRole = useMemo(() => {
    if (!isConnected || !address) return 'guest'
    if (isLoading) return 'guest'

    // Check if address is in owners list (case-insensitive)
    const isTaAdmin = owners.some((owner) => owner.toLowerCase() === address.toLowerCase())

    return isTaAdmin ? 'admin' : 'company'
  }, [address, isConnected, owners, isLoading])

  const roleLabel = useMemo(() => {
    switch (role) {
      case 'admin':
        return 'Trust Anchor Admin'
      case 'company':
        return 'Company User'
      default:
        return 'Guest'
    }
  }, [role])

  return {
    address,
    shortAddress: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '',
    isConnected,
    role,
    roleLabel,
    isLoading,
  }
}
