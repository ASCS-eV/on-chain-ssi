import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TRUST_ANCHOR_ADDRESS, TRUST_ANCHOR_ABI } from "../lib/contracts";
import { toast } from "sonner";
import { useEffect } from "react";

export function useGovernance() {
  const {
    writeContract,
    data: hash,
    error,
    isPending,
  } = useWriteContract({
    mutation: {
      onError: (err) => {
        toast.error("Transaction Failed", {
          description: err.message.split("\n")[0], // Short error
        });
      },
    },
  });

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess && hash) {
      toast.success("Transaction Confirmed!", {
        description: "The proposal has been executed or queued successfully.",
        action: {
          label: "View Explorer",
          onClick: () =>
            window.open(`https://sepolia.etherscan.io/tx/${hash}`, "_blank"),
        },
      });
    }
  }, [isSuccess, hash]);

  // 1. Propose changing owner of a company identity (Company Registration)
  const proposeCompanyRegistration = (companyAddress: `0x${string}`) => {
    toast.info("Check your wallet", {
      description: "Please sign the proposal transaction.",
    });
    writeContract({
      address: TRUST_ANCHOR_ADDRESS,
      abi: TRUST_ANCHOR_ABI,
      functionName: "proposeChangeOwner",
      args: [companyAddress, TRUST_ANCHOR_ADDRESS],
    });
  };

  // 2. Approve any proposal
  const approveProposal = (proposalId: `0x${string}`) => {
    toast.info("Check your wallet", { description: "Signing approval..." });
    writeContract({
      address: TRUST_ANCHOR_ADDRESS,
      abi: TRUST_ANCHOR_ABI,
      functionName: "approve",
      args: [proposalId],
    });
  };

  // 3. Propose adding a new TA Admin
  const proposeAddOwner = (newAdmin: `0x${string}`) => {
    toast.info("Check your wallet", {
      description: "Signing owner addition proposal...",
    });
    writeContract({
      address: TRUST_ANCHOR_ADDRESS,
      abi: TRUST_ANCHOR_ABI,
      functionName: "proposeAddOwner",
      args: [newAdmin],
    });
  };

  // 4. Propose removing a TA Admin
  const proposeRemoveOwner = (adminToRemove: `0x${string}`) => {
    toast.info("Check your wallet", {
      description: "Signing owner removal proposal...",
    });
    writeContract({
      address: TRUST_ANCHOR_ADDRESS,
      abi: TRUST_ANCHOR_ABI,
      functionName: "proposeRemoveOwner",
      args: [adminToRemove],
    });
  };

  // 5. Propose updating Quorum
  const proposeQuorumUpdate = (newQuorum: number) => {
    toast.info("Check your wallet", {
      description: "Signing quorum update proposal...",
    });
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
