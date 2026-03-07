# did:ethr identifiers for trust anchors

## Desired features for identity of trust anchor
1. trust anchor creates its did:ethr-based identity by deploying its own DIDMultisigController contract that registers its admins, sets the quorum threshold, and configures the did:ethr identifier of the trust anchor (stage of feature: Implemented, Tested, Reviewed)
2. the quorum threshold of a DIDMultisigController contract can only be updated when all trust anchor admins agree to the new quorum threshold (stage of feature: Implemented, Tested, Reviewed)
3. a new trust anchor admin can only be added when all trust anchor admins agree to the new trust anchor admin (stage of feature: Implemented, Tested, Reviewed)
4. a trust anchor admin can only be removed when all trust anchors admins agree to removal (excluding the trust anchor admin whose removal is considered) (stage of feature: Implemented, Tested, Reviewed)
5. a quorum of trust anchor admins can call the addDelegate, revokeDelegate, setAttribute, and revokeAttribute function of the trust anchor's did:ethr identifier (stage of feature: Implemented, Sufficiently tested)
6. only all trust anchor admins together can call the changeOwner function of the trust anchor's did:ethr identifier (stage of feature: Implemented by did:ethr contract, Tested, Reviewed)

## Desired features for identity of companies
1. creating did:ethr identifier for company: one trust anchor admin or one company admin sets the trust anchor as DID controller of company did:ethr using changeOwner function of company's did:ethr (stage of feature: this feature is implemented by did:ethr's underlying smart contract. The test of this feature is covered by "beforeEach"- section of test script "DIDMultisigController.ts")
2. adding company admins to did:ethr identifier of company: one trust anchor admin uses the deployed DIDMultisigController contract of its trust anchor to set the admins of the company by running setAttribute on "verificationMethod" section of the company's did:ethr identifier and by running setDelegate function of the company's did:ethr identifier (stage of feature: Implemented, Tested, Reviewed)
3. removing company admins from did:ethr identifier of company: one trust anchor admin uses the deployed DIDMultisigController contract of its trust anchor to remove an admin of the company by running revokeAttribute on "verificationMethod" section of the company's did:ethr identifier and by running revokeDelegate function of the company's did:ethr identifier (stage of feature: Implemented, Tested, Reviewed)
4. only all trust anchor admins together can call the changeOwner function of their companys' did:ethr identifier (stage of feature: Implemented, Tested, Reviewed)
5. one trust anchor admin uses the deployed DIDMultisigController contract of its trust anchor to add a static pointer to a smart contract that enables company admins to change the CID of BFC of company's CRSet by calling the setAttribute function on the "service" section of the company's did:ethr identifier (stage of feature: Implemented, Tested, Reviewed)

## Desired feature for private digital asset publication
This feature of the DIDMultisigController smart contract enables a company admin to show a Zero-Knowledge Proof that authorizes the DIDMultisigController to act as a relayer and digital asset publisher without revealing the identity of the authorizing company admin.

### Set up and testing private digital asset publication
To unlock the feature for private digital asset publication, the Zero-Knowledge Proof generator must be added to this ``trust-anchor-did-ethr`` package, which can be done following the steps described in the ``README`` of the [ASCS circom-ecdsa fork](https://github.com/ASCS-eV/circom-ecdsa?tab=readme-ov-file#private-secure-on-chain-group-signature-verification-with-variable-group-size). After adding the Zero-Knowledge Proof generator to the folder `./circom-zkp-generator`, the feature for private digital asset publicaiton can be tested by running `npx hardhat test ./test/DIDMultisigController.privatePublish.test.ts` in the terminal while in the folder `./packages/trust-anchor-did-ethr`.

### Workflow of private digital asset publication
1. **Preparation**: The Trust Anchor admin uses the [ASCS circom-ecdsa fork](https://github.com/ASCS-eV/circom-ecdsa) to create ZKP-verifier smart contracts (see `./contracts/verifiers`) and ZKP generator (see `./circom-zkp-generator`) specific to different group sizes. To create both, follow the [instructions from above](#set-up-and-testing-private-digital-asset-publication).
2. **Registration**: The Trust Anchor deploys these verifier smart contracts and stores their addresses in the `verifiers` mapping within the `DIDMultisigController`.
3. **Generation**: Company admins (or a DApp) generate a ZKP off-chain using the ASCS toolset (see `./circom-zkp-generator`).
4. **Publication**: Admins call `privatelyPublishMarketplaceData` to publish digital data assets to the ASCS marketplace (simulated via `DigitalAssetMarketplaceStub`).

**Note:** see test script `./test/DIDMultisigController.privatePublish.test.ts` to understand the code behind the workflow steps of *registration*, *generation*, and *publication*.

### Improvements for future
The goal is to make verifier registration obsolete by making membership proofs independent of group size, as discussed in the [ASCS circom-ecdsa fork](https://github.com/ASCS-eV/circom-ecdsa) under "Membership Proof Is O(m)". 

Alternatively, a **Fixed-Size Padding** model could be used:
* **Simpler contract architecture**: Only one verifier contract (e.g., fixed at 100 slots) is maintained.
* **Easier extensibility**: Smaller groups are padded with null-address placeholders.
* **Reduced complexity**: Client-side logic remains consistent across all group sizes.
* **Lower overhead**: Fewer artifacts (WASM, zkey) need to be managed.

## Desired security features for production
### ... for identity of trust anchor
1. trust anchor admins cannot administer company DID of other trust anchor
2. ...

### ... for identity of companies
1. company admins cannot administer DID of trust anchor or other company
2. ...

## Acknowledgements
We extend our gratitude to **0xParc** for their pioneering work on [circom-ecdsa](https://github.com/0xPARC/circom-ecdsa). Their implementation served as the foundational building block for the ZKP-based private digital asset publication system featured in this repository.

To meet the specific requirements of the `trust-anchor-did-ethr` software system, we have adapted 0xParc's original code within our own [fork of circom-ecdsa](https://github.com/ASCS-eV/circom-ecdsa). This fork is instrumental in our workflow, specifically for:

* **Verifier Smart Contracts**: Generating the ZK-SNARK verification logic located in `./contracts/verifiers`.
* **ZKP Artifacts**: Producing the circuit compilation and proving keys found within the `./circom-zkp-generator` directory.