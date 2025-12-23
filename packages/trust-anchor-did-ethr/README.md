# did:ethr identifiers for trust anchors

## Desired features for identity of trust anchor
1. trust anchor creates its did:ethr-based identity by deploying its own DIDMultisigController contract that registers its admins, sets the quorum threshold, and configures the did:ethr identifier of the trust anchor
2. the quorum threshold of a DIDMultisigController contract can only be updated when all trust anchor admins agree to the new quorum threshold
3. a new trust anchor admin can only be added when all trust anchor admins agree to the new trust anchor admin
4. a trust anchor admin can only be removed when all trust anchors admins agree to removal (excluding the trust anchor admin whose removal is considered)
5. a quorum of trust anchor admins can call the addDelegate, revokeDelegate, setAttribute, and revokeAttribute function of the trust anchor's did:ethr identifier
6. only all trust anchor admins together can call the changeOwner function of the trust anchor's did:ethr identifier

## Desired features for identity of companies
1. creating did:ethr identifier for company: one trust anchor admin or one company admin sets the trust anchor as DID controller of company did:ethr using changeOwner function of company's did:ethr
2. adding company admins to did:ethr identifier of company: one trust anchor admin uses the deployed DIDMultisigController contract of its trust anchor to set the admins of the company by running setAttribute on "verificationMethod" section of the company's did:ethr identifier and by running setDelegate function of the company's did:ethr identifier
3. removing company admins from did:ethr identifier of company: one trust anchor admin uses the deployed DIDMultisigController contract of its trust anchor to remove an admin of the company by running revokeAttribute on "verificationMethod" section of the company's did:ethr identifier and by running revokeDelegate function of the company's did:ethr identifier
4. only all trust anchor admins together can call the changeOwner function of their companys' did:ethr identifier
5. one trust anchor admin uses the deployed DIDMultisigController contract of its trust anchor to add a static pointer to a smart contract that enables company admins to change the CID of BFC of company's CRSet by calling the setAttribute function on the "service" section of the company's did:ethr identifier

## Usage of Hardhat

### Running Tests

To run all the tests in the project, execute the following command:

```shell
npx hardhat test
```

You can also selectively run the Solidity or `node:test` tests:

```shell
npx hardhat test solidity
npx hardhat test nodejs
```

### Make a deployment to Sepolia

This project includes an example Ignition module to deploy the contract. You can deploy this module to a locally simulated chain or to Sepolia.

To run the deployment to a local chain:

```shell
npx hardhat ignition deploy ignition/modules/Counter.ts
```

To run the deployment to Sepolia, you need an account with funds to send the transaction. The provided Hardhat configuration includes a Configuration Variable called `SEPOLIA_PRIVATE_KEY`, which you can use to set the private key of the account you want to use.

You can set the `SEPOLIA_PRIVATE_KEY` variable using the `hardhat-keystore` plugin or by setting it as an environment variable.

To set the `SEPOLIA_PRIVATE_KEY` config variable using `hardhat-keystore`:

```shell
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

After setting the variable, you can run the deployment with the Sepolia network:

```shell
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```
