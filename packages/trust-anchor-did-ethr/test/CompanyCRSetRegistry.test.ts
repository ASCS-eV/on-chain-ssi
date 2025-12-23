import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";
import { encodeFunctionData } from "viem";

describe("CompanyCRSetRegistry", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [taOwner1, taOwner2, taOwner3, companyAdmin1, companyAdmin2, randomUser] = 
    await viem.getWalletClients();

  let registry: any;
  let multisig: any;
  let crsetRegistry: any;
  let companyDID: `0x${string}`;

  beforeEach(async () => {
    // Deploy EthereumDIDRegistry
    registry = await viem.deployContract("EthereumDIDRegistry");

    // Deploy Trust Anchor Multisig (3 owners, quorum 2)
    multisig = await viem.deployContract("DIDMultisigController", [
      registry.address,
      [taOwner1.account.address, taOwner2.account.address, taOwner3.account.address],
      2n,
    ]);

    // Deploy CompanyCRSetRegistry (owned by multisig)
    crsetRegistry = await viem.deployContract("CompanyCRSetRegistry", [
      multisig.address
    ]);

    // Create a company DID and assign to multisig
    companyDID = randomUser.account.address;
    await registry.write.changeOwner(
      [companyDID, multisig.address],
      { account: randomUser.account }
    );
  });

  it("Should deploy with multisig as owner", async () => {
    const owner = await crsetRegistry.read.owner();
    assert.equal(owner.toLowerCase(), multisig.address.toLowerCase());
  });

  it("Trust Anchor can add company admin via execCall", async () => {
    // Encode addCompanyAdmin call
    const data = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "addCompanyAdmin",
      args: [companyDID, companyAdmin1.account.address]
    });

    // TA admin uses execCall to add company admin
    await multisig.write.execCall(
      [crsetRegistry.address, data],
      { account: taOwner1.account }
    );

    // Verify admin was added
    const isAdmin = await crsetRegistry.read.isCompanyAdmin([
      companyDID,
      companyAdmin1.account.address
    ]);
    assert.equal(isAdmin, true);
  });

  it("Company admin can update revocation CID", async () => {
    // First, TA adds the admin
    const addAdminData = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "addCompanyAdmin",
      args: [companyDID, companyAdmin1.account.address]
    });
    await multisig.write.execCall(
      [crsetRegistry.address, addAdminData],
      { account: taOwner1.account }
    );

    // Company admin updates CID directly (no TA needed)
    const testCID = "QmTest123abc";
    await crsetRegistry.write.updateRevocationCID(
      [companyDID, testCID],
      { account: companyAdmin1.account }
    );

    // Verify CID was updated
    const storedCID = await crsetRegistry.read.getRevocationCID([companyDID]);
    assert.equal(storedCID, testCID);
  });

  it("Non-admin cannot update revocation CID", async () => {
    await assert.rejects(
      crsetRegistry.write.updateRevocationCID(
        [companyDID, "QmTest"],
        { account: randomUser.account }
      ),
      /OnlyCompanyAdmin/
    );
  });

  it("Emits RevocationCIDUpdated event", async () => {
    // Add admin
    const addAdminData = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "addCompanyAdmin",
      args: [companyDID, companyAdmin1.account.address]
    });
    await multisig.write.execCall(
      [crsetRegistry.address, addAdminData],
      { account: taOwner1.account }
    );

    // Update CID
    const testCID = "QmEventTest";
    await crsetRegistry.write.updateRevocationCID(
      [companyDID, testCID],
      { account: companyAdmin1.account }
    );

    // Check event was emitted
    const events = await publicClient.getContractEvents({
      address: crsetRegistry.address,
      abi: crsetRegistry.abi,
      eventName: "RevocationCIDUpdated"
    });

    const event = events.find((e: any) => 
      e.args.companyDID.toLowerCase() === companyDID.toLowerCase()
    );
    assert.ok(event, "RevocationCIDUpdated event should be emitted");
    assert.equal(event.args.newCID, testCID);
  });

  it("Trust Anchor can remove company admin", async () => {
    // First, add admin
    const addAdminData = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "addCompanyAdmin",
      args: [companyDID, companyAdmin1.account.address]
    });
    await multisig.write.execCall(
      [crsetRegistry.address, addAdminData],
      { account: taOwner1.account }
    );

    // Verify admin was added
    let isAdmin = await crsetRegistry.read.isCompanyAdmin([
      companyDID,
      companyAdmin1.account.address
    ]);
    assert.equal(isAdmin, true);

    // Remove admin
    const removeAdminData = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "removeCompanyAdmin",
      args: [companyDID, companyAdmin1.account.address]
    });
    await multisig.write.execCall(
      [crsetRegistry.address, removeAdminData],
      { account: taOwner1.account }
    );

    // Verify admin was removed
    isAdmin = await crsetRegistry.read.isCompanyAdmin([
      companyDID,
      companyAdmin1.account.address
    ]);
    assert.equal(isAdmin, false);
  });

  it("Multiple admins can manage same company", async () => {
    // Add admin1
    const addAdmin1Data = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "addCompanyAdmin",
      args: [companyDID, companyAdmin1.account.address]
    });
    await multisig.write.execCall(
      [crsetRegistry.address, addAdmin1Data],
      { account: taOwner1.account }
    );

    // Add admin2
    const addAdmin2Data = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "addCompanyAdmin",
      args: [companyDID, companyAdmin2.account.address]
    });
    await multisig.write.execCall(
      [crsetRegistry.address, addAdmin2Data],
      { account: taOwner1.account }
    );

    // Admin1 updates CID
    const cid1 = "QmAdmin1Update";
    await crsetRegistry.write.updateRevocationCID(
      [companyDID, cid1],
      { account: companyAdmin1.account }
    );
    let storedCID = await crsetRegistry.read.getRevocationCID([companyDID]);
    assert.equal(storedCID, cid1);

    // Admin2 updates CID
    const cid2 = "QmAdmin2Update";
    await crsetRegistry.write.updateRevocationCID(
      [companyDID, cid2],
      { account: companyAdmin2.account }
    );
    storedCID = await crsetRegistry.read.getRevocationCID([companyDID]);
    assert.equal(storedCID, cid2);

    // Verify both are still admins
    const isAdmin1 = await crsetRegistry.read.isCompanyAdmin([
      companyDID,
      companyAdmin1.account.address
    ]);
    const isAdmin2 = await crsetRegistry.read.isCompanyAdmin([
      companyDID,
      companyAdmin2.account.address
    ]);
    assert.equal(isAdmin1, true);
    assert.equal(isAdmin2, true);
  });

  it("Removed admin cannot update CID", async () => {
    // Add admin
    const addAdminData = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "addCompanyAdmin",
      args: [companyDID, companyAdmin1.account.address]
    });
    await multisig.write.execCall(
      [crsetRegistry.address, addAdminData],
      { account: taOwner1.account }
    );

    // Admin updates CID successfully
    const cid1 = "QmBeforeRemoval";
    await crsetRegistry.write.updateRevocationCID(
      [companyDID, cid1],
      { account: companyAdmin1.account }
    );
    const storedCID = await crsetRegistry.read.getRevocationCID([companyDID]);
    assert.equal(storedCID, cid1);

    // Remove admin
    const removeAdminData = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "removeCompanyAdmin",
      args: [companyDID, companyAdmin1.account.address]
    });
    await multisig.write.execCall(
      [crsetRegistry.address, removeAdminData],
      { account: taOwner1.account }
    );

    // Removed admin tries to update CID - should fail
    await assert.rejects(
      crsetRegistry.write.updateRevocationCID(
        [companyDID, "QmAfterRemoval"],
        { account: companyAdmin1.account }
      ),
      /OnlyCompanyAdmin/
    );
  });
});
