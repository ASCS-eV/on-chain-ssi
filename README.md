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

## Prerequisites

- **Node.js 22.12.0 or later** (Hardhat 3 requires ≥22.10.0; Vite 7 supports 20.19+ or 22.12+, we use 22.12+ for consistency)
- **npm 10.0.0 or later**
- **MetaMask** browser extension

**Check your versions:**
```bash
node --version  # Should be v22.12.0 or higher
npm --version   # Should be 10.0.0 or higher
```
**Using nvm to manage Node.js versions:**
```bash
nvm install 22
nvm use 22
```

## Quick Start

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
npx hardhat ignition deploy ignition/modules/CompanyCRSet.ts --network localhost
```

The output will show three deployed addresses (example output):
```
CompanyCRSetModule#EthereumDIDRegistry - 0xabcd...1234
CompanyCRSetModule#DIDMultisigController - 0xef01...5678  
CompanyCRSetModule#CompanyCRSetRegistry - 0x9abc...def0
```
**Copy YOUR addresses** from the terminal output for the next step.

**4. Configure Environment**

In `packages/demo-app-frontend`, create a `.env` file by copying `.env.example`:
```bash
cp .env.example .env
```

Then edit `.env` and replace the placeholders with **your actual deployed addresses** from step 3:
```env
VITE_TRUST_ANCHOR_ADDRESS=<your_DIDMultisigController_address>    # ← Use DIDMultisigController address
VITE_REGISTRY_ADDRESS=<your_EthereumDIDRegistry_address>           # ← Use EthereumDIDRegistry address  
VITE_CRSET_REGISTRY_ADDRESS=<your_CompanyCRSetRegistry_address>   # ← Use CompanyCRSetRegistry address
VITE_PINATA_JWT=your_pinata_jwt_token
```


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
