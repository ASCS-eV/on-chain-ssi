import { decodeFunctionData, type Hex } from 'viem'
import { TRUST_ANCHOR_ABI } from './contracts'

export interface DecodedAction {
  title: string
  details: string
  type: 'governance' | 'identity' | 'unknown'
}

export function decodeProposalData(data: Hex): DecodedAction {
  if (!data || data === '0x') {
    return {
      title: 'Empty Proposal',
      details: 'No data provided',
      type: 'unknown',
    }
  }

  try {
    const taDecoded = decodeFunctionData({
      abi: TRUST_ANCHOR_ABI,
      data: data,
    })

    if (taDecoded) {
      // Cast to unknown first to handle readonly tuples from viem
      const args = taDecoded.args as unknown as unknown[]
      const funcName = taDecoded.functionName as string

      switch (funcName) {
        case '_addOwner':
          return {
            title: 'Add Admin',
            details: formatAddress(args[0] as string),
            type: 'governance',
          }
        case '_removeOwner':
          return {
            title: 'Remove Admin',
            details: formatAddress(args[0] as string),
            type: 'governance',
          }
        case '_setQuorum':
          return {
            title: 'Update Quorum',
            details: `New Threshold: ${args[0]}`,
            type: 'governance',
          }
        case '_executeChangeOwner':
          return {
            title: 'Register Company',
            details: `Identity: ${formatAddress(
              args[0] as string
            )} → New Owner: ${formatAddress(args[1] as string)}`,
            type: 'identity',
          }
        case '_setAttribute':
          return {
            title: 'Set Attribute',
            details: `Name: ${truncate(args[0] as string)}`,
            type: 'identity',
          }
        case '_addDelegate':
          return {
            title: 'Add Delegate',
            details: `Delegate: ${formatAddress(args[1] as string)}`,
            type: 'identity',
          }
      }
    }
  } catch {
    // Ignore decoding errors
  }

  return {
    title: 'Unknown Action',
    details: truncate(data, 20),
    type: 'unknown',
  }
}

function formatAddress(addr: string): string {
  if (!addr) return '?'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function truncate(str: string, len: number = 10): string {
  if (!str) return ''
  if (str.length <= len) return str
  return `${str.slice(0, len)}...`
}
