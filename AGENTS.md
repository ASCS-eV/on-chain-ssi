# AI Agent Instructions for On-Chain SSI

## Project Context
This is an On-Chain Self-Sovereign Identity (SSI) architecture project. It enables organizations to issue and verify decentralized digital identities anchored on the blockchain using the `did:ethr` standard and CRSet (Credential Revocation Set) management.
The repository is a **monorepo** containing smart contracts, frontend, and backend packages.

## Tech Stack & Global Rules
- **Node.js**: Strict requirement of `>= 22.12.0` (Do NOT use Node 20.x due to Hardhat 3 and Vite 7 constraints).
- **Package Manager**: `npm` (version `>= 10.0.0`). Do not use `yarn` or `pnpm`.
- **Language**: TypeScript is used everywhere (contracts and frontend).

## Package-Specific Guidelines

### 1. Smart Contracts (`packages/trust-anchor-did-ethr`)
- **Framework**: Hardhat 3 with Viem (`@nomicfoundation/hardhat-toolbox-viem`).
- **Solidity Version**: `0.8.28`.
- **Deployment**: We use **Hardhat Ignition** (`@nomicfoundation/hardhat-ignition`). Do not use the legacy `hardhat-deploy` plugins.
- **Testing**: Tests are written using Hardhat and Viem.
- **Commands**:
  - Compile: `npm run compile` (or `npx hardhat compile`)
  - Test: `npx hardhat test`
  - Local Node: `npx hardhat node`

### 2. Frontend (`packages/demo-app-frontend`)
- **Framework**: React 19 + Vite 7.
- **Blockchain Interaction**: `wagmi` (v3) + `viem` (v2).
- **Styling**: Tailwind CSS + Vanilla CSS (`index.css`). Use modern, clean aesthetics.
- **Linting/Formatting**: ESLint and Prettier are strictly enforced via Husky pre-commit hooks. Ensure code passes `npm run lint` before committing.
- **Commands**:
  - Dev server: `npm run dev`
  - Build: `npm run build`

## Workflows

### Git & Code Commits
- We use Husky pre-commit hooks to lint and format code automatically. Do not bypass them unless explicitly instructed.
- When generating Markdown documentation, ensure compliance with `markdownlint` (we ignore MD013 / line lengths by default).

### Implementation Steps (For AI Agents)
1. **Plan Mode**: Analyze the file structure, specifically checking the `package.json` in the respective sub-package before importing new libraries. Ask for clarification if unsure about the system architecture.
2. **Build Mode**: Write clean, modular TypeScript code. Document any new smart contract functions with NatSpec comments. 
3. **Verification**: Always double-check your output against the specific Vite or Hardhat versions we are using.
