import {
  useReadContract,
  useReadContracts,
  useWatchContractEvent,
  usePublicClient,
} from "wagmi";
import { useState, useEffect } from "react";
import { decodeFunctionData } from "viem";
import { TRUST_ANCHOR_ADDRESS, TRUST_ANCHOR_ABI } from "../lib/contracts";

// Helper type for decoded proposal
export interface DecodedProposal {
  id: string;
  rawInfo: {
    data: `0x${string}`;
    requiresUnanimity: boolean;
  };
  description: string;
  functionName: string;
  args: any[];
}

export function useTrustAnchorData() {
  const [proposals, setProposals] = useState<DecodedProposal[]>([]);
  const [approvals, setApprovals] = useState<Record<string, string[]>>({});
  const publicClient = usePublicClient();

  // 1. Fetch history & Decode
  useEffect(() => {
    async function fetchHistory() {
      if (!publicClient) return;

      const proposalLogs = await publicClient.getContractEvents({
        address: TRUST_ANCHOR_ADDRESS,
        abi: TRUST_ANCHOR_ABI,
        eventName: "ProposalCreated",
        fromBlock: 0n,
      });

      const decodedProposals = proposalLogs.map((log: any) => {
        const { id, data, requiresUnanimity } = log.args;
        let description = "Unknown Action";
        let funcName = "unknown";
        let decodedArgs: any[] = [];

        try {
          const decoded = decodeFunctionData({
            abi: TRUST_ANCHOR_ABI,
            data: data,
          });
          funcName = decoded.functionName;
          decodedArgs = decoded.args as unknown as any[];

          // Human readable description builder
          switch (funcName) {
            case "_setQuorum":
              description = `Update Quorum to ${decodedArgs[0]}`;
              break;
            case "_addOwner":
              description = `Add Admin: ${decodedArgs[0].slice(
                0,
                6
              )}...${decodedArgs[0].slice(-4)}`;
              break;
            case "_removeOwner":
              description = `Remove Admin: ${decodedArgs[0].slice(
                0,
                6
              )}...${decodedArgs[0].slice(-4)}`;
              break;
            case "_executeChangeOwner":
              description = `Register Company: ${decodedArgs[0].slice(
                0,
                6
              )}...`;
              break;
            default:
              description = `Execute ${funcName}`;
          }
        } catch (e) {
          console.error("Failed to decode proposal data", e);
        }

        return {
          id,
          rawInfo: { data, requiresUnanimity },
          description,
          functionName: funcName,
          args: decodedArgs,
        };
      });

      setProposals(decodedProposals);

      // Fetch Approvals
      const approvalLogs = await publicClient.getContractEvents({
        address: TRUST_ANCHOR_ADDRESS,
        abi: TRUST_ANCHOR_ABI,
        eventName: "Approved",
        fromBlock: 0n,
      });

      const newApprovals: Record<string, string[]> = {};
      approvalLogs.forEach((log: any) => {
        const pid = log.args.id;
        const owner = log.args.owner;
        if (!newApprovals[pid]) newApprovals[pid] = [];
        if (!newApprovals[pid].includes(owner)) newApprovals[pid].push(owner);
      });
      setApprovals(newApprovals);
    }

    fetchHistory();
  }, [publicClient]);

  // 2. Watch for NEW approvals (Real-time updates)
  useWatchContractEvent({
    address: TRUST_ANCHOR_ADDRESS,
    abi: TRUST_ANCHOR_ABI,
    eventName: "Approved",
    onLogs(logs: any[]) {
      setApprovals((prev) => {
        const updated = { ...prev };
        logs.forEach((log: any) => {
          const pid = log.args.id;
          const owner = log.args.owner;
          if (!updated[pid]) updated[pid] = [];
          if (!updated[pid].includes(owner)) updated[pid].push(owner);
        });
        return updated;
      });
    },
  });

  // Note: We should also watch for ProposalCreated to auto-update the list,
  // but for now history fetch on mount covers most cases.

  // 3. Existing Reads
  const { data: quorum, isLoading: isQuorumLoading } = useReadContract({
    address: TRUST_ANCHOR_ADDRESS,
    abi: TRUST_ANCHOR_ABI,
    functionName: "quorum",
  });

  const { data: ownersData, isLoading: isOwnersLoading } = useReadContracts({
    contracts: [
      {
        address: TRUST_ANCHOR_ADDRESS,
        abi: TRUST_ANCHOR_ABI,
        functionName: "owners",
        args: [0n],
      },
      {
        address: TRUST_ANCHOR_ADDRESS,
        abi: TRUST_ANCHOR_ABI,
        functionName: "owners",
        args: [1n],
      },
      {
        address: TRUST_ANCHOR_ADDRESS,
        abi: TRUST_ANCHOR_ABI,
        functionName: "owners",
        args: [2n],
      },
      {
        address: TRUST_ANCHOR_ADDRESS,
        abi: TRUST_ANCHOR_ABI,
        functionName: "owners",
        args: [3n],
      }, // Fetch a few more
      {
        address: TRUST_ANCHOR_ADDRESS,
        abi: TRUST_ANCHOR_ABI,
        functionName: "owners",
        args: [4n],
      },
    ],
  });

  const owners = ownersData
    ? ownersData
        .filter((o) => o.status === "success")
        .map((o) => o.result as string)
    : [];

  return {
    quorum: quorum ? Number(quorum) : 0,
    owners,
    proposals,
    approvals,
    totalAdmins: owners.length,
    isLoading: isQuorumLoading || isOwnersLoading,
  };
}
