# Verifier Service

> [!NOTE]
> The `verifier-service` is currently a placeholder package within the `on-chain-ssi` monorepo. The verification logic is part of the future implementation roadmap.

## Overview and Purpose

The Verifier Service's role is to receive Verifiable Presentations (VPs) or Verifiable Credentials (VCs) from users (Holders) and cryptographically verify their authenticity, integrity, and validity against the on-chain registry.

Currently, validation of identity statuses (like checking if an address is an authorized company admin) is performed directly by the smart contracts and the frontend application.

## Technical Details

The `packages/verifier-service/` directory holds placeholder files. The completed service is designed to handle:

- **DID Resolution**: Resolving `did:ethr` documents from the `EthereumDIDRegistry`.
- **Revocation Checking**: Checking the `CompanyCRSetRegistry` for a company's current Credential Revocation Set (CRSet) via IPFS/Bloom Filters to ensure credentials haven't been revoked.
- **Signature Verification**: Verifying the issuer's cryptographic signature on the VC/VP.

## Usage Examples

> Note: These are illustrative examples based on the system's architecture. The verifiable logic shown here represents the planned flow.

### Checking Revocation Status (Current On-Chain Flow)

The verification process relies on the `CompanyCRSetRegistry` to find the latest revocation list (CRSet) for an issuer:

```solidity
// CompanyCRSetRegistry.sol
// Verifiers call this to get the IPFS CID of the company's revocation set
function getRevocationCID(address companyDID) external view returns (string memory) {
    return revocationCIDs[companyDID];
}
```

### Planned API Endpoint (Illustrative)

```http
POST /api/v1/verify
Content-Type: application/json

{
  "verifiablePresentation": "eyJhbGciOiJFUzI1Nksi...[VP Token]..."
}
```

### Verifying an Identity (Frontend/Smart Contract Context)

To verify if an address is authorized to manage a company's identity before accepting their credentials:

```javascript
// Call to CompanyCRSetRegistry
const isAuthorized = await crsetRegistry.isCompanyAdmin(companyDid, userAddress);

if (!isAuthorized) {
  throw new Error("This user is not an authorized administrator for the company.");
}
```
