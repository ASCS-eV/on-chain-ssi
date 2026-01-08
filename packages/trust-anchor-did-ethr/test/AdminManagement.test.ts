import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";
import { encodeFunctionData } from "viem";

describe("CRSet Admin Management", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [taOwner1, taOwner2, companyDID, admin1, admin2, unauthorized] = 
    await viem.getWalletClients();

  let registry: any;
  let multisig: any;
  let crsetRegistry: any;

  beforeEach(async () => {
    registry = await viem.deployContract("EthereumDIDRegistry");

    // Deploy Trust Anchor Multisig (2 owners with quorum 2)
    multisig = await viem.deployContract("DIDMultisigController", [
      registry.address,
      [taOwner1.account.address, taOwner2.account.address],
      2n,
    ]);

    // Deploy CompanyCRSetRegistry -owned by multisig
    crsetRegistry = await viem.deployContract("CompanyCRSetRegistry", [
      multisig.address
    ]);

    // company delegates themself to multisig
    await registry.write.changeOwner(
      [companyDID.account.address, multisig.address],
      { account: companyDID.account }
    );
  });

  it("should allow TA to add company admin via execCall", async () => {
    // Prepare addCompanyAdmin call
    const addAdminData = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "addCompanyAdmin",
      args: [companyDID.account.address, admin1.account.address]
    });

    // multisig execCall
    await multisig.write.execCall(
      [crsetRegistry.address, addAdminData],
      { account: taOwner1.account }
    );

    // Verify admin was added
    const isAdmin = await crsetRegistry.read.isCompanyAdmin([
      companyDID.account.address,
      admin1.account.address
    ]);

    assert.strictEqual(isAdmin, true, "Admin should be authorized");
  });

  it("should allow TA to remove company admin with execCall", async () => {
    // First add admin
    const addAdminData = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "addCompanyAdmin",
      args: [companyDID.account.address, admin1.account.address]
    });
    await multisig.write.execCall(
      [crsetRegistry.address, addAdminData],
      { account: taOwner1.account }
    );

    // Then remove admin
    const removeAdminData = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "removeCompanyAdmin",
      args: [companyDID.account.address, admin1.account.address]
    });
    await multisig.write.execCall(
      [crsetRegistry.address, removeAdminData],
      { account: taOwner1.account }
    );

    // Verify admin was removed
    const isAdmin = await crsetRegistry.read.isCompanyAdmin([
      companyDID.account.address,
      admin1.account.address
    ]);

    assert.strictEqual(isAdmin, false, "Admin should be removed");
  });

  it("should prevent unauthorized users from adding admins", async () => {
    // Try to add admin directly (not with multisig)
    let reverted = false;
    try {
      await crsetRegistry.write.addCompanyAdmin(
        [companyDID.account.address, admin1.account.address],
        { account: unauthorized.account }
      );
    } catch (error: any) {
      reverted = true;
      // Any revert is acceptable, just want to confirm it reverts
    }
    assert.ok(reverted, "Transaction should have reverted for unauthorized user");
  });

  it("should allow authorized admin to update revocation CID", async () => {
    // Add admin with TA
    const addAdminData = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "addCompanyAdmin",
      args: [companyDID.account.address, admin1.account.address]
    });
    await multisig.write.execCall(
      [crsetRegistry.address, addAdminData],
      { account: taOwner1.account }
    );

    // Admin updates CID
    const testCID = "QmTestCID123456789";
    const hash = await crsetRegistry.write.updateRevocationCID(
      [companyDID.account.address, testCID],
      { account: admin1.account }
    );

    await publicClient.waitForTransactionReceipt({ hash });

    // Verify CID was updated
    const storedCID = await crsetRegistry.read.getRevocationCID([
      companyDID.account.address
    ]);

    assert.strictEqual(storedCID, testCID, "CID should be updated");
  });

  it("should prevent unauthorized users from updating CID", async () => {
    const testCID = "QmTestCID123456789";

    // Try to update without being an admin
    let reverted = false;
    try {
      await crsetRegistry.write.updateRevocationCID(
        [companyDID.account.address, testCID],
        { account: unauthorized.account }
      );
    } catch (error: any) {
      reverted = true;
      // any revert is acceptable again
    }
    assert.ok(reverted, "Transaction should have reverted for unauthorized user");
  });

  it("should support multiple admins for same company", async () => {
    // Add two admins
    const addAdmin1Data = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "addCompanyAdmin",
      args: [companyDID.account.address, admin1.account.address]
    });
    await multisig.write.execCall(
      [crsetRegistry.address, addAdmin1Data],
      { account: taOwner1.account }
    );

    const addAdmin2Data = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "addCompanyAdmin",
      args: [companyDID.account.address, admin2.account.address]
    });
    await multisig.write.execCall(
      [crsetRegistry.address, addAdmin2Data],
      { account: taOwner1.account }
    );

    // Both should be authorized
    const isAdmin1 = await crsetRegistry.read.isCompanyAdmin([
      companyDID.account.address,
      admin1.account.address
    ]);
    const isAdmin2 = await crsetRegistry.read.isCompanyAdmin([
      companyDID.account.address,
      admin2.account.address
    ]);

    assert.strictEqual(isAdmin1, true, "Admin1 should be authorized");
    assert.strictEqual(isAdmin2, true, "Admin2 should be authorized");

    // Both can update CID
    const cid1 = "QmCID1";
    await crsetRegistry.write.updateRevocationCID(
      [companyDID.account.address, cid1],
      { account: admin1.account }
    );

    const cid2 = "QmCID2";
    await crsetRegistry.write.updateRevocationCID(
      [companyDID.account.address, cid2],
      { account: admin2.account }
    );

    const finalCID = await crsetRegistry.read.getRevocationCID([
      companyDID.account.address
    ]);

    assert.strictEqual(finalCID, cid2, "Last update should persist");
  });

  it("should emit RevocationCIDUpdated event on update", async () => {
    // Add admin
    const addAdminData = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "addCompanyAdmin",
      args: [companyDID.account.address, admin1.account.address]
    });
    await multisig.write.execCall(
      [crsetRegistry.address, addAdminData],
      { account: taOwner1.account }
    );

    const testCID = "QmTestCID123456789";
    const startBlock = await publicClient.getBlockNumber();

    // Update CID
    const hash = await crsetRegistry.write.updateRevocationCID(
      [companyDID.account.address, testCID],
      { account: admin1.account }
    );

    await publicClient.waitForTransactionReceipt({ hash });

    //Check for event
    const events = await crsetRegistry.getEvents.RevocationCIDUpdated(
      {},
      { fromBlock: startBlock }
    );

    assert.strictEqual(events.length, 1, "Should emit one event");
    assert.strictEqual(
      events[0].args.companyDID?.toLowerCase(),
      companyDID.account.address.toLowerCase(),
      "Event should contain correct company DID"
    );
    assert.strictEqual(
      events[0].args.newCID,
      testCID,
      "Event should contain correct CID"
    );
  });
});
