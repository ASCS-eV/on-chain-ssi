import { useReadContract, useReadContracts, useWatchContractEvent, usePublicClient } from 'wagmi'
import { useState, useEffect } from 'react'
import { TRUST_ANCHOR_ADDRESS, TRUST_ANCHOR_ABI } from '../lib/contracts'

export function useTrustAnchorData() {
  const [proposals, setProposals] = useState<any[]>([])
  const [approvals, setApprovals] = useState<Record<string, string[]>>({})
  const publicClient = usePublicClient()

  // 1. Fetch historical proposals once on load
  useEffect(() => {
    async function fetchHistory() {
      if (!publicClient) return

      const proposalLogs = await publicClient.getContractEvents({
        address: TRUST_ANCHOR_ADDRESS,
        abi: TRUST_ANCHOR_ABI,
        eventName: 'ProposalCreated',
        fromBlock: 0n 
      })
      
      // const logs = await publicClient.getContractEvents({
      //   address: TRUST_ANCHOR_ADDRESS,
      //   abi: TRUST_ANCHOR_ABI,
      //   eventName: 'ProposalCreated',
      //   fromBlock: 0n // Fetch from the beginning of the local chain
      // })

      const historicalProposals = proposalLogs.map((log: any) => ({
        id: log.args.id,
        data: log.args.data,
        requiresUnanimity: log.args.requiresUnanimity,
      }))
      setProposals(historicalProposals)

      const approvalLogs = await publicClient.getContractEvents({
        address: TRUST_ANCHOR_ADDRESS,
        abi: TRUST_ANCHOR_ABI,
        eventName: 'Approved',
        fromBlock: 0n
      })

      const newApprovals: Record<string, string[]> = {}
      approvalLogs.forEach((log: any) => {
        const pid = log.args.id
        const owner = log.args.owner
        if (!newApprovals[pid]) newApprovals[pid] = []
        if (!newApprovals[pid].includes(owner)) newApprovals[pid].push(owner)
      })
      setApprovals(newApprovals)
    }

    fetchHistory()
  }, [publicClient])

  // 2. Watch for NEW proposals in real-time
  useWatchContractEvent({
    address: TRUST_ANCHOR_ADDRESS,
    abi: TRUST_ANCHOR_ABI,
    eventName: 'Approved',
    onLogs(logs: any[]) {
      setApprovals(prev => {
        const updated = { ...prev }
        logs.forEach((log: any) => {
          const pid = log.args.id
          const owner = log.args.owner
          if (!updated[pid]) updated[pid] = []
          if (!updated[pid].includes(owner)) updated[pid].push(owner)
        })
        return updated
      })
    },
  })

  // 3. Existing Reads
  const { data: quorum, isLoading: isQuorumLoading } = useReadContract({
    address: TRUST_ANCHOR_ADDRESS,
    abi: TRUST_ANCHOR_ABI,
    functionName: 'quorum',
  })

  const { data: ownersData, isLoading: isOwnersLoading } = useReadContracts({
    contracts: [
      { address: TRUST_ANCHOR_ADDRESS, abi: TRUST_ANCHOR_ABI, functionName: 'owners', args: [0n] },
      { address: TRUST_ANCHOR_ADDRESS, abi: TRUST_ANCHOR_ABI, functionName: 'owners', args: [1n] },
      { address: TRUST_ANCHOR_ADDRESS, abi: TRUST_ANCHOR_ABI, functionName: 'owners', args: [2n] },
    ]
  })

  const owners = ownersData 
    ? ownersData.filter(o => o.status === 'success').map(o => o.result as string)
    : []

  return {
    quorum: quorum ? Number(quorum) : 0,
    owners,
    proposals,
    approvals,
    totalAdmins: owners.length,
    isLoading: isQuorumLoading || isOwnersLoading
  }
}