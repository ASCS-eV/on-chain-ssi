// FIX: Added 'type' keyword here. 
// This tells Vite "Address" is just for TypeScript, not real JavaScript code.
import { type Address } from 'viem'

// 1. Address of your contract (Placeholder for now)
export const TRUST_ANCHOR_ADDRESS: Address = "0x5FbDB2315678afecb367f032d93F642f64180aa3" 

// 2. ABI - Instructions for JS on how to talk to the contract
export const TRUST_ANCHOR_ABI = [
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
  }
] as const