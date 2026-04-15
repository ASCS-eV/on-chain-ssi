import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";
import { encodeFunctionData, keccak256, toBytes, toHex, hexToString } from "viem";

describe("Static Endpoint Integration", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [taOwner1, taOwner2, companyDID, companyAdmin] = 
    await viem.getWalletClients();

  let registry: any;
  let multisig: any;
  let crsetRegistry: any;


  // this test is for checking if the static revocation list endpoint setup works as intended

  beforeEach(async () => {
    // Deploy EthereumDIDRegistry
    registry = await viem.deployContract("EthereumDIDRegistry");

    // Deploy Trust Anchor Multisig
    multisig = await viem.deployContract("DIDMultisigController", [
      registry.address,
      [taOwner1.account.address, taOwner2.account.address],
      2n,
    ]);

    // Deploy CompanyCRSetRegistry - owned by multisig
    crsetRegistry = await viem.deployContract("CompanyCRSetRegistry", [
      multisig.address
    ]);

    // Company hands over control to Trust Anchor
    await registry.write.changeOwner(
      [companyDID.account.address, multisig.address],
      { account: companyDID.account }
    );

    // Trust Anchor adds company admin
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

  it("should set static endpoint once and retrieve dynamic CID updates", async () => {
    // first, TA sets static endpoint (setup once)
    const attributeName = keccak256(toBytes("did/svc/CredentialRevocationList"));
    
    // JSON structure pointing to contract
    const endpointData = JSON.stringify({
      contract: crsetRegistry.address,
      chainId: 31337, //localhost; change to 11155111 for Sepolia
      function: "getRevocationCID",
      params: ["{{identity}}"]
    });
    
    const attributeValue = toHex(toBytes(endpointData));
    const validity = BigInt(31536000); // 1 year

    const setAttributeData = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [companyDID.account.address, attributeName, attributeValue, validity]
    });

    const startBlock = await publicClient.getBlockNumber();

    const setupHash = await multisig.write.execCall(
      [registry.address, setAttributeData],
      { account: taOwner1.account }
    );

    await publicClient.waitForTransactionReceipt({ hash: setupHash });

    // Verify static endpoint is stored
    const events = await registry.getEvents.DIDAttributeChanged(
      { identity: companyDID.account.address },
      { fromBlock: startBlock }
    );

    assert.equal(events.length, 1, "Should emit one DIDAttributeChanged event");
    
    const storedValue = events[0].args.value;
    const decodedEndpoint = hexToString(storedValue as `0x${string}`);
    const parsedEndpoint = JSON.parse(decodedEndpoint);
    
    assert.equal(parsedEndpoint.contract.toLowerCase(), crsetRegistry.address.toLowerCase(), 
      "Contract address should match");
    assert.equal(parsedEndpoint.function, "getRevocationCID", 
      "Function name should be getRevocationCID");
    assert.equal(parsedEndpoint.chainId, 31337, 
      "ChainId should be 31337 (Hardhat)");

    // next STEP: Company admin updates CID (first time)
    const firstCID = "QmFirstCID123456789";
    await crsetRegistry.write.updateRevocationCID(
      [companyDID.account.address, firstCID],
      { account: companyAdmin.account }
    );

    // now, Verifier resolves DID document, reads static endpoint
    // Then queries the contract directly to simulating verifier behavior
    const currentCID = await crsetRegistry.read.getRevocationCID([
      companyDID.account.address
    ]);

    assert.equal(currentCID, firstCID, 
      "Verifier should read first CID from contract");

    //Company admin updates CID again (NO setAttribute needed!)
    const secondCID = "QmSecondCID987654321";
    await crsetRegistry.write.updateRevocationCID(
      [companyDID.account.address, secondCID],
      { account: companyAdmin.account }
    );

    // Verifier queries same endpoint, gets new CID automatically
    const updatedCID = await crsetRegistry.read.getRevocationCID([
      companyDID.account.address
    ]);

    assert.equal(updatedCID, secondCID, 
      "Verifier should read updated CID without Trust Anchor intervention");

    // Verify DID document attribute was NOT updated
    const finalEvents = await registry.getEvents.DIDAttributeChanged(
      { identity: companyDID.account.address },
      { fromBlock: startBlock }
    );

    assert.equal(finalEvents.length, 1, 
      "DID document should still have only ONE setAttribute event (static endpoint)");

    // Verify static endpoint still points to same contract
    const finalStoredValue = finalEvents[0].args.value;
    const finalDecodedEndpoint = hexToString(finalStoredValue as `0x${string}`);
    const finalParsedEndpoint = JSON.parse(finalDecodedEndpoint);

    assert.equal(finalParsedEndpoint.contract.toLowerCase(), crsetRegistry.address.toLowerCase(),
      "Static endpoint should remain unchanged");
  });

  it("should allow multiple companies to have independent static endpoints", async () => {
    // Setup second company
    const [, , , , companyDID2, companyAdmin2] = await viem.getWalletClients();

    await registry.write.changeOwner(
      [companyDID2.account.address, multisig.address],
      { account: companyDID2.account }
    );

    const addAdmin2Data = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "addCompanyAdmin",
      args: [companyDID2.account.address, companyAdmin2.account.address]
    });
    await multisig.write.execCall(
      [crsetRegistry.address, addAdmin2Data],
      { account: taOwner1.account }
    );

    // Set static endpoints for both companies
    const attributeName = keccak256(toBytes("did/svc/CredentialRevocationList"));
    const endpointData = JSON.stringify({
      contract: crsetRegistry.address,
      chainId: 31337,
      function: "getRevocationCID",
      params: ["{{identity}}"]
    });
    const attributeValue = toHex(toBytes(endpointData));
    const validity = BigInt(31536000);

    // Company 1 endpoint
    const setAttr1 = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [companyDID.account.address, attributeName, attributeValue, validity]
    });
    await multisig.write.execCall(
      [registry.address, setAttr1],
      { account: taOwner1.account }
    );

    // Company 2 endpoint
    const setAttr2 = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [companyDID2.account.address, attributeName, attributeValue, validity]
    });
    await multisig.write.execCall(
      [registry.address, setAttr2],
      { account: taOwner1.account }
    );

    // Both companies update their own CIDs
    const cid1 = "QmCompany1CID";
    const cid2 = "QmCompany2CID";

    await crsetRegistry.write.updateRevocationCID(
      [companyDID.account.address, cid1],
      { account: companyAdmin.account }
    );

    await crsetRegistry.write.updateRevocationCID(
      [companyDID2.account.address, cid2],
      { account: companyAdmin2.account }
    );

    // Verify both companies have correct and independent CIDs
    const retrievedCID1 = await crsetRegistry.read.getRevocationCID([
      companyDID.account.address
    ]);
    const retrievedCID2 = await crsetRegistry.read.getRevocationCID([
      companyDID2.account.address
    ]);

    assert.equal(retrievedCID1, cid1, "Company 1 should have correct CID");
    assert.equal(retrievedCID2, cid2, "Company 2 should have correct CID");
    assert.notEqual(retrievedCID1, retrievedCID2, "Companies should have different CIDs");
  });

  it("should handle missing CID gracefully for new companies", async () => {
    // Setup new company with static endpoint but no CID yet
    const [, , , , , , newCompanyDID] = await viem.getWalletClients();

    await registry.write.changeOwner(
      [newCompanyDID.account.address, multisig.address],
      { account: newCompanyDID.account }
    );

    // Set static endpoint
    const attributeName = keccak256(toBytes("did/svc/CredentialRevocationList"));
    const endpointData = JSON.stringify({
      contract: crsetRegistry.address,
      chainId: 31337,
      function: "getRevocationCID",
      params: ["{{identity}}"]
    });
    const attributeValue = toHex(toBytes(endpointData));
    const validity = BigInt(31536000);

    const setAttrData = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [newCompanyDID.account.address, attributeName, attributeValue, validity]
    });
    await multisig.write.execCall(
      [registry.address, setAttrData],
      { account: taOwner1.account }
    );

    // Query CID (should be empty string)
    const emptyCID = await crsetRegistry.read.getRevocationCID([
      newCompanyDID.account.address
    ]);

    assert.equal(emptyCID, "", "CID should be empty string for new company");
  });
});
