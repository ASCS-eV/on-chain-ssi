import { type Address } from 'viem'

// 1. Address of your contract (Placeholder for now)
export const TRUST_ANCHOR_ADDRESS: Address = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" 

export const TRUST_ANCHOR_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "id", "type": "bytes32" },
      { "indexed": false, "internalType": "bytes", "name": "data", "type": "bytes" },
      { "indexed": false, "internalType": "bool", "name": "requiresUnanimity", "type": "bool" }
    ],
    "name": "ProposalCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "id", "type": "bytes32" },
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" }
    ],
    "name": "Approved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "id", "type": "bytes32" }
    ],
    "name": "Executed",
    "type": "event"
  },

  // --- FUNCTIONS ---
  {
    "inputs": [],
    "name": "quorum",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "owners",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "identity", "type": "address" },
      { "internalType": "address", "name": "newOwner", "type": "address" }
    ],
    "name": "proposeChangeOwner",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "id", "type": "bytes32" }],
    "name": "approve",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const