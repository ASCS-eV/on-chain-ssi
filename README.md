# on-chain-ssi

## About

On-Chain Self-Sovereign Identity (SSI) architecture migrating CRSet from Ethereum Blobs to Tezos Etherlink. This project enables organizations to issue and verify decentralized digital identities anchored on blockchain, providing cryptographic proof of identity without relying on centralized authorities.

The system implements a complete decentralized identity infrastructure with DID registry smart contracts, verifiable credential issuance and verification services, and trust anchor management with multisig governance.

## Key Features

- **Decentralized Identity (DID)**: Blockchain-anchored identities using did:ethr standard
- **Trust Anchor Management**: Multisig governance for institutional identity controllers
- **Company Registry**: CRSet (Credential Registry Set) management for organizational credentials
- **Verifiable Credentials**: Complete VC issuance and verification pipeline
- **MetaMask Integration**: Simple wallet connectivity for identity operations

## Resources

- [Miro Board](https://miro.com/app/board/willBeFilledIfOkayToShare)
- [Build Instructions](BUILD.md) - Detailed setup, testing, and deployment guide

## Project Structure

This is a monorepo containing multiple packages:

```
packages/
├── trust-anchor-did-ethr/    # Smart contracts for DID management (Hardhat)
├── did-registry/              # DID registry contracts
├── demo-app-frontend/         # React + Vite demo application
├── demo-app-backend/          # Backend API services
├── issuer-service/            # VC issuance service
├── verifier-service/          # VC verification service
└── vc-auth/                   # VC authentication utilities
```

### Smart Contracts

The `trust-anchor-did-ethr` package includes three main smart contracts:

- **EthereumDIDRegistry**: Standard did:ethr identity registry
- **DIDMultisigController**: Multisig governance for trust anchor identities  
- **CompanyCRSetRegistry**: Company registry with CRSet management

## Quick Start

**Prerequisites:** Node.js >= 18.20.2, MetaMask browser extension

Get the demo application running:

**1. Install Dependencies**
```bash
cd packages/trust-anchor-did-ethr && npm install
cd packages/demo-app-frontend && npm install
```

**2. Start Hardhat Node** (in a dedicated terminal, leave running)
```bash
cd packages/trust-anchor-did-ethr
npx hardhat node
```

**3. Deploy Contracts** (in a new terminal)
```bash
cd packages/trust-anchor-did-ethr
npx hardhat ignition deploy ignition/modules/TrustAnchor.ts --network localhost
npx hardhat ignition deploy ignition/modules/CompanyCRSet.ts --network localhost
```

**4. Configure Environment**

In `packages/demo-app-frontend`, copy `.env.example` to `.env` and add the deployed contract addresses from step 3.

**5. Import Hardhat Account to MetaMask**

Add Hardhat Local network to MetaMask (RPC: `http://127.0.0.1:8545`, Chain ID: `31337`), then import first 5 (recommended, first three accounts are predefined as trust anchor admins) of the test accounts displayed when you started the Hardhat node in step 2.

**6. Run Frontend**
```bash
cd packages/demo-app-frontend
npm run dev
```

Open http://localhost:5173/ in your browser.

## Documentation

- **[BUILD.md](BUILD.md)** - Comprehensive build instructions, testing, troubleshooting, and deployment guides
- **[Smart Contracts](packages/trust-anchor-did-ethr/README.md)** - Detailed smart contract documentation
- **[Demo Application](packages/demo-app-frontend/README.md)** - Frontend application guide

## License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.
