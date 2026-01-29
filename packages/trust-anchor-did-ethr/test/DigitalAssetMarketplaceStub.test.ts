import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";

describe("DigitalAssetMarketplaceStub", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner, nonOwner] = await viem.getWalletClients();

  let marketplace: any;

  beforeEach(async () => {
    marketplace = await viem.deployContract(
      "DigitalAssetMarketplaceStub",
      [owner.account.address]
    );
  });

  it("Should deploy with correct initial owner", async () => {
    const storedOwner = await marketplace.read.owner();
    assert.equal(
      storedOwner.toLowerCase(),
      owner.account.address.toLowerCase()
    );
  });

  /**
   * publishData
   */

  it("Owner can publish data", async () => {
    const testData = "QmTestData";

    await marketplace.write.publishData(
      [testData],
      { account: owner.account }
    );

    const events = await publicClient.getContractEvents({
      address: marketplace.address,
      abi: marketplace.abi,
      eventName: "DataPublished"
    });

    const event = events.find((e: any) => e.args.data === testData);
    assert.ok(event, "DataPublished event should be emitted");
  });

  it("Non-owner cannot publish data", async () => {
    await assert.rejects(
      marketplace.write.publishData(
        ["UnauthorizedData"],
        { account: nonOwner.account }
      ),
      /Not the owner/
    );
  });

  /**
   * setOwner
   */

  it("Owner can change owner", async () => {
    await marketplace.write.setOwner(
      [nonOwner.account.address],
      { account: owner.account }
    );

    const newOwner = await marketplace.read.owner();
    assert.equal(
      newOwner.toLowerCase(),
      nonOwner.account.address.toLowerCase()
    );
  });

  it("Non-owner cannot change owner", async () => {
    await assert.rejects(
      marketplace.write.setOwner(
        [nonOwner.account.address],
        { account: nonOwner.account }
      ),
      /Not the owner/
    );
  });
});
