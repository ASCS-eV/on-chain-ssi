import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { TRUST_ANCHOR_ADDRESS, TRUST_ANCHOR_ABI } from '../lib/contracts'

export function useGovernance() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  // Wait for transaction to be mined
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const proposeCompanyRegistration = (companyAddress: `0x${string}`) => {
    writeContract({
      address: TRUST_ANCHOR_ADDRESS,
      abi: TRUST_ANCHOR_ABI,
      functionName: 'proposeChangeOwner',
      // identity = company, newOwner = our multisig
      args: [companyAddress, TRUST_ANCHOR_ADDRESS], 
    })
  }

  const approveProposal = (proposalId: `0x${string}`) => {
    writeContract({
        address: TRUST_ANCHOR_ADDRESS,
        abi: TRUST_ANCHOR_ABI,
        functionName: 'approve',
        args: [proposalId],
    })
    }

  return {
    proposeCompanyRegistration,
    approveProposal,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    hash
  }
}