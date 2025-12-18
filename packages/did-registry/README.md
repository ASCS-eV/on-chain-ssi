# ERC - 1056 compliant DID Registry

This package is a custom ERC-1056 based DID registry implementation with enhanced permission controls for company identity management. This work extends did:ethr, it is compliant with ERC-1056, and could be switched out for official did:ethr with some comprimise, or additional layers could be added for workarounds if we come up with them. (especially for the permission controls, more in the next chapters)

## Architecture Overview

This package focuses on Company identities. It implements three core contracts:

### 1. **DIDRegistry.sol** - Core Identity Registry
The foundational contract is **ERC-1056 compliant** and extends the did:ethr implementation pattern with a key enhancement: **serviceAdmin delegates**.

**Features:**
- ERC-1056 compliant with all required events and functions
- Identity ownership and delegation
- Attribute management with custom permission model
- `serviceAdmin` delegate type: Can update `serviceEndpoint` attributes only (enhancement over official did:ethr)
- Standard delegates (veriKey): Can sign/authenticate on behalf of identity, but cannot modify attributes

**Delegation Model:**
This (two) tiered delegation system enables detailed access control rights while maintaining ERC-1056 compliance. Note that this requires modifications to the standard did:ethr implementation. Possible configurations include:

1) **Company + Admin + Service model** (current implementation): Standard delegates (admins) for identity management, serviceAdmin delegates for service endpoint updates
2) **Simplified service-only model**: Only serviceAdmin delegates exist; no standard delegates needed
3) **Extended permission tiers**: Additional delegate types for different control levels (for example, `attributeAdmin`, `keyRotationAdmin`)

**Why Custom Implementation?**
The official `did:ethr` registry (EthrDIDRegistry) restricts `setAttribute()` to identity owners only. This implementation allows specified permissions,service admins can update service endpoints without full identity control.

From our gap analysis:
> "only DID controller (=owner) can edit service section of did:ethr"

**Possible solution:** `serviceAdmin` delegates can update service attributes while owners retain full control over identity and other attributes. In this model, trustAnchors are the owners of company DIDs. Companies transfer ownership to the TA during registration to join the trusted ecosystem.

### 2. **CompanyRegistry.sol** - Metadata and Queryability Layer
Provides optimized read access to company information and admin lists.

**Why Separate Contract?**
- `DIDRegistry` stores delegates in a mapping so no way to retrieve a list of admins on-chain
- Parsing events for every query is inefficient
- `CompanyRegistry` maintains arrays for queryability: `getAdmins(companyDID)` returns all admins instantly

**Key Functions:**
- `createCompany()` - Registers company metadata, validates trust anchor ownership
- `addAdmin()` - Bookkeeping only (actual delegate is added in DIDRegistry)
- `getAdmins()` - Returns array of admin addresses for a company DID

### 3. **MockTrustAnchor.sol** - Governance Wrapper
Handles the operations across DIDRegistry and CompanyRegistry with ownership verification.

**Current Status:** Simplified implementation suitable for sinlge owner control. 

**When It Becomes Useful:**
- Multisig governance 
- approval workflows
- Centralized oversight requirements

**Key Functions:**
- `registerCompany()` - Creates company in both registries atomically
- `addCompanyAdmin()` - Adds delegate in DIDRegistry + bookkeeping in CompanyRegistry
- `grantServiceAdmin()` - Adds `serviceAdmin` delegate for service endpoint management

- basically a wrapper of the other two contracts; logic + bookkeeping

## Permission Model

```
┌─────────────────────────────────────────────────────────────┐
│  Trust Anchor (Governance Layer)                             │
│  - Registers companies                                       │
│  - Grants initial admin access                              │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Company DID (Identity)                                      │
│  Owner: Trust Anchor                                         │
│  Attributes: { name, did, domain, ... }                     │
└─────────────────────────────────────────────────────────────┘
        │                                │
        │ admin delegate                 │ serviceAdmin delegate
        ▼                                ▼
┌──────────────────┐          ┌──────────────────────────────┐
│  Company Admin   │          │  Service Admin               │
│  - Read identity │          │  - Read identity             │
│  - Cannot edit   │          │  - Update serviceEndpoint    │
│    attributes    │          │  - Cannot edit other attrs   │
└──────────────────┘          └──────────────────────────────┘

- admin / serviceAdmin distinction is optional
```

## Real World Flow

**Scenario:** Trust anchor registers a company and grants service management access.

```solidity
// 1. Trust Anchor registers company
mockTrustAnchor.registerCompany(
    companyDID,          // company wallet address
    "CoreBlockchain Corp",
    "cbc.com"
);
// the company is now created in both registries, and trustAnchor is owner

// NOTE: steps 2 and 3 can be merged, when there is no distinction needed between normal admin and serviceAdin (serviceAdmin becomes the default/only admin type in that case)

// 2. Grant admin access (read only delegate)
mockTrustAnchor.addCompanyAdmin(
    companyDID,
    adminAddress,        // company admins wallet
    365 days             // could be set to max int for infinity 
);
// Admin can now view but not modify identity

// 3. Grant service management access
mockTrustAnchor.grantServiceAdmin(
    companyDID,
    serviceAdminAddress, // service operator wallet / company admins wallet
    365 days
);
// admin became serviceAdmin and can update service endpoints

// 4. Service admin updates endpoint
didRegistry.setAttribute(
    companyDID,
    "serviceEndpoint",
    "https://api.something/vc",
    365 days
);
// Service endpoint update allowed because caller is serviceAdmin

// 5. Service admin tries to update name (FAILS)
didRegistry.setAttribute(
    companyDID,
    "companyName",
    "Evil Corp",
    365 days
);
// this transaction reverts because serviceAdmin can only update serviceEndpoint
```

## Getting Started

```powershell
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests (tests covering different scenarios)
npx hardhat test

# Deploy to local network (deployment not tested yet!)
npx hardhat node                           # Terminal 1
npx hardhat run scripts/deploy.ts --network localhost  # Terminal 2
```

## Key Differences: Custom vs Official did:ethr

| Feature | Custom DIDRegistry | Official EthrDIDRegistry |
|---------|-------------------|-------------------------|
| **setAttribute Permissions** | Owner OR serviceAdmin (for service attrs) | Owner only |
| **Delegate Types** | Generic + serviceAdmin | Generic only |
| **Attribute Storage** | On-chain mapping | Events only |
| **Meta-Transactions** | no | yes |
| **Primary Use Case** | Business logic with granular permissions | Generic DID resolver |

## Why Official did:ethr was not used here?

The official `EthrDIDRegistry` contract has `setAttribute()` restricted to identity owners:

```solidity
function setAttribute(
    address identity,
    bytes32 name,
    bytes memory value,
    uint validity
) public onlyOwner(identity, msg.sender) {  // Only owner can call!
    // ...
}
```

**Our Requirement:** Service administrators need to update service endpoints without full identity control.

**Proposed Solution:** Custom permission model in `setAttribute()`:
```solidity
bool isServiceAdmin = validDelegate(identity, delegateType, msg.sender);
bool isServiceEndpointAttribute = (name == "serviceEndpoint");

require(
    isOwner || (isServiceAdmin && isServiceEndpointAttribute),
    "Not authorized"
);
```

This enables limited write access for service management while preserving identity owner (TA) sovereignty. However, this diverges from did:ethr permission model. If proceeding with did:ethr, alternative patterns would be required such as ownership transfer workflows. Or alternatively, admins have no attribute modification rights at all, making them generic delegates and did:ethr can therefore be used (if no other constraints occur).

## Test Coverage

+20 tests for:
-  Company registration and metadata
-  Admin delegation and expiration
-  Service admin permissions (can/cannot scenarios)
-  Attribute management authorization
-  Integration flows across all three contracts
-  Edge cases (zero addresses, invalid delegates, expired delegates)

Run `npx hardhat test` to verify all scenarios.

More tests will be added when functionality is modified / more requirements are specified.


