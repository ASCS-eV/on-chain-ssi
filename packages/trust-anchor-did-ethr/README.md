# did:ethr identifiers for trust anchors

## Desired behaviour of did:ethr identifier for trust anchor
1. trust anchor deploys its own DIDMultisigController contract that registers its admins, sets the quorum threshold, and ultimately configures the did:ethr identifier of the trust anchor
2. the quorum threshold can only be set when all trust anchor admins agree to the new quorum threshold
3. a new trust anchor admin can only be added when all current trust anchor admins agree to the new trust anchor admin
4. a trust anchor admin can only be removed when all current trust anchors admins agree to removal (excluding the trust anchor admin whose removal is considered)

## Mandatory workflows for trust anchor regarding companies
The following worklfows must be possible through the DIDMultisigController contract:

1. trust anchor uses its deployed DIDMultisigController contract to create did:ethr identifier for company that has the trust anchor as DID controller, i.e. trust anchor sets itself as DID controller of company did:ethr using setOwner function of company's did:ethr
2. admin of trust anchor uses the deployed DIDMultisigController contract of its trust anchor to set the admins of the company by running setAttribute on "verificationMethod" section of the company's did:ethr identifier - i.e., trust anchor lists DID of all company admins in verificationMethod section using setAttribute function of did:ethr + optional: allows admins to issue VCs using setDelegate function of did:ethr

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
