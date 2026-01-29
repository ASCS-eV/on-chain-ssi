# Build Instructions

## Table of Contents

- [Prerequisites](#prerequisites)
- [Package Versions](#package-versions)
- [Installation](#installation)
- [Running the Project](#running-the-project)
- [Testing](#testing)
- [TypeScript Configuration](#typescript-configuration)
- [Platform-Specific Notes](#platform-specific-notes)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
## Prerequisites

Before building and running the project, ensure you have the following installed:

### Required Software

- **Node.js**: >= 18.20.2 [Installation instructions](https://github.com/nvm-sh/nvm)
- **Docker** (Optional): For containerized deployment. [Download](https://www.docker.com/get-started)
- **MetaMask**: Browser extension for Ethereum wallet management. [Download](https://metamask.io/)

## Package Versions

This project uses the following key dependencies:

### Smart Contracts (trust-anchor-did-ethr)

```json
{
  "hardhat": "^3.1.0",
  "typescript": "~5.8.0",
  "@nomicfoundation/hardhat-ignition": "^3.0.6",
  "@nomicfoundation/hardhat-toolbox-viem": "^5.0.1",
  "viem": "^2.43.2"
}
```

### Frontend (demo-app-frontend)

```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "typescript": "~5.9.3",
  "vite": "^7.2.4",
  "wagmi": "^3.1.0",
  "viem": "^2.43.3"
}
```

**Note**: The project uses TypeScript 5.8.x for smart contracts and 5.9.x for frontend. This is intentional and should not cause conflicts as packages are isolated.

## Installation

### Install Dependencies for Each Package

#### 1. Smart Contracts (trust-anchor-did-ethr)

```bash
cd packages/trust-anchor-did-ethr
npm install
cd ../..
```

#### 2. Frontend Application (demo-app-frontend)

```bash
cd packages/demo-app-frontend
npm install
cd ../..
```

## Running the Project

### Step 1: Start Local Hardhat Network

In a dedicated terminal (leave running):

```bash
cd packages/trust-anchor-did-ethr
npx hardhat node
```
### Step 2: Deploy Smart Contracts

In a new terminal:

```bash
cd packages/trust-anchor-did-ethr

# Deploy using Hardhat Ignition
npx hardhat ignition deploy ignition/modules/TrustAnchor.ts --network localhost
npx hardhat ignition deploy ignition/modules/CompanyCRSet.ts --network localhost
```
**Copy these addresses** for the next step.

### Step 3: Configure Frontend Environment

In `packages/demo-app-frontend`, create a `.env` file from `.env.example` and edit it to add your deployed contract addresses:

```env
VITE_TRUST_ANCHOR_ADDRESS=0x...    # DIDMultisigController address from deployment
VITE_REGISTRY_ADDRESS=0x...        # EthereumDIDRegistry address
VITE_CRSET_REGISTRY_ADDRESS=0x...  # CompanyCRSetRegistry address
VITE_PINATA_JWT=your_pinata_jwt_token

# Local Hardhat RPC
VITE_HARDHAT_RPC_URL=http://127.0.0.1:8545
```

**Optional**: If you don't have a Pinata account, you can leave `VITE_PINATA_JWT` empty for local testing (some IPFS features may not work).

### Step 4: Import Hardhat Accounts to MetaMask

To interact with the smart contracts through the frontend, you need to import Hardhat test accounts into MetaMask. We recommend importing the first 5 accounts (displayed when hardhat node is started).

**Import to MetaMask:**

1. Open MetaMask extension
2. Click on account icon → **Import Account**
3. Select **Private Key**
4. Paste the Hardhat account private key and click **Import**

**Add Local Hardhat Network to MetaMask:**

1. Open MetaMask → Networks dropdown → **Add Network**
2. Click **Add a network manually** and save:
   - **Network Name**: Hardhat Local
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: ETH
3. Switch to "Hardhat Local" network

### Step 5: Run Frontend Development Server

```bash
cd packages/demo-app-frontend
npm run dev
```

**Open your browser** and navigate to [http://localhost:5173/](http://localhost:5173/)

## Testing

```bash
cd packages/trust-anchor-did-ethr
npx hardhat test
```

### Lint Code

```bash
cd packages/demo-app-frontend
npm run lint
```

## TypeScript Configuration

### Smart Contracts (trust-anchor-did-ethr)

The TypeScript configuration for smart contracts uses:

- **Target**: ES2022
- **Module**: Node16 (ESM)
- **Strict mode**: Enabled
- **Output directory**: `dist/`

Configuration file: `packages/trust-anchor-did-ethr/tsconfig.json`

### Frontend (demo-app-frontend)

The frontend uses multiple TypeScript configurations:

- `tsconfig.json` - Base configuration
- `tsconfig.app.json` - Application code
- `tsconfig.node.json` - Vite configuration files

**Key settings**:
- **Target**: ES2022
- **Module**: ESNext
- **JSX**: React JSX transform
- **Strict mode**: Enabled

## Platform-Specific Notes

### Windows

If you encounter PowerShell "execution policy" errors:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## Deployment

### Build Commands

#### Compile Smart Contracts

```bash
cd packages/trust-anchor-did-ethr
npx hardhat compile
```

**Note:** Compilation happens automatically during deployment, but you can run this explicitly to check for contract errors.

#### Build Frontend for Production

```bash
cd packages/demo-app-frontend
npm run build
```

This creates an optimized production build in the `dist/` directory, required for Docker deployment and production hosting.

### Docker Deployment (Frontend)

The frontend application can be containerized for production deployment:

```bash
cd packages/demo-app-frontend

# Build Docker image
docker build -t ssi-frontend .

# Run container
docker run -d -p 8080:80 --name ssi-app ssi-frontend
```

**Access**: [http://localhost:8080](http://localhost:8080)

**Important**: Environment variables are baked into the build. Ensure your `.env` file is correct before building the Docker image.

### Deploying to Sepolia Testnet

```bash
cd packages/trust-anchor-did-ethr

# Set private key using keystore
npx hardhat keystore set SEPOLIA_PRIVATE_KEY

# Deploy to Sepolia
npx hardhat ignition deploy --network sepolia ignition/modules/TrustAnchor.ts
npx hardhat ignition deploy --network sepolia ignition/modules/CompanyCRSet.ts
```

**Note**: You'll need Sepolia ETH for deployment. Get testnet ETH from a faucet.

## Troubleshooting

### Common Issues

#### "Module not found" errors

Ensure you've installed dependencies in the correct package:
```bash
cd packages/FRONTEND_OR_CONTRACT_PACKAGE
npm install
```

#### Hardhat node not accessible

1. Check if port 8545 is already in use
2. Ensure Hardhat node is running in a separate terminal
3. Verify `VITE_HARDHAT_RPC_URL=http://127.0.0.1:8545` in `.env`

#### Contract deployment fails

1. Ensure Hardhat node is running
2. Check you have test accounts with ETH (Hardhat provides default accounts)
3. Verify network configuration in `hardhat.config.ts`

#### Frontend build fails with TypeScript errors

```bash
cd packages/demo-app-frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Port 5173 already in use

Kill the process or specify a different port:
```bash
npm run dev -- --port 3000
```

#### "Cannot find module '@nomicfoundation/hardhat-toolbox-viem'"

Reinstall Hardhat dependencies:
```bash
cd packages/trust-anchor-did-ethr
npm install
```

#### Transaction fails with "nonce too high" or "invalid nonce" after restarting Hardhat

**Cause**: Each time you restart `npx hardhat node`, the blockchain state resets to block 0. However, MetaMask caches the transaction nonce count, causing a mismatch.

**Solution**: Reset your MetaMask account activity:
1. Open MetaMask
2. Go to **Settings** → **Advanced**
3. Click **Clear activity tab data**
4. Refresh your browser and try the transaction again
