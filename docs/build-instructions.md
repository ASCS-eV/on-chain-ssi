# Build & Setup Instructions

## Prerequisites

Before starting, ensure you have the following installed on your system:

- **Node.js**: ≥ 22.12.0 (Required for Hardhat 3 and Vite 7)
- **NPM**: ≥ 10.0.0
- **MetaMask**: Browser extension for managing Ethereum accounts

> [!WARNING]
> Do not use Node.js 20.x, as it will cause Hardhat runtime errors. Use a version manager like `nvm` to ensure you are on `22.12.0` or higher:
>
> ```bash
> nvm install 22
> nvm use 22
> ```

## 1. Installation

Start by cloning the repository and installing both the root and package-specific dependencies.

```bash
# Install root dependencies (including Husky pre-commit hooks)
npm install

# Install smart contract dependencies
cd packages/trust-anchor-did-ethr
npm install

# Install frontend dependencies
cd ../demo-app-frontend
npm install

# Return to root directory
cd ../..
```

## 2. Compile and Run the Blockchain (Hardhat)

You'll need a local Ethereum network to deploy the registry contracts. Ensure you run this in a **dedicated terminal** and leave it open.

```bash
cd packages/trust-anchor-did-ethr

# Start Hardhat local node
npx hardhat node
```

Once running, Hardhat will output a list of test accounts and private keys. Keep this window open.

## 3. Deploy Smart Contracts

Open a **new terminal** and deploy the initial Trust Anchor and Registry contracts to the local network:

```bash
cd packages/trust-anchor-did-ethr

# Deploy the modules using Hardhat Ignition
npx hardhat ignition deploy ignition/modules/CompanyCRSet.ts --network localhost
```

**Important**: The deployment process will output the contract addresses. **Copy these addresses**, as you will need them for the frontend configuration.

Example output:

```text
CompanyCRSetModule#EthereumDIDRegistry - 0xabcd...1234
CompanyCRSetModule#DIDMultisigController - 0xef01...5678
CompanyCRSetModule#CompanyCRSetRegistry - 0x9abc...def0
```

## 4. Frontend Configuration

Navigate to the frontend package and configure the environment variables:

```bash
cd packages/demo-app-frontend

# Copy the example environment file
cp .env.example .env
```

Open the `.env` file and replace the placeholder addresses with the addresses you received from the contract deployment step:

| Variable | Description | Value from Deployment |
| :--- | :--- | :--- |
| `VITE_TRUST_ANCHOR_ADDRESS` | Address of the Trust Anchor multisig | `CompanyCRSetModule#DIDMultisigController` |
| `VITE_REGISTRY_ADDRESS` | Address of the baseline DID registry | `CompanyCRSetModule#EthereumDIDRegistry` |
| `VITE_CRSET_REGISTRY_ADDRESS` | Address of the revocation registry | `CompanyCRSetModule#CompanyCRSetRegistry` |
| `VITE_PINATA_JWT` | JWT for Pinata IPFS access (Optional for local testing) | *Your Pinata Token* |
| `VITE_HARDHAT_RPC_URL` | Local RPC endpoint | `http://127.0.0.1:8545` |

## 5. Configure MetaMask

To interact with the local development environment:

1. Add a **Custom Network** to MetaMask:
   - **Network Name**: Hardhat Local
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`
2. **Import Accounts**: Import the first few (1-5) private keys provided by the Hardhat node terminal into MetaMask to act as the Trust Anchor admins.

## 6. Run the Application

Start the local Vite development server for the frontend application:

```bash
cd packages/demo-app-frontend
npm run dev
```

The application will be accessible at [http://localhost:5173/](http://localhost:5173/).

## Additional Commands

### Testing Contracts

```bash
cd packages/trust-anchor-did-ethr
npx hardhat test
```

### Production Build (Frontend)

```bash
cd packages/demo-app-frontend
npm run build
```

This generates the optimized `dist/` artifacts required if you intend to serve the application via Docker or static hosting.
