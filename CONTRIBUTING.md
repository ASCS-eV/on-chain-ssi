# Contributing to On-Chain SSI

Thank you for considering contributing to On-Chain SSI!

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs
This section guides you through submitting a bug report.
- **Ensure the bug was not already reported** by searching on GitHub under Issues.
- If you're unable to find an open issue addressing the problem, open a new one. Be sure to include a title and a clear description, as much relevant information as possible, and a code sample or an executable test case demonstrating the expected behavior that is not occurring.

### Suggesting Enhancements
- Open a new issue with the label `enhancement`.
- Provide a clear and detailed explanation of the feature you want and why it's important.

### Pull Requests
1. **Fork the repo** and create your branch from `main`.
2. **Install dependencies** using `npm install` (we use NPM >= 10.0.0 and Node.js >= 22.12.0).
3. **Make your changes**. If you've added code that should be tested, add tests.
4. **Ensure the test suite passes**: Run `npx hardhat test` for contracts or `npm run lint` for frontend changes.
5. **Issue that pull request!**

## Development Guidelines

### 1. Smart Contracts
- Located in `packages/trust-anchor-did-ethr`.
- We use Hardhat Ignition for deployments and Viem for testing.
- Write Solidity 0.8.28 and include NatSpec comments.

### 2. Frontend
- Located in `packages/demo-app-frontend`.
- Stack: React 19, Vite 7, Wagmi 3, and Viem 2.
- Adhere to the ESLint and Prettier rules enforced via our Husky pre-commit hooks.

### 3. Documentation
- Our documentation is hosted on GitBook.
- All documentation Markdown files are in the `docs/` folder. Use GitBook-flavored Markdown.

## Any Questions?
Feel free to open an issue with the label `question` and we will get back to you!
