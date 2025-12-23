import { useReadContract } from 'wagmi'
import { TRUST_ANCHOR_ADDRESS, TRUST_ANCHOR_ABI } from '../lib/contracts'

export function useTrustAnchorData() {
  
  // 1. Reading the value of Quorum
  const { data: quorum, isLoading: isQuorumLoading } = useReadContract({
    address: TRUST_ANCHOR_ADDRESS,
    abi: TRUST_ANCHOR_ABI,
    functionName: 'quorum',
    // Wagmi automatically updates data when new blocks appear
  })

  // Note: To get the number of admins (owners.length), 
  // in Solidity, you need to call owners(index) for public arrays.
  // For now, we'll just show Quorum to check the connection.

  return {
    quorum: quorum?.toString() || '0', // converting BigInt into a string
    isLoading: isQuorumLoading
  }
}