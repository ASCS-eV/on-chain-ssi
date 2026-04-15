# Issuer Service

> [!NOTE]
> The `issuer-service` is currently a placeholder package within the `on-chain-ssi` monorepo. The core verifiable credential issuance logic is expected to be implemented here in the future.

## Overview and Purpose

The Issuer Service is responsible for generating and signing Verifiable Credentials (VCs) for users or organizations within the On-Chain SSI ecosystem. It acts as the authority that attests to specific claims about a subject.

While the dedicated backend service is pending implementation, some issuance flows (such as registering companies and adding test credentials) are currently demonstrated via the `demo-app-frontend`, which interacts directly with the smart contracts using the test accounts.

## Technical Details

Currently, the `packages/issuer-service/` directory contains placeholder files. Once implemented, this service is expected to:

- **DID Method**: Utilize `did:ethr` for resolving and anchoring identities.
- **Credential Format**: Issue W3C standard Verifiable Credentials (typically JWT or JSON-LD format).
- **Architecture**: Likely a Node.js/TypeScript backend service or an Express/NestJS API that holds the private key of the issuer.

## Usage Examples

> Note: These are illustrative examples based on the planned architecture. Actual implementation may vary once the service is fully developed in the repository.

### Planned API Endpoint (Illustrative)

```http
POST /api/v1/issue-credential
Content-Type: application/json

{
  "subjectDid": "did:ethr:sepolia:0x1234567890abcdef1234567890abcdef12345678",
  "claims": {
    "organizationName": "Acme Corp",
    "role": "Verified Partner"
  }
}
```

### Current Frontend Issuance (Workaround)

In the current demo, the Trust Anchor (using a Hardhat test account) directly registers a company on-chain, effectively "issuing" them the right to act within the ecosystem:

```javascript
// Example from frontend hooks (useTrustAnchor.ts context)
const addCompanyAdmin = async (companyDID, adminAddress) => {
  // Trust Anchor multisig executes transaction to authorize a company admin
  const tx = await registryContract.addCompanyAdmin(companyDID, adminAddress);
  await tx.wait();
};
```
