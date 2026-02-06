import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { encodeFunctionData } from 'viem'
import {
  TRUST_ANCHOR_ADDRESS,
  TRUST_ANCHOR_ABI,
  CRSET_REGISTRY_ADDRESS,
  CRSET_REGISTRY_ABI,
} from '../lib/contracts'

export function useCRSetManagement() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Add company admin using execCall (single TA admin is enough , no need to voting)
  const addCompanyAdmin = (companyDID: `0x${string}`, adminAddress: `0x${string}`) => {
    // Encode the addCompanyAdmin call
    const addAdminData = encodeFunctionData({
      abi: CRSET_REGISTRY_ABI,
      functionName: 'addCompanyAdmin',
      args: [companyDID, adminAddress],
    })

    // Execute using multisig
    writeContract({
      address: TRUST_ANCHOR_ADDRESS,
      abi: TRUST_ANCHOR_ABI,
      functionName: 'execCall',
      args: [CRSET_REGISTRY_ADDRESS, addAdminData],
    })
  }

  // Remove company admin using execCall
  const removeCompanyAdmin = (companyDID: `0x${string}`, adminAddress: `0x${string}`) => {
    // Encode the removeCompanyAdmin call
    const removeAdminData = encodeFunctionData({
      abi: CRSET_REGISTRY_ABI,
      functionName: 'removeCompanyAdmin',
      args: [companyDID, adminAddress],
    })

    writeContract({
      address: TRUST_ANCHOR_ADDRESS,
      abi: TRUST_ANCHOR_ABI,
      functionName: 'execCall',
      args: [CRSET_REGISTRY_ADDRESS, removeAdminData],
    })
  }

  return {
    addCompanyAdmin,
    removeCompanyAdmin,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  }
}
