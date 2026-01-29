import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";

describe("DIDMultisigController – publishMarketplaceData", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  const [taOwner1, taOwner2, assetOwner, randomUser] =
    await viem.getWalletClients();

  let registry: any;
  let multisig: any;
  let marketplace: any;

  beforeEach(async () => {
    // Deploy mock DID registry
    registry = await viem.deployContract("EthereumDIDRegistry");

    // Deploy multisig with 2 owners, quorum 1
    multisig = await viem.deployContract("DIDMultisigController", [
      registry.address,
      [taOwner1.account.address, taOwner2.account.address],
      1n
    ]);

    // Deploy marketplace stub owned by multisig
    marketplace = await viem.deployContract(
      "DigitalAssetMarketplaceStub",
      [multisig.address]
    );
  });

  it("Trust Anchor admin can publish marketplace data and assign asset owner", async () => {
    const testData = "QmMarketplaceData123";
    const expectedAssetId = 0n;

    await multisig.write.publishMarketplaceData(
      [marketplace.address, testData, assetOwner.account.address],
      { account: taOwner1.account }
    );

    // Verify event emission
    const events = await publicClient.getContractEvents({
      address: marketplace.address,
      abi: marketplace.abi,
      eventName: "DataPublished"
    });

    const event = events.find((e: any) => e.args.data === testData);
    assert.ok(event, "DataPublished event should be emitted");

    // Verify asset ownership was recorded
    const recordedOwner = await marketplace.read.assetOwners([
      expectedAssetId
    ]);
    assert.equal(
      recordedOwner.toLowerCase(),
      assetOwner.account.address.toLowerCase()
    );
  });

  it("Different Trust Anchor admin can also publish marketplace data", async () => {
    const testData = "QmMarketplaceDataByOwner2";
    const expectedAssetId = 0n;

    await multisig.write.publishMarketplaceData(
      [marketplace.address, testData, assetOwner.account.address],
      { account: taOwner2.account }
    );

    const recordedOwner = await marketplace.read.assetOwners([
      expectedAssetId
    ]);
    assert.equal(
      recordedOwner.toLowerCase(),
      assetOwner.account.address.toLowerCase()
    );
  });

  it("Non-owner cannot publish marketplace data", async () => {
    await assert.rejects(
      multisig.write.publishMarketplaceData(
        [marketplace.address, "UnauthorizedData", assetOwner.account.address],
        { account: randomUser.account }
      ),
      /not_owner/
    );
  });
});
