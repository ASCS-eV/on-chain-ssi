import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { encodeFunctionData, keccak256, toBytes, toHex } from 'viem'
import {
  TRUST_ANCHOR_ADDRESS,
  TRUST_ANCHOR_ABI,
  REGISTRY_ADDRESS,
  REGISTRY_ABI,
  CRSET_REGISTRY_ADDRESS,
  CRSET_REGISTRY_ABI,
} from '../lib/contracts'

export function useDIDSync() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })

  const syncCIDToDID = async (companyDID: `0x${string}`) => {
    if (!TRUST_ANCHOR_ADDRESS || !REGISTRY_ADDRESS || !CRSET_REGISTRY_ADDRESS) {
      throw new Error('Contract addresses not configured')
    }

    // Prepare setAttribute call - static endpoint (one-time setup, no manual syncing needed anymore)
    const attributeName = keccak256(toBytes('did/svc/CredentialRevocationList'))

    // JSON structure: blockchain native contract reference
    const endpointData = JSON.stringify({
      contract: CRSET_REGISTRY_ADDRESS,
      chainId: 31337, // Localhost hardhat (change to 11155111 for Sepolia)
      function: 'getRevocationCID',
      params: ['{{identity}}'],
    })

    const attributeValue = toHex(toBytes(endpointData))
    const validity = BigInt(31536000) // 1 year in seconds

    const setAttributeData = encodeFunctionData({
      abi: REGISTRY_ABI,
      functionName: 'setAttribute',
      args: [companyDID, attributeName, attributeValue, validity],
    })

    // Execute using multisig execCall
    writeContract({
      address: TRUST_ANCHOR_ADDRESS,
      abi: TRUST_ANCHOR_ABI,
      functionName: 'execCall',
      args: [REGISTRY_ADDRESS, setAttributeData],
    })
  }

  return {
    syncCIDToDID,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  }
}

export function useReadCID(companyDID: `0x${string}` | undefined) {
  const {
    data: cid,
    isLoading,
    refetch,
  } = useReadContract({
    address: CRSET_REGISTRY_ADDRESS,
    abi: CRSET_REGISTRY_ABI,
    functionName: 'getRevocationCID',
    args: companyDID ? [companyDID] : undefined,
    query: { enabled: !!companyDID },
  })

  return { cid: cid as string | undefined, isLoading, refetch }
}
