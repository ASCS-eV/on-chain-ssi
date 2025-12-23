import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";
import { encodeFunctionData, keccak256, toHex } from "viem";

describe("CRSet Complete Workflow (Integration)", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [taOwner1, taOwner2, taOwner3, companyAdmin, randomUser] = 
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

    // Setup: TA adds company admin to CRSetRegistry
    const addAdminData = encodeFunctionData({
      abi: crsetRegistry.abi,
      functionName: "addCompanyAdmin",
      args: [companyDID, companyAdmin.account.address]
    });
    await multisig.write.execCall(
      [crsetRegistry.address, addAdminData],
      { account: taOwner1.account }
    );
  });

  it("End-to-end: Admin updates CID -> TA syncs to DID document", async () => {
    // First the company admin updates CID in CRSetRegistry contract
    const ipfsCID = "QmRevocationList123abc";
    await crsetRegistry.write.updateRevocationCID(
      [companyDID, ipfsCID],
      { account: companyAdmin.account }
    );

    // Verify CID stored in CRSetRegistry
    const storedCID = await crsetRegistry.read.getRevocationCID([companyDID]);
    assert.equal(storedCID, ipfsCID);

    // Second, TA reads the new CID from CRSetRegistry
    // NOTE: Will be further implemented; Listener would detech RevocationCIDUpdated event. Currently this is manual
    const currentCID = await crsetRegistry.read.getRevocationCID([companyDID]);
    assert.equal(currentCID, ipfsCID);

    // Finally TA updates companys DID document with new CID
    const attributeName = keccak256(toHex("did/svc/CredentialRevocationList"));
    const serviceEndpointValue = toHex(`ipfs://${currentCID}`);
    
    const setAttributeData = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [
        companyDID,
        attributeName,
        serviceEndpointValue,
        31536000n  // Valid for 1 year
      ]
    });

    // TA executes ( multisig)
    await multisig.write.execCall(
      [registry.address, setAttributeData],
      { account: taOwner1.account }
    );

    // Verify DID document was updated
    const events = await publicClient.getContractEvents({
      address: registry.address,
      abi: registry.abi,
      eventName: "DIDAttributeChanged"
    });

    const didEvent = events.find((e: any) => 
      e.args.identity.toLowerCase() === companyDID.toLowerCase() &&
      e.args.name === attributeName
    );

    assert.ok(didEvent, "DID document should be updated");
    assert.equal(didEvent.args.value, serviceEndpointValue);
  });

  it("Multiple CID updates sync correctly to DID document", async () => {
    // Update 1
    const cid1 = "QmFirstRevocationList";
    await crsetRegistry.write.updateRevocationCID(
      [companyDID, cid1],
      { account: companyAdmin.account }
    );

    // TA syncs to DID
    const attributeName = keccak256(toHex("did/svc/CredentialRevocationList"));
    let serviceValue = toHex(`ipfs://${cid1}`);
    let setAttrData = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [companyDID, attributeName, serviceValue, 31536000n]
    });
    await multisig.write.execCall(
      [registry.address, setAttrData],
      { account: taOwner1.account }
    );

    // Update 2 (daily update)
    const cid2 = "QmSecondRevocationList";
    await crsetRegistry.write.updateRevocationCID(
      [companyDID, cid2],
      { account: companyAdmin.account }
    );

    // TA syncs again
    serviceValue = toHex(`ipfs://${cid2}`);
    setAttrData = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [companyDID, attributeName, serviceValue, 31536000n]
    });
    await multisig.write.execCall(
      [registry.address, setAttrData],
      { account: taOwner1.account }
    );

    // Verify final state
    const finalCID = await crsetRegistry.read.getRevocationCID([companyDID]);
    assert.equal(finalCID, cid2);

    // Check DID events: should have 2 updates
    const events = await publicClient.getContractEvents({
      address: registry.address,
      abi: registry.abi,
      eventName: "DIDAttributeChanged"
    });

    const companyEvents = events.filter((e: any) => 
      e.args.identity.toLowerCase() === companyDID.toLowerCase() &&
      e.args.name === attributeName
    );

    // Note: setAttribute overwrites the same attribute, so we get 2 separate events
    assert.ok(companyEvents.length >= 1, "Should have DID updates");
    
    // Verify the latest event has the second CID
    const latestEvent = companyEvents[companyEvents.length - 1];
    assert.equal(latestEvent.args.value, serviceValue);
  });

  it("TA adds service pointer to CRSet registry contract", async () => {
    // TA adds a pointer to the CRSetRegistry contract itself
    // This allows verifiers to know where to find the current CID
    
    const registryPointerAttr = keccak256(toHex("did/svc/CredentialRevocationRegistry"));
    const registryPointerValue = toHex(
      JSON.stringify({
        id: `did:ethr:sepolia:${companyDID}#crset-registry`,
        type: "CredentialRevocationRegistry",
        serviceEndpoint: crsetRegistry.address
      })
    );

    const setAttrData = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [
        companyDID,
        registryPointerAttr,
        registryPointerValue,
        31536000n
      ]
    });

    await multisig.write.execCall(
      [registry.address, setAttrData],
      { account: taOwner1.account }
    );

    // Verify pointer was set
    const events = await publicClient.getContractEvents({
      address: registry.address,
      abi: registry.abi,
      eventName: "DIDAttributeChanged"
    });

    const pointerEvent = events.find((e: any) => 
      e.args.identity.toLowerCase() === companyDID.toLowerCase() &&
      e.args.name === registryPointerAttr
    );

    assert.ok(pointerEvent, "Registry pointer should be set in DID document");
    assert.equal(pointerEvent.args.value, registryPointerValue);
  });

  it("Complete onboarding: Company -> TA adds pointer -> Admin updates CID -> TA syncs", async () => {
    // Capture starting block for event filtering
    const startBlock = await publicClient.getBlockNumber();
    
    // PHASE 1: TA adds registry pointer to DID
    const registryPointerAttr = keccak256(toHex("did/svc/CRSetRegistry"));
    const registryPointerValue = toHex(crsetRegistry.address);
    
    const addPointerData = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [companyDID, registryPointerAttr, registryPointerValue, 31536000n]
    });
    await multisig.write.execCall(
      [registry.address, addPointerData],
      { account: taOwner1.account }
    );

    // PHASE 2: Admin updates CID
    const ipfsCID = "QmCompanyRevocationData";
    await crsetRegistry.write.updateRevocationCID(
      [companyDID, ipfsCID],
      { account: companyAdmin.account }
    );

    // PHASE 3: Sync: TA reads from registry and updates DID
    // (In production, event listener would trigger this)
    const currentCID = await crsetRegistry.read.getRevocationCID([companyDID]);
    
    const cidAttr = keccak256(toHex("did/svc/CredentialRevocationList"));
    const cidValue = toHex(`ipfs://${currentCID}`);
    
    const updateCIDData = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [companyDID, cidAttr, cidValue, 31536000n]
    });
    await multisig.write.execCall(
      [registry.address, updateCIDData],
      { account: taOwner1.account }
    );

    // VERIFY: DID document now has both service entries
    const allEvents = await publicClient.getContractEvents({
      address: registry.address,
      abi: registry.abi,
      eventName: "DIDAttributeChanged",
      fromBlock: startBlock
    });

    const companyEvents = allEvents.filter((e: any) => 
      e.args.identity.toLowerCase() === companyDID.toLowerCase()
    );
    
    // Verify we have both attribute types
    const hasRegistryPointer = companyEvents.some((e: any) => e.args.name === registryPointerAttr);
    const hasCIDAttribute = companyEvents.some((e: any) => e.args.name === cidAttr);
    assert.ok(hasRegistryPointer, "Should have registry pointer");
    assert.ok(hasCIDAttribute, "Should have CID attribute");
    
    // Verify CRSetRegistry state matches DID state
    const registryCID = await crsetRegistry.read.getRevocationCID([companyDID]);
    assert.equal(registryCID, ipfsCID);
  });
});
