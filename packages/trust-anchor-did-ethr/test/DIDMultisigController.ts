// in production: const REGISTRY_ADDRESS = "0x03d5003bf0e79C5F5223588F347ebA39AfbC3818"; //did:ethr contract in Sepolia

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";
import { keccak256, toHex } from "viem";

describe("DIDMultisigController (local EthereumDIDRegistry)", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner1, owner2, owner3, delegate] = await viem.getWalletClients();

  let registry: any;
  let multisig: any;

  /**
   * Helper: propose an action and return its proposalId
   */
  async function proposeAndGetId(
    txPromise: Promise<`0x${string}`>,
  ): Promise<`0x${string}`> {
    const txHash = await txPromise;
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

    const log = receipt.logs.find(
      (l: any) =>
        l.address.toLowerCase() === multisig.address.toLowerCase(),
    );

    assert.ok(log, "ProposalCreated event not found");

    // ProposalCreated(bytes32 indexed id, bytes data)
    return log.topics[1];
  }

  beforeEach(async () => {
    registry = await viem.deployContract("EthereumDIDRegistry");

    multisig = await viem.deployContract("DIDMultisigController", [
      registry.address,
      [
        owner1.account.address,
        owner2.account.address,
        owner3.account.address,
      ],
      2n, // quorum = 2-of-3
    ]);
  });

  it("Initial owners and quorum are set correctly", async () => {
    assert.equal(await multisig.read.quorum(), 2n);
    assert.equal(await multisig.read.isOwner([owner1.account.address]), true);
    assert.equal(await multisig.read.isOwner([owner2.account.address]), true);
    assert.equal(await multisig.read.isOwner([owner3.account.address]), true);
  });

  it("Can propose and execute addDelegate via quorum", async () => {
    const delegateType = keccak256(toHex("did:ethr:delegate"));

    const proposalId = await proposeAndGetId(
      multisig.write.proposeAddDelegate(
        [delegateType, delegate.account.address, 3600n],
        { account: owner1.account },
      ),
    );

    await multisig.write.approve([proposalId], {
      account: owner2.account,
    });

    const isValid = await registry.read.validDelegate([
      multisig.address,
      delegateType,
      delegate.account.address,
    ]);

    assert.equal(isValid, true);
  });

  it("Can revoke a delegate via quorum", async () => {
    const delegateType = keccak256(toHex("did:ethr:delegate"));

    // first add
    const addId = await proposeAndGetId(
      multisig.write.proposeAddDelegate(
        [delegateType, delegate.account.address, 3600n],
        { account: owner1.account },
      ),
    );
    await multisig.write.approve([addId], { account: owner2.account });

    // then revoke
    const revokeId = await proposeAndGetId(
      multisig.write.proposeRevokeDelegate(
        [delegateType, delegate.account.address],
        { account: owner1.account },
      ),
    );
    await multisig.write.approve([revokeId], { account: owner2.account });

    const isValid = await registry.read.validDelegate([
      multisig.address,
      delegateType,
      delegate.account.address,
    ]);

    assert.equal(isValid, false);
  });

  it("Can set a DID attribute via quorum", async () => {
    const attrName = keccak256(toHex("did/service/Example"));
    const attrValue = toHex("https://example.com");

    const fromBlock = await publicClient.getBlockNumber();

    const proposalId = await proposeAndGetId(
      multisig.write.proposeSetAttribute(
        [attrName, attrValue, 3600n],
        { account: owner1.account },
      ),
    );

    await multisig.write.approve([proposalId], {
      account: owner2.account,
    });

    const events = await publicClient.getContractEvents({
      address: registry.address,
      abi: registry.abi,
      eventName: "DIDAttributeChanged",
      fromBlock,
      strict: true,
    });

    assert.equal(events.length, 1);
    assert.equal(events[0].args.identity, multisig.address);
  });

  it("Can revoke a DID attribute via quorum", async () => {
    const attrName = keccak256(toHex("did/service/Example"));
    const attrValue = toHex("https://example.com");

    const setId = await proposeAndGetId(
      multisig.write.proposeSetAttribute(
        [attrName, attrValue, 3600n],
        { account: owner1.account },
      ),
    );
    await multisig.write.approve([setId], { account: owner2.account });

    const revokeId = await proposeAndGetId(
      multisig.write.proposeRevokeAttribute(
        [attrName, attrValue],
        { account: owner1.account },
      ),
    );
    await multisig.write.approve([revokeId], { account: owner2.account });

    assert.ok(true); // success = no revert
  });

  it("Can change DID owner via quorum", async () => {
    const newOwner = owner3.account.address;

    const proposalId = await proposeAndGetId(
      multisig.write.proposeChangeOwner(
        [newOwner],
        { account: owner1.account },
      ),
    );

    await multisig.write.approve([proposalId], {
      account: owner2.account,
    });

    const owner = await registry.read.identityOwner([multisig.address]);
    assert.equal(owner, newOwner);
  });

  it("Can update quorum only with unanimous approval", async () => {
    const proposalId = await proposeAndGetId(
      multisig.write.proposeQuorumUpdate(
        [3n],
        { account: owner1.account },
      ),
    );

    await multisig.write.approve([proposalId], {
      account: owner2.account,
    });
    await multisig.write.approve([proposalId], {
      account: owner3.account,
    });

    assert.equal(await multisig.read.quorum(), 3n);
  });

  it("Does not execute proposals below quorum", async () => {
    const delegateType = keccak256(toHex("did:ethr:delegate"));

    const proposalId = await proposeAndGetId(
      multisig.write.proposeAddDelegate(
        [delegateType, delegate.account.address, 3600n],
        { account: owner1.account },
      ),
    );

    // only one approval (owner1 already proposed, but proposal ≠ approval)
    const isValid = await registry.read.validDelegate([
      multisig.address,
      delegateType,
      delegate.account.address,
    ]);

    assert.equal(isValid, false);
  });
});