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
    return log.topics[1];
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
    const attrName = keccak256(toHex("did/service/Company")); //TODO: change to "did/svc/company" so that we follow the guide of did:ethr: https://github.com/decentralized-identity/ethr-did-resolver/blob/master/doc/did-method-spec.md#service-endpoints
    const attrValue = toHex("https://company.com");

    // Encode the registry call
    // setAttribute(address identity, bytes32 name, bytes value, uint validity)
    const data = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [companyDid, attrName, attrValue, 3600n]
    });

    // Owner 1 calls execCall (no voting)
    await multisig.write.execCall([registry.address, data], { account: owner1.account });

    // Verify using parseAbiItem for safety
    const eventLogs = await publicClient.getContractEvents({
      address: registry.address,
      abi: registry.abi, // Explicit ABI helps Viem parsing
      eventName: "DIDAttributeChanged",
    });

    // Find event for companyDid
    const event = eventLogs.find((e:any) => e.args.identity.toLowerCase() === companyDid.toLowerCase());
    assert.ok(event, "Attribute should be changed by single admin");

    // TODO optional: change the same service section attribute again to ensure complete update of service section [this is only an optional TODO because a service section update is not necessary if trust anchor set the pointer to the CRSet smart contract as this only requires setting the service section but never updating it]
  });

    // --- REQUIREMENT: Single Admin Manage Company's DID document verificationMethod section---
  it("Single trust anchor admin can update Company's DID document verificationMethodsection", async () => {
    // TODO while following this guide: https://github.com/decentralized-identity/ethr-did-resolver/blob/master/doc/did-method-spec.md#public-keys
    // TODO: after adding a company admin's public key under the verificationMethod also enable its removal by updating the same verificationMethod attribute
  });

  // --- REQUIREMENT: Single trust anchor admin adds company admin as delegate of company's did:ethr  ---
  it("Single trust anchor admin adds company admin as delegate of company's did:ethr", async () => {
    // TODO
  });

  // --- REQUIREMENT: Single trust anchor admin removes company admin as delegate of company's did:ethr  ---
  it("Single trust anchor admin removes company admin as delegate of company's did:ethr", async () => {
    // TODO
  });



  // TESTs of desired features for identity of trust anchor

    // --- REQUIREMENT: Single Admin CANNOT Manage TA Identity ---
  it("Single admin CANNOT update Trust Anchor DID attributes directly", async () => {
    const attrName = keccak256(toHex("did/service/TA")); //TODO: change to "did/svc/trust-anchor" so that we follow the guide of did:ethr: https://github.com/decentralized-identity/ethr-did-resolver/blob/master/doc/did-method-spec.md#service-endpoints
    // Attempting to modify multisig.address (TA Identity)
    const data = encodeFunctionData({
      abi: registry.abi,
      functionName: "setAttribute",
      args: [multisig.address, attrName, toHex("bad"), 3600n]
    });

    // Should fail because target identity == multisig address
    await assert.rejects(
        multisig.write.execCall([registry.address, data], { account: owner1.account }),
        /use_proposal_for_self/
    );
  });

  // --- REQUIREMENT: Quorum for TA Identity ---
  it("Trust Anchor Attribute updates require Quorum", async () => {
    const attrName = keccak256(toHex("did/service/TA")); //TODO: change to "did/svc/trust-anchor" so that we follow the guide of did:ethr: https://github.com/decentralized-identity/ethr-did-resolver/blob/master/doc/did-method-spec.md#service-endpoints
    const id = await getProposalId(
        multisig.write.proposeSetAttribute([attrName, toHex("ok"), 3600n], { account: owner1.account })
    );

    // 1 signature: Not executed (Quorum is 2)
    // Owner 1 must approve explicitly now (logic consistency)
    await multisig.write.approve([id], { account: owner1.account });

    // TODO: verify no "DIDAttributeChanged" event yet emitted

    // 2 signatures (Quorum reached)
    await multisig.write.approve([id], { account: owner2.account });

    const events = await publicClient.getContractEvents({
      address: registry.address,
      abi: registry.abi,
      eventName: "DIDAttributeChanged"
    });

    const event = events.find((e:any) => e.args.identity.toLowerCase() === multisig.address.toLowerCase());
    assert.ok(event, "Event for TA should be emitted after quorum");
  });

  // --- REQUIREMENT: Unanimity for trust anchor's did:ethr ownership change ---
  it("ChangeOwner requires Unanimity (3/3)", async () => {
    const newOwner = companyAdmin.account.address;

    // Target: Company DID ownership change
    const id = await getProposalId(
        multisig.write.proposeChangeOwner([companyDid, newOwner], { account: owner1.account })
    );

    await multisig.write.approve([id], { account: owner1.account });
    await multisig.write.approve([id], { account: owner2.account });

    // 2/3: Should NOT be executed yet
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
  it("Remove Owner requires Unanimity", async () => {
    // TODO
  });

  // --- REQUIREMENT: unanimous update quorum threshold  ---
  it("Quorum update requires Unanimity", async () => {
    // TODO
  });
});

// TODO optional: testing security of contracts for production deployment
// TESTs for security

// --- REQUIREMENT: trust anchor admins cannot administer company DID of other trust anchor---