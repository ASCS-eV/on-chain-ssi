# Registry Contracts

The `trust-anchor-did-ethr` package forms the on-chain foundation of the SSI ecosystem. It provides the smart contracts necessary for decentralized identity management, governance, and revocation.

## Overview and Purpose

The smart contracts are responsible for defining organizational identities, establishing a governing authority (Trust Anchor), and maintaining pointers to off-chain revocation data. There are three primary components:

1. **`EthereumDIDRegistry`**: The standard registry mapping Ethereum addresses to their Decentralized Identifiers (DIDs).
2. **`DIDMultisigController`**: A multisig governance contract that acts as the highest authority (Trust Anchor).
3. **`CompanyCRSetRegistry`**: A registry mapping company DIDs to their Credential Revocation Set (CRSet) IPFS CIDs.

## Technical Details

### 1. EthereumDIDRegistry

- **Methodology**: Implements the [`did:ethr`](https://github.com/decentralized-identity/ethr-did-resolver) method.
- **Features**: Allows changing identity owners, adding/revoking delegates, and setting attributes via direct calls or meta-transactions (signed payloads).

### 2. DIDMultisigController

- **Architecture**: An M-of-N multisig wallet designed to control identities.
- **Layers**:
  - **Speed Layer (Single Admin)**: A single owner can execute calls to external contracts (`execCall`), allowing fast administrative operations on sub-identities.
  - **Security Layer (Consensus)**: Requires quorum (M-of-N) or unanimous approval for critical system changes (e.g., changing the Trust Anchor's own identity, adding/removing multisig owners, or proposing proxy upgrades).
  
### 3. CompanyCRSetRegistry

- **Architecture**: Maps a company's DID to an IPFS Content Identifier (CID). The CID points to a Bloom Filter Cascade representing revoked credentials.
- **Governance**: Owned by the `DIDMultisigController` (Trust Anchor). Only the Trust Anchor can add or remove authorized company admins.
- **Usage**: Authorized company admins update their own CID (`updateRevocationCID()`) without interacting directly with raw DID documents.

## Usage Examples

### Deploying the Contracts

Deployment is handled via Hardhat Ignition (`ignition/modules/CompanyCRSet.ts`):

```bash
cd packages/trust-anchor-did-ethr
npx hardhat ignition deploy ignition/modules/CompanyCRSet.ts --network localhost
```

### Trust Anchor Adding a Company Admin

The `CompanyCRSetRegistry` relies on the Trust Anchor to whitelist company administrators:

```solidity
// Only the Trust Anchor (Multisig) can call this
function addCompanyAdmin(address companyDID, address admin) external onlyOwner {
    if (companyDID == address(0) || admin == address(0)) revert InvalidAddress();
    if (companyAdmins[companyDID][admin]) revert AdminAlreadyExists();

    companyAdmins[companyDID][admin] = true;
    emit CompanyAdminAdded(companyDID, admin, block.timestamp);
}
```

### Company Updating Revocation CID

Once authorized, a company admin updates the IPFS hash for their revoked credentials:

```solidity
// Called directly by the whitelisted company admin
function updateRevocationCID(address companyDID, string calldata newCID) external onlyCompanyAdmin(companyDID) {
    if (bytes(newCID).length == 0) revert EmptyCID();

    revocationCIDs[companyDID] = newCID;
    emit RevocationCIDUpdated(companyDID, newCID, msg.sender, block.timestamp);
}
```

### Creating a Multisig Proposal

To execute a sensitive action on the Trust Anchor identity itself, a proposal must be created and approved:

```javascript
// Create a proposal to add a new owner to the multisig
const txPropose = await multisigController.proposeAddOwner(newOwnerAddress);
const receipt = await txPropose.wait();
const proposalId = receipt.logs[0].args.id;

// Other owners must approve the proposal
const txApprove = await multisigController.connect(owner2).approve(proposalId);
```

## Ecosystem Specifications (EVES)

For the official design rationale, including our choice of `did:ethr`, the IPFS-based CRSet structure, and the gasless onboarding relay workflows, please refer to our drafted standard:
- **[EVES-008: ENVITED-X On-Chain Identity & Revocation Management](../../submodules/EVES/EVES/EVES-008/EVES-008.md)**
