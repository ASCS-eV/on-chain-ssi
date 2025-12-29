import { type Address } from "viem";

const ENV_TRUST_ANCHOR_ADDRESS = import.meta.env.VITE_TRUST_ANCHOR_ADDRESS;
const ENV_REGISTRY_ADDRESS = import.meta.env.VITE_REGISTRY_ADDRESS;

if (!ENV_TRUST_ANCHOR_ADDRESS || !ENV_TRUST_ANCHOR_ADDRESS.startsWith("0x")) {
  console.error("CRITICAL: Trust Anchor Address not set in .env");
}
if (!ENV_REGISTRY_ADDRESS || !ENV_REGISTRY_ADDRESS.startsWith("0x")) {
  console.error("CRITICAL: Registry Address not set in .env");
}

export const TRUST_ANCHOR_ADDRESS: Address =
  (ENV_TRUST_ANCHOR_ADDRESS as Address) ||
  "0x0000000000000000000000000000000000000000";
export const REGISTRY_ADDRESS: Address =
  (ENV_REGISTRY_ADDRESS as Address) ||
  "0x0000000000000000000000000000000000000000";

export const TRUST_ANCHOR_ABI = [
  // --- EVENTS ---
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "id", type: "bytes32" },
      { indexed: false, internalType: "bytes", name: "data", type: "bytes" },
      {
        indexed: false,
        internalType: "bool",
        name: "requiresUnanimity",
        type: "bool",
      },
    ],
    name: "ProposalCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "id", type: "bytes32" },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "Approved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "id", type: "bytes32" },
    ],
    name: "Executed",
    type: "event",
  },

  // --- FUNCTIONS ---
  {
    inputs: [],
    name: "quorum",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "owners",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "id", type: "bytes32" }],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Governance Proposals
  {
    inputs: [
      { internalType: "address", name: "identity", type: "address" },
      { internalType: "address", name: "newOwner", type: "address" },
    ],
    name: "proposeChangeOwner",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "proposeAddOwner",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "proposeRemoveOwner",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "newQuorum", type: "uint256" }],
    name: "proposeQuorumUpdate",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- INTERNAL TARGET FUNCTIONS (Needed for Decoding) ---
  {
    inputs: [{ internalType: "uint256", name: "newQuorum", type: "uint256" }],
    name: "_setQuorum",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "_addOwner",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "_removeOwner",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "identity", type: "address" },
      { internalType: "address", name: "newOwner", type: "address" },
    ],
    name: "_executeChangeOwner",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const REGISTRY_ABI = [
  {
    inputs: [
      { internalType: "address", name: "identity", type: "address" },
      { internalType: "address", name: "newOwner", type: "address" },
    ],
    name: "changeOwner",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "identity", type: "address" }],
    name: "identityOwner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
