import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";
import { keccak256, toHex, encodeFunctionData, parseAbiItem } from "viem";

describe("DIDMultisigController", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner1, owner2, owner3, companyAdmin, randomUser] = await viem.getWalletClients();

  let registry: any;
  let multisig: any;
  let companyDid: any;

  // Helper to get Proposal ID from logs
  async function getProposalId(txPromise: Promise<`0x${string}`>): Promise<`0x${string}`> {
    const txHash = await txPromise;
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    const log = receipt.logs.find((l: any) => l.address.toLowerCase() === multisig.address.toLowerCase());
    if (!log) {
        throw new Error("Transaction failed or no event emitted from multisig");
    }
    return log.topics[1] as `0x${string}`;
  }

  beforeEach(async () => {
    registry = await viem.deployContract("EthereumDIDRegistry");

    // Deploy Trust Anchor Multisig (3 owners, Quorum 2)
    multisig = await viem.deployContract("DIDMultisigController", [
      registry.address,
      [owner1.account.address, owner2.account.address, owner3.account.address],
      2n,
    ]);

    // Create a "Company" identity and assign the Multisig as its owner
    companyDid = randomUser.account.address;

    // Pass TWO arguments: [identity, newOwner]
    await registry.write.changeOwner(
        [companyDid, multisig.address],
        { account: randomUser.account }
    );
  });


  // TESTs of desired features for identity of companies

  // --- REQUIREMENT: Single Admin Manage Company's DID document service section---
  it("Single trust anchor admin can update Company's DID document service section", async () => {
    const attrName = keccak256(toHex("did/svc/Company")); 
    const attrValue = toHex("https://company.com");

    const data = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [companyDid, attrName, attrValue, 3600n]
    });

    await multisig.write.execCall([registry.address, data], { account: owner1.account });

    const eventLogs = await publicClient.getContractEvents({
      address: registry.address,
      abi: registry.abi, 
      eventName: "DIDAttributeChanged",
    });

    const event = eventLogs.find((e:any) => e.args.identity.toLowerCase() === companyDid.toLowerCase());
    assert.ok(event, "Attribute should be changed by single admin");
  });

    // --- REQUIREMENT: Single Admin Manage Company's DID document verificationMethod section---
  it("Single trust anchor admin can update Company's DID document verificationMethod section", async () => {
    const attrName = keccak256(toHex("did/pub/Ed25519/verificationMethod"));
    const attrValue = toHex("0x1234567890abcdef"); 

    const data = encodeFunctionData({
        abi: registry.abi,
        functionName: "setAttribute",
        args: [companyDid, attrName, attrValue, 86400n]
    });

    await multisig.write.execCall([registry.address, data], { account: owner1.account });

    const eventLogs = await publicClient.getContractEvents({
        address: registry.address,
        abi: registry.abi,
        eventName: "DIDAttributeChanged",
    });

    const event = eventLogs.find((e: any) => 
        e.args.identity.toLowerCase() === companyDid.toLowerCase() &&
        e.args.name === attrName
    );
    assert.ok(event, "Verification method attribute should be added by single admin");
  });

  // --- REQUIREMENT: Single trust anchor admin adds company admin as delegate of company's did:ethr ---
  it("Single trust anchor admin adds company admin as delegate of company's did:ethr", async () => {
    const delegateType = keccak256(toHex("veriKey"));
    const newDelegate = companyAdmin.account.address;
    const validity = 86400n;

    const data = encodeFunctionData({
        abi: registry.abi,
        functionName: "addDelegate",
        args: [companyDid, delegateType, newDelegate, validity]
    });

    await multisig.write.execCall([registry.address, data], { account: owner1.account });

    const isValid = await registry.read.validDelegate([companyDid, delegateType, newDelegate]);
    assert.equal(isValid, true, "Delegate should be valid");
  });

  // --- REQUIREMENT: Single trust anchor admin removes company admin as delegate of company's did:ethr ---
  it("Single trust anchor admin removes company admin as delegate of company's did:ethr", async () => {
    const delegateType = keccak256(toHex("veriKey"));
    const delegateToRemove = companyAdmin.account.address;
    const validity = 86400n;

    // 1. Add delegate first
    const addData = encodeFunctionData({
        abi: registry.abi,
        functionName: "addDelegate",
        args: [companyDid, delegateType, delegateToRemove, validity]
    });
    await multisig.write.execCall([registry.address, addData], { account: owner1.account });

    // 2. Remove delegate
    const revokeData = encodeFunctionData({
        abi: registry.abi,
        functionName: "revokeDelegate",
        args: [companyDid, delegateType, delegateToRemove]
    });
    await multisig.write.execCall([registry.address, revokeData], { account: owner1.account });

    // 3. Verify removal
    const isValid = await registry.read.validDelegate([companyDid, delegateType, delegateToRemove]);
    assert.equal(isValid, false, "Delegate should be revoked");
  });



  // TESTs of desired features for identity of trust anchor

  // --- REQUIREMENT: Single Admin CANNOT Manage TA Identity ---
  it("Single trust anchoradmin CANNOT update Trust Anchor DID attributes", async () => {
    const attrName = keccak256(toHex("did/svc/TA")); 
    const data = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [multisig.address, attrName, toHex("bad"), 3600n]
    });

    await assert.rejects(
        multisig.write.execCall([registry.address, data], { account: owner1.account }),
        /use_proposal_for_self/
    );
  });

  // --- REQUIREMENT: Quorum for TA Identity ---
  it("Update of trust anchor DID attributes requires quorum", async () => {
    const attrName = keccak256(toHex("did/svc/TA")); 
    const id = await getProposalId(
        multisig.write.proposeSetAttribute([attrName, toHex("ok"), 3600n], { account: owner1.account })
    );

    // 1 signature: Not executed (Quorum is 2)
    await multisig.write.approve([id], { account: owner1.account });

    // verify no "DIDAttributeChanged" event yet emitted due to lack of quorum
    const eventsAfter1st = await publicClient.getContractEvents({
      address: registry.address,
      abi: registry.abi,
      eventName: "DIDAttributeChanged"
    });
    const eventAfter1st = eventsAfter1st.find((e:any) => e.args.identity.toLowerCase() === multisig.address.toLowerCase());
    assert.ok(!eventAfter1st, "Event for TA DID update should NOT be emitted yet");

    // 2 signatures (Quorum reached)
    await multisig.write.approve([id], { account: owner2.account });

    // verify emission of "DIDAttributeChanged" event after quorum reached
    const eventsAfter2nd = await publicClient.getContractEvents({
      address: registry.address,
      abi: registry.abi,
      eventName: "DIDAttributeChanged"
    });
    const eventAfterQuorum = eventsAfter2nd.find((e:any) => e.args.identity.toLowerCase() === multisig.address.toLowerCase() && e.args.value === toHex("ok"));
    assert.ok(eventAfterQuorum, "Event for TA DID update should be emitted after quorum");
  });

  // --- REQUIREMENT: Unanimity for trust anchor's did:ethr ownership change ---
  it("ChangeOwner requires Unanimity (3/3)", async () => {
    const newOwner = companyAdmin.account.address;

    const id = await getProposalId(
        multisig.write.proposeChangeOwner([companyDid, newOwner], { account: owner1.account })
    );

    await multisig.write.approve([id], { account: owner1.account });
    await multisig.write.approve([id], { account: owner2.account });

    // 2/3: Should NOT be executed yet (Unanimity required)
    let currentOwner = await registry.read.identityOwner([companyDid]);
    assert.notEqual(currentOwner.toLowerCase(), newOwner.toLowerCase());

    // 3/3: Execution
    await multisig.write.approve([id], { account: owner3.account });

    currentOwner = await registry.read.identityOwner([companyDid]);
    assert.equal(currentOwner.toLowerCase(), newOwner.toLowerCase());
  });

  // --- REQUIREMENT: Add Owner ---
  it("Add Owner requires Unanimity", async () => {
    const id = await getProposalId(
        multisig.write.proposeAddOwner([companyAdmin.account.address], { account: owner1.account })
    );

    await multisig.write.approve([id], { account: owner1.account });
    await multisig.write.approve([id], { account: owner2.account });
    // Not enough (2/3)
    let isOwner = await multisig.read.isOwner([companyAdmin.account.address]);
    assert.equal(isOwner, false);

    // 3/3
    await multisig.write.approve([id], { account: owner3.account });

    isOwner = await multisig.read.isOwner([companyAdmin.account.address]);
    assert.equal(isOwner, true);
  });

  // --- REQUIREMENT: Remove Owner ---
  it("Remove Owner requires Unanimity (excluding removed owner)", async () => {
    // Current owners: [owner1, owner2, owner3]
    // We propose removing owner3.
    // Unanimity logic: threshold = totalOwners (3) - 1 = 2.
    // So owner1 + owner2 should be enough to remove owner3.

    const id = await getProposalId(
        multisig.write.proposeRemoveOwner([owner3.account.address], { account: owner1.account })
    );

    // 1. Owner 1 approves
    await multisig.write.approve([id], { account: owner1.account });

    // Check: Still owner
    let isOwner = await multisig.read.isOwner([owner3.account.address]);
    assert.equal(isOwner, true, "Should still be owner with 1 vote");

    // 2. Owner 2 approves -> Should trigger execution (2/2 valid owners)
    await multisig.write.approve([id], { account: owner2.account });

    // Check: Removed
    isOwner = await multisig.read.isOwner([owner3.account.address]);
    assert.equal(isOwner, false, "Owner should be removed after remaining owners approve");
  });

  // --- REQUIREMENT: unanimous update quorum threshold ---
  it("Quorum update requires Unanimity", async () => {
    // Current owners: 3. Current quorum: 2.
    // We propose changing quorum to 1.
    // Unanimity required: 3/3 votes.

    const newQuorum = 1n;
    const id = await getProposalId(
        multisig.write.proposeQuorumUpdate([newQuorum], { account: owner1.account })
    );

    await multisig.write.approve([id], { account: owner1.account });
    await multisig.write.approve([id], { account: owner2.account });

    // Check: Quorum not changed yet (2/3)
    let currentQuorum = await multisig.read.quorum();
    assert.equal(currentQuorum, 2n);

    // 3. Owner 3 approves
    await multisig.write.approve([id], { account: owner3.account });

    // Check: Quorum updated
    currentQuorum = await multisig.read.quorum();
    assert.equal(currentQuorum, newQuorum);
  });
});