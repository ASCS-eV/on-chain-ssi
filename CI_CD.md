# CI/CD Pipeline Documentation

This document describes the CI/CD pipeline for the On-Chain SSI project.


## Pipeline Structure

The pipeline consists of three sequential stages:

```
Lint -> Test -> Build
```

Each stage must pass before the next stage runs. If any stage fails, the pipeline stops.

### Workflow File

Location: `.github/workflows/ci.yml`

Triggers:
- On pull requests to `main` branch
- On pushes to `main` branch

## Pipeline Stages

### 1. Lint Stage

**Purpose:** Validate code style and formatting

**Checks:**
- **ESLint** - TypeScript/React code quality (frontend)
- **Prettier** - Code formatting consistency (frontend)
- **Solhint** - Solidity contract linting (contracts)

**Configuration Files:**
- `packages/demo-app-frontend/eslint.config.js` - ESLint rules
- `packages/demo-app-frontend/.prettierrc` - Prettier formatting rules
- `packages/trust-anchor-did-ethr/.solhint.json` - Solhint rules (relaxed for practicality, it is work in progress to make them stricter)

**Exit Criteria:** All linters pass with 0 errors

### 2. Test Stage

**Purpose:** Verify contract functionality

**Requires:** Lint stage must pass

**Tests:**
- Hardhat test suite (36 tests)
- Unit tests for all smart contracts
- Integration tests for DID workflows

**Exit Criteria:** All tests pass

### 3. Build Stage

**Purpose:** Verify project can be compiled and built

**Requires:** Test stage must pass

**Builds:**
- Smart contract compilation (`npx hardhat compile`)
- Frontend production build (`npm run build`)

**Exit Criteria:** Both contracts and frontend build successfully

## Running Pipeline Stages Locally

### Lint

```bash
# Frontend
cd packages/demo-app-frontend
npm run lint
npx prettier --check .

# Contracts
cd packages/trust-anchor-did-ethr
npx solhint 'contracts/**/*.sol'
```

### Test

```bash
cd packages/trust-anchor-did-ethr
npx hardhat test
```

### Build

```bash
# Contracts
cd packages/trust-anchor-did-ethr
npx hardhat compile

# Frontend
cd packages/demo-app-frontend
npm run build
```

## Pre-commit Hooks

The project uses [Husky](https://typicode.github.io/husky/) to enforce code quality before commits.

**What runs on commit:**
1. ESLint checks staged TypeScript files
2. Prettier formats staged files
3. Changes are auto-fixed and staged again if possible
4. Commit is blocked if unfixable errors exist

**Configuration:**
- `.husky/pre-commit` - Hook script
- `packages/demo-app-frontend/package.json` → `lint-staged` section

**Bypass (emergency only):**
```bash
git commit --no-verify
```

## Expected Outputs

### Successful Pipeline

All three jobs show green checkmarks:
- Lint: All linters pass
- Test: All 36 tests pass
- Build: Contracts compile, frontend builds

### Failed Pipeline

Pipeline stops at the first failure:
- Lint fails: Test and Build stages do not run
- Test fails: Build stage does not run
- Build fails: PR cannot be merged

## Troubleshooting

### Linting Errors

**ESLint fails:**
```bash
cd packages/demo-app-frontend
npm run lint
# Fix errors shown, or autofix:
npx eslint . --fix
```

**Prettier fails:**
```bash
cd packages/demo-app-frontend
npx prettier --check .  # See what needs formatting
npm run format          # Autoformat all files
```

**Solhint fails:**
```bash
cd packages/trust-anchor-did-ethr
npx solhint 'contracts/**/*.sol'
# Check .solhint.json if rules are too strict, probably not because they are relaxed currently. Can be checked with stricter rules
```

### Test Failures

```bash
cd packages/trust-anchor-did-ethr
npx hardhat test
# Review error output
# Fix contracts or test files
```

### Build Failures

**Contract compilation fails:**
```bash
cd packages/trust-anchor-did-ethr
npx hardhat compile
# Check Solidity syntax errors
```

**Frontend build fails:**
```bash
cd packages/demo-app-frontend
npm run build
# Usually TypeScript errors, so check terminal output
```

### CI Runs on Old Code

**Issue:** CI fails on merged code

**Cause:** Dependencies changed or Node.js version mismatch

**Solution:**
```bash
# Update dependencies
npm install
# Ensure Node.js 22.12.0+
node --version
```

## Future Enhancements

**Note:** The following features are planned but not yet implemented.

### Deployment Validation

- Automated testnet deployments
- Contract verification on Etherscan/block explorers
- Deployment tests

### Test Environments

- Ethereum Sepolia testnet integration
- Secure secrets management using GitHub Secrets
- RPC endpoint configuration


## Contributing

When contributing, ensure:
1. All pre-commit hooks pass
2. Run tests locally before pushing: `npm test`
3. Check CI status after pushing
4. Fix any CI failures before requesting review

## Support

For pipeline issues, check this document for troubleshooting steps, review GitHub Actions logs, and run commands locally to reproduce issues.


---
