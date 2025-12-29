import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TRUST_ANCHOR_ADDRESS, TRUST_ANCHOR_ABI } from "../lib/contracts";

export function useGovernance() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // 1. Propose changing owner of a company identity (Company Registration)
  const proposeCompanyRegistration = (companyAddress: `0x${string}`) => {
    writeContract({
      address: TRUST_ANCHOR_ADDRESS,
      abi: TRUST_ANCHOR_ABI,
      functionName: "proposeChangeOwner",
      args: [companyAddress, TRUST_ANCHOR_ADDRESS],
    });
  };

  // 2. Approve any proposal
  const approveProposal = (proposalId: `0x${string}`) => {
    writeContract({
      address: TRUST_ANCHOR_ADDRESS,
      abi: TRUST_ANCHOR_ABI,
      functionName: "approve",
      args: [proposalId],
    });
  };

  // 3. Propose adding a new TA Admin
  const proposeAddOwner = (newAdmin: `0x${string}`) => {
    writeContract({
      address: TRUST_ANCHOR_ADDRESS,
      abi: TRUST_ANCHOR_ABI,
      functionName: "proposeAddOwner",
      args: [newAdmin],
    });
  };

  // 4. Propose removing a TA Admin
  const proposeRemoveOwner = (adminToRemove: `0x${string}`) => {
    writeContract({
      address: TRUST_ANCHOR_ADDRESS,
      abi: TRUST_ANCHOR_ABI,
      functionName: "proposeRemoveOwner",
      args: [adminToRemove],
    });
  };

  // 5. Propose updating Quorum
  const proposeQuorumUpdate = (newQuorum: number) => {
    writeContract({
      address: TRUST_ANCHOR_ADDRESS,
      abi: TRUST_ANCHOR_ABI,
      functionName: "proposeQuorumUpdate",
      args: [BigInt(newQuorum)],
    });
  };

  return {
    proposeCompanyRegistration,
    approveProposal,
    proposeAddOwner,
    proposeRemoveOwner,
    proposeQuorumUpdate,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  };
}
