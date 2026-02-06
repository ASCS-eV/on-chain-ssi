# Etherlink SSI Governance Dashboard

The client-side application for the Etherlink SSI Governance Platform. This dashboard provides two distinct portals: one for the **Trust Anchor** (Governance & Administration) and one for **Companies** (Identity Onboarding & Revocation Management).

## 📋 Prerequisites

Before running the frontend, ensure the following requirements are met:

1. **Local Blockchain Node:** A Hardhat node must be running.
2. **Deployed Contracts:** The `CompanyCRSet` module must be deployed to the local network.
3. **Environment Variables:** Create a `.env` file in this directory with your contract addresses and Pinata keys.

```bash
cp .env.example .env

```

**Required Variables:**

```env

VITE_TRUST_ANCHOR_ADDRESS=0x...
VITE_REGISTRY_ADDRESS=0x...
VITE_CRSET_REGISTRY_ADDRESS=0x...
VITE_PINATA_JWT=your_pinata_jwt_token

```

---

## 🐳 Docker Setup (Recommended)

You can containerize this application using the included Dockerfile (Nginx + Alpine).

### 1. Build the Image

_Note: The build process bakes the `.env` variables into the static files. Ensure your `.env` file is correct before building._

```bash
docker build -t ssi-frontend .

```

### 2. Run the Container

Map port 80 of the container to port 8080 on your host.

```bash
docker run -d -p 8080:80 --name ssi-app ssi-frontend

```

Access the application at: **[http://localhost:8080](https://www.google.com/search?q=http://localhost:8080)**

---

## 💻 Local Development

To run the application in development mode with Hot Module Replacement (HMR):

```bash
# Install dependencies
npm install

# Start Dev Server
npm run dev

```

---

## 📖 Usage Guide

The application supports two distinct user roles. Use MetaMask to switch between wallets to simulate these roles.

### 🏛️ Role 1: Trust Anchor (Administrator)

_Use the wallet address that deployed the contracts (Account #0)._

1. **Dashboard Overview:**

- Navigate to `/trust-anchor`.
- View real-time governance stats, quorum thresholds, and active proposals.

2. **Registering Companies:**

- Go to **Companies**.
- Search for a company's DID address (Wallet Address).
- If the company is "Not Managed", wait for them to delegate control.
- If they have delegated (Yellow status), scroll down to **"CRSet Admins"**.
- Paste the company's address and click **Add**. This completes the registration immediately (no proposal required).

3. **Governance:**

- Go to **Governance**.
- Propose adding/removing admins or updating the multi-sig quorum threshold.

### 🏢 Role 2: Company (User)

_Use any other wallet address (Account #1, #2, etc.)._

1. **Onboarding:**

- Navigate to `/company/onboarding`.
- **Step 1 (Delegate):** Sign the transaction to transfer identity ownership to the Trust Anchor.
- **Step 2 (Verification):** Wait for the Trust Anchor to approve your registration and add you as a CRSet Admin.
- **Step 3 (Complete):** Once verified, the dashboard will unlock.

2. **Revocation Management:**

- Navigate to `/company/revocations`.
- **Upload:** Drag & Drop a W3C-compliant JSON revocation list.
- **Publish:** The app uploads the file to IPFS (via Pinata) and updates the smart contract with the new CID.

---

## 🛠 Tech Stack

- **Framework:** React + Vite
- **Language:** TypeScript
- **Web3 Integration:** Wagmi v2, Viem, TanStack Query
- **Styling:** Tailwind CSS, Lucide Icons
- **Deployment:** Docker, Nginx
