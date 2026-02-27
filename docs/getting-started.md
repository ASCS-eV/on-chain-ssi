# Getting Started

Welcome to the **On-Chain Self-Sovereign Identity (SSI)** project.

This documentation serves as a comprehensive guide for developers and system administrators working with the On-Chain SSI infrastructure. Our ecosystem enables organizations to manage Decentralized Identifiers (DIDs), establish Trust Anchors, and handle Verifiable Credential issuance and verification anchored securely on the blockchain.

## Ecosystem Overview

The architecture aims to replace centralized identity silos with a decentralized, cryptographic approach that relies on Ethereum-based networks to anchor organizational identities and credential states.

Key capabilities of the system include:

1. **Decentralized Identifiers**: Utilizing the `did:ethr` standard to map blockchain addresses to standardized DID documents without requiring complex on-chain storage of the documents themselves.
2. **Multisig Governance (Trust Anchors)**: Root administrative privileges operate through an M-of-N smart contract, ensuring no single entity controls the ecosystem's trusted registry.
3. **Company Registration & Revocation**: Managing Credential Revocation Sets (CRSet) via pointing to deterministic IPFS CIDs stored directly within a registry smart contract.
4. **Verifiable Credentials**: Facilitating standard flows for issuing digital, cryptographic proofs of identity or affiliation, and verifying them.

## Repository Structure

The current ecosystem is structured as a monorepo containing multiple distinct packages:

| Directory | Purpose |
| :--- | :--- |
| `packages/trust-anchor-did-ethr` | The core smart contracts driving the DID registry and Trust Anchor logic. |
| `packages/demo-app-frontend` | A React-based application demonstrating the end-to-end flows for Trust Anchors and Companies. |
| `packages/issuer-service` | *(Pending)* Dedicated backend service for VC issuance operations. |
| `packages/verifier-service` | *(Pending)* Dedicated backend service for validating VPs and VCs. |
| `packages/demo-app-backend` | General backend API integration services. |

## Proceed to Next Steps

- If you are setting up the project for the first time, proceed to the [Build & Setup Instructions](build-instructions.md).
- If you wish to understand the underlying technical components, review the Features documentation linked in the sidebar.
