import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";
import { encodeFunctionData, keccak256, toBytes, toHex } from "viem";

describe("DID Sync Integration", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [taOwner1, taOwner2, companyDID, companyAdmin] = 
    await viem.getWalletClients();

  let registry: any;
  let multisig: any;
  let crsetRegistry: any;

  beforeEach(async () => {
    // Deploy EthereumDIDRegistry
    registry = await viem.deployContract("EthereumDIDRegistry");

    // Deploy Trust Anchor Multisig
    multisig = await viem.deployContract("DIDMultisigController", [
      registry.address,
      [taOwner1.account.address, taOwner2.account.address],
      2n,
    ]);

    // Deploy CompanyCRSetRegistry -owned by multisig
    crsetRegistry = await viem.deployContract("CompanyCRSetRegistry", [
      multisig.address
    ]);

    await registry.write.changeOwner(
      [companyDID.account.address, multisig.address],
      { account: companyDID.account }
    );

    // trustAnchor add company admin
    const addAdminData = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "addCompanyAdmin",
      args: [companyDID.account.address, companyAdmin.account.address]
    });
    await multisig.write.execCall(
      [crsetRegistry.address, addAdminData],
      { account: taOwner1.account }
    );
  });

  it("should sync CID to DID document with setAttribute", async () => {
    //Company admin updates CID
    const testCID = "QmX4fGjYzZ9H8vXzBwKqP3mNrYtE6uDhJsLkRwZnVcFdAb";
    await crsetRegistry.write.updateRevocationCID(
      [companyDID.account.address, testCID],
      { account: companyAdmin.account }
    );

    //  TA syncs to DID document
    const attributeName = keccak256(toBytes("did/svc/CredentialRevocationList"));
    const attributeValue = toHex(toBytes(`ipfs://${testCID}`));
    const validity = BigInt(31536000); // 1 year

    const setAttributeData = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [companyDID.account.address, attributeName, attributeValue, validity]
    });

    const startBlock = await publicClient.getBlockNumber();

    const hash = await multisig.write.execCall(
      [registry.address, setAttributeData],
      { account: taOwner1.account }
    );

    await publicClient.waitForTransactionReceipt({ hash });

    //Verify DIDAttributeChanged event is emitted
    const events = await registry.getEvents.DIDAttributeChanged(
      { identity: companyDID.account.address },
      { fromBlock: startBlock }
    );

    assert.strictEqual(events.length, 1, "Should emit DIDAttributeChanged event");
    assert.strictEqual(
      events[0].args.identity?.toLowerCase(),
      companyDID.account.address.toLowerCase(),
      "Event should contain correct identity"
    );
    assert.strictEqual(
      events[0].args.name,
      attributeName,
      "Event should contain correct attribute name"
    );
    assert.strictEqual(
      events[0].args.value,
      attributeValue,
      "Event should contain correct IPFS CID"
    );
  });

  it("should update existing DID attribute when CID changes", async () => {
    const attributeName = keccak256(toBytes("did/svc/CredentialRevocationList"));
    const validity = BigInt(31536000);

    // First sync
    const cid1 = "QmFirstCID";
    await crsetRegistry.write.updateRevocationCID(
      [companyDID.account.address, cid1],
      { account: companyAdmin.account }
    );

    const value1 = toHex(toBytes(`ipfs://${cid1}`));
    const setAttribute1 = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [companyDID.account.address, attributeName, value1, validity]
    });
    await multisig.write.execCall(
      [registry.address, setAttribute1],
      { account: taOwner1.account }
    );

    // Second sync with new CID
    const cid2 = "QmSecondCID";
    await crsetRegistry.write.updateRevocationCID(
      [companyDID.account.address, cid2],
      { account: companyAdmin.account }
    );

    const value2 = toHex(toBytes(`ipfs://${cid2}`));
    const setAttribute2 = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [companyDID.account.address, attributeName, value2, validity]
    });

    const startBlock = await publicClient.getBlockNumber();
    const hash = await multisig.write.execCall(
      [registry.address, setAttribute2],
      { account: taOwner1.account }
    );
    await publicClient.waitForTransactionReceipt({ hash });

    // Verify latest event has new CID
    const events = await registry.getEvents.DIDAttributeChanged(
      { identity: companyDID.account.address },
      { fromBlock: startBlock }
    );

    assert.strictEqual(events.length, 1, "Should emit one event for update");
    assert.strictEqual(
      events[0].args.value,
      value2,
      "Event should contain updated CID"
    );
  });

  it("should maintain separate attributes for different companies", async () => {
    // Setup second company
    const [, , , , company2DID, company2Admin] = await viem.getWalletClients();
    
    await registry.write.changeOwner(
      [company2DID.account.address, multisig.address],
      { account: company2DID.account }
    );

    const addAdmin2Data = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "addCompanyAdmin",
      args: [company2DID.account.address, company2Admin.account.address]
    });
    await multisig.write.execCall(
      [crsetRegistry.address, addAdmin2Data],
      { account: taOwner1.account }
    );

    // Update CIDs for both companies
    const cid1 = "QmCompany1CID";
    const cid2 = "QmCompany2CID";

    await crsetRegistry.write.updateRevocationCID(
      [companyDID.account.address, cid1],
      { account: companyAdmin.account }
    );
    await crsetRegistry.write.updateRevocationCID(
      [company2DID.account.address, cid2],
      { account: company2Admin.account }
    );

    // Sync both to DID documents
    const attributeName = keccak256(toBytes("did/svc/CredentialRevocationList"));
    const validity = BigInt(31536000);

    const value1 = toHex(toBytes(`ipfs://${cid1}`));
    const setAttribute1 = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [companyDID.account.address, attributeName, value1, validity]
    });
    await multisig.write.execCall(
      [registry.address, setAttribute1],
      { account: taOwner1.account }
    );

    const value2 = toHex(toBytes(`ipfs://${cid2}`));
    const setAttribute2 = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [company2DID.account.address, attributeName, value2, validity]
    });
    
    const startBlock = await publicClient.getBlockNumber();
    await multisig.write.execCall(
      [registry.address, setAttribute2],
      { account: taOwner1.account }
    );

    // Verify each company has its own attribute
    const company1Events = await registry.getEvents.DIDAttributeChanged(
      { identity: companyDID.account.address },
      { fromBlock: 0n }
    );
    const company2Events = await registry.getEvents.DIDAttributeChanged(
      { identity: company2DID.account.address },
      { fromBlock: startBlock }
    );

    assert.strictEqual(company1Events.length, 1, "Company1 should have one attribute");
    assert.strictEqual(company2Events.length, 1, "Company2 should have one attribute");
    assert.strictEqual(company1Events[0].args.value, value1, "Company1 should have correct CID");
    assert.strictEqual(company2Events[0].args.value, value2, "Company2 should have correct CID");
  });

  it("should complete full workflow: update CID -> sync to DID", async () => {
    const testCID = "QmFullWorkflowTestCID";
    const attributeName = keccak256(toBytes("did/svc/CredentialRevocationList"));
    const validity = BigInt(31536000);

    //company adminfirst updates revocation CID
    const updateHash = await crsetRegistry.write.updateRevocationCID(
      [companyDID.account.address, testCID],
      { account: companyAdmin.account }
    );
    await publicClient.waitForTransactionReceipt({ hash: updateHash });

    // Verify CID is stored in CompanyCRSetRegistry
    const storedCID = await crsetRegistry.read.getRevocationCID([
      companyDID.account.address
    ]);
    assert.strictEqual(storedCID, testCID, "CID should be stored in CRSetRegistry");

    // TA reads CID and syncs it to DID document
    const attributeValue = toHex(toBytes(`ipfs://${storedCID}`));
    const setAttributeData = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [companyDID.account.address, attributeName, attributeValue, validity]
    });

    const startBlock = await publicClient.getBlockNumber();
    const syncHash = await multisig.write.execCall(
      [registry.address, setAttributeData],
      { account: taOwner1.account }
    );
    await publicClient.waitForTransactionReceipt({ hash: syncHash });

    // verification
    const didEvents = await registry.getEvents.DIDAttributeChanged(
      { identity: companyDID.account.address },
      { fromBlock: startBlock }
    );

    assert.strictEqual(didEvents.length, 1, "Should emit DID attribute event");
    assert.strictEqual(
      didEvents[0].args.value,
      attributeValue,
      "DID should contain IPFS URL with correct CID"
    );

    // end: Verify complete IPFS URL format
    const expectedURL = `ipfs://${testCID}`;
    const actualValue = Buffer.from(
      didEvents[0].args.value?.slice(2) || "",
      "hex"
    ).toString();
    
    assert.strictEqual(actualValue, expectedURL, "DID should contain properly formatted IPFS URL");
  });
});
