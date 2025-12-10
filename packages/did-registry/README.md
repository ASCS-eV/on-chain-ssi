# ERC-1056 compliant DID Registry

## Overview

This package implements a draft smart contract that manages decentralized identities on EVM compatible blockchains. Also initialized as a Hardhat project. Each Ethereum address gets an associated DID in the format `did:ethr:<address>`.

## Smart Contract

### DIDRegistry.sol

The core contract provides:

- **Identity Ownership**: Transfer control of an identity to another address
- **Delegation**: Grant delegation for specific purposes, for a set amount of time
- **Attributes**: Store and manage identity metadata like public keys, service endpoints, etc. These can be detailed based on our needs
- **Event-based Resolution**: All changes emit events for off-chain DID document construction. This approach could also be changed

### Key Functions

- `changeOwner()` - Transfer identity ownership
- `addDelegate()` / `revokeDelegate()` - Manage delegated permissions
- `setAttribute()` / `revokeAttribute()` - Store identity metadata
- `validDelegate()` - Check if delegation is active
- `getAttribute()` - Retrieve identity attributes

## Use Case: CRSet Integration

For the CRSet project, this registry has the potential to do the following:

1. Store issuer DID documents on-chain
2. Link IPFS CIDs of revocation Bloom filters to issuer identities via `setAttribute()` ; this is conceptual, currently no IPFS logic is present in this specific directory
3. Allow verifiers to resolve issuer DIDs and retrieve current revocation data
4. Support key rotation and delegate management for issuers

## Getting Started

### Installation

```bash
npm install
```

### Compile Contracts

```bash
npm run compile
```

### Deploy

No deployment script currently. The purpose of this work in its current stage is to demonstrate a ERC-1056 / did:ethr compliant contract, and setting up the development environment.

### Next Steps

- Finalize DID method choice, did:ethr looks like the strongest candidate, compare it to alternatives

- Create deployment scripts for testnet and production

- Preparing test suite

- Building DID resolver utilities

- Integrate with CRSet issuer service

