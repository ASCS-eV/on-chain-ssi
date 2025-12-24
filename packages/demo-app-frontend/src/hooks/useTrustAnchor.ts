import { useReadContract, useReadContracts, useWatchContractEvent, usePublicClient } from 'wagmi'
import { useState, useEffect } from 'react'
import { TRUST_ANCHOR_ADDRESS, TRUST_ANCHOR_ABI } from '../lib/contracts'

export function useTrustAnchorData() {
  const [proposals, setProposals] = useState<any[]>([])
  const publicClient = usePublicClient()

  // 1. Fetch historical proposals once on load
  useEffect(() => {
    async function fetchHistory() {
      if (!publicClient) return
      
      const logs = await publicClient.getContractEvents({
        address: TRUST_ANCHOR_ADDRESS,
        abi: TRUST_ANCHOR_ABI,
        eventName: 'ProposalCreated',
        fromBlock: 0n // Fetch from the beginning of the local chain
      })

      const historicalProposals = logs.map((log: any) => ({
        id: log.args.id,
        data: log.args.data,
        requiresUnanimity: log.args.requiresUnanimity,
      }))
      setProposals(historicalProposals)
    }

    fetchHistory()
  }, [publicClient])

  // 2. Watch for NEW proposals in real-time
  useWatchContractEvent({
    address: TRUST_ANCHOR_ADDRESS,
    abi: TRUST_ANCHOR_ABI,
    eventName: 'ProposalCreated',
    onLogs(logs: any[]) {
      const newProposals = logs.map((log: any) => ({
        id: log.args.id,
        data: log.args.data,
        requiresUnanimity: log.args.requiresUnanimity,
      }))
      // Merge unique proposals only
      setProposals(prev => {
        const combined = [...prev, ...newProposals]
        return Array.from(new Map(combined.map(p => [p.id, p])).values())
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
    totalAdmins: owners.length,
    isLoading: isQuorumLoading || isOwnersLoading
  }
}