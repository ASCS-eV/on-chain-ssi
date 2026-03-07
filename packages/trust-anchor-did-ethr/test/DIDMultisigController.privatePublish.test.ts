import assert from "node:assert/strict";
import { describe, it, beforeEach, after } from "node:test";
import { network } from "hardhat";

import {
  keccak256,
  encodePacked,
  hexToBigInt,
  encodeFunctionData,
  toHex,
} from "viem";

import {
  generatePrivateKey,
  privateKeyToAccount,
} from "viem/accounts";

import * as snarkjs from "snarkjs";

/* -------------------------------------------------------------
   Helpers
------------------------------------------------------------- */

function splitPrivKey(pk: string) {
  const pkBI = hexToBigInt(pk);

  const words: string[] = [];
  let tmp = pkBI;

  for (let i = 0; i < 4; i++) {
    words.push((tmp & ((1n << 64n) - 1n)).toString());
    tmp >>= 64n;
  }

  return words;
}

async function generateProof({
  privKey,
  admins,
  nonce,
  cid,
  company,
  marketplace,
}: any) {

  /* -----------------------------------------
     Hash (Solidity compatible)
  ----------------------------------------- */
  const msgHash = keccak256(
    encodePacked(
      ["string", "uint256", "string", "address", "address"],
      ["ZK_PUBLISH_V1", nonce, cid, company, marketplace]
    )
  );

  const hashBI = hexToBigInt(msgHash);

  const lo = hashBI & ((1n << 128n) - 1n);
  const hi = hashBI >> 128n;

  /* -----------------------------------------
     Circuit Input
  ----------------------------------------- */

  const circuitInput = {
    privkey: splitPrivKey(privKey),
    privHashHi: hi.toString(),
    privHashLo: lo.toString(),
    pubHashHi: hi.toString(),
    pubHashLo: lo.toString(),
    addrs: admins.map((a: string) =>
      hexToBigInt(a).toString()
    ),
    nonce: nonce.toString(),
  };

  /* -----------------------------------------
     Prove
  ----------------------------------------- */

  const m = admins.length;

  const wasmPath =
    "./circom-zkp-generator/p_m_" +
    m +
    "/private_secure_variable_groupsig_js/private_secure_variable_groupsig.wasm";

  const zkeyPath =
    "./circom-zkp-generator/p_m_" +
    m +
    "/private_secure_variable_groupsig.zkey";

  const { proof, publicSignals } =
    await snarkjs.groth16.fullProve(
      circuitInput,
      wasmPath,
      zkeyPath
    );

  return {
    a: [proof.pi_a[0], proof.pi_a[1]],
    b: [
      [proof.pi_b[0][1], proof.pi_b[0][0]],
      [proof.pi_b[1][1], proof.pi_b[1][0]],
    ],
    c: [proof.pi_c[0], proof.pi_c[1]],
    input: publicSignals.map((x: any) => BigInt(x)),
  };
}


/* =============================================================
   Test Suite
============================================================= */

describe("DIDMultisigController – private publishing on marketplace", async () => {

  const { viem } = await network.connect();

  const wallets = await viem.getWalletClients();

  const taOwner = wallets[0];
  const company = wallets[1];
  const user1 = wallets[2];
  const user2 = wallets[3];
  const user3 = wallets[4];
  let companyAdmins: string[];

  let registry: any;
  let controller: any;
  let marketplace: any;

  let verifier2: any;
  let verifier3: any;
  let verifier4: any;

  const COMPANY_ADMIN_TYPE = keccak256(toHex("CompanyAdmin"));

  /* ---------------------------------------------------------
     Accounts
  --------------------------------------------------------- */

  const adminPrivKey = generatePrivateKey();
  const adminAccount = privateKeyToAccount(adminPrivKey);


  /* ---------------------------------------------------------
     Setup
  --------------------------------------------------------- */

  beforeEach(async () => {

    /* Registry */
    registry = await viem.deployContract("EthereumDIDRegistry");

    /* Verifiers */
    verifier2 = await viem.deployContract("VerifierM2");
    verifier3 = await viem.deployContract("VerifierM3");
    verifier4 = await viem.deployContract("VerifierM4");

    /* Multisig */
    controller = await viem.deployContract(
      "DIDMultisigController",
      [
        registry.address,
        [taOwner.account.address],
        1n,
      ]
    );

    /* Marketplace */
    marketplace = await viem.deployContract(
      "DigitalAssetMarketplaceStub",
      [controller.address]
    );

    /* Transfer DID ownership to controller */
    await registry.write.changeOwner(
      [company.account.address, controller.address],
      { account: company.account }
    );

    /* Register verifiers */
    await controller.write.setVerifier(
      [2n, verifier2.address],
      { account: taOwner.account }
    );

    await controller.write.setVerifier(
      [3n, verifier3.address],
      { account: taOwner.account }
    );

    await controller.write.setVerifier(
      [4n, verifier4.address],
      { account: taOwner.account }
    );

    // trust anchor adds company admin as delegate of company's did:ethr
    companyAdmins = [adminAccount.address, user1.account.address, user2.account.address, user3.account.address];
    for (const admin of companyAdmins) {
        //add delegate
        const data = encodeFunctionData({
            abi: registry.abi,
            functionName: "addDelegate",
            args: [company.account.address, COMPANY_ADMIN_TYPE, admin, 3600n]
        });
        await controller.write.execCall([registry.address, data], { account: taOwner.account });

        // assert that delegate was added
        const isDelegate = await registry.read.validDelegate([
        company.account.address,
        COMPANY_ADMIN_TYPE,
        admin
        ]);
        assert.equal(isDelegate, true);
    }
  });

  /* =========================================================
     1. Valid group of 4
  ========================================================= */

  it("Group of 4 admins can publish via ZKP", async () => {

    const nonce = 11n;
    const cid = "QmGroup4";

    const proof = await generateProof({
      privKey: adminPrivKey,
      admins: companyAdmins,
      nonce,
      cid,
      company: company.account.address,
      marketplace: marketplace.address,
    });

    const zkInput = {
      marketplace: marketplace.address,
      cid,
      company: company.account.address,
      companyAdmins: companyAdmins,
      inputNonce: nonce,
      ...proof,
    };

    await controller.write.privatelyPublishMarketplaceData(
      [zkInput],
      { account: taOwner.account }
    );

    // assert that data was published (ownership of asset in marketplace)
    const owner = await marketplace.read.assetOwners([0n]);
    assert.equal(owner.toLowerCase(), company.account.address.toLowerCase());
  });


  /* =========================================================
     2. Valid group of 2
  ========================================================= */

  it("Group of 2 admins can publish via ZKP", async () => {

    const nonce = 22n;
    const cid = "QmGroup2";

    const smallAdminGroup = companyAdmins.slice(0, 2);

    const proof = await generateProof({
      privKey: adminPrivKey,
      admins: smallAdminGroup,
      nonce,
      cid,
      company: company.account.address,
      marketplace: marketplace.address,
    });

    const zkInput = {
      marketplace: marketplace.address,
      cid,
      company: company.account.address,
      companyAdmins: smallAdminGroup,
      inputNonce: nonce,
      ...proof,
    };

    await controller.write.privatelyPublishMarketplaceData(
      [zkInput],
      { account: taOwner.account }
    );

    // assert that data was published (ownership of asset in marketplace)
    const owner = await marketplace.read.assetOwners([0n]);
    assert.equal(owner.toLowerCase(), company.account.address.toLowerCase());
  });

  /* =========================================================
     3. Invalid admin
  ========================================================= */

  it("Fails if valid admin includes non-admin (group of 4)", async () => {

    const nonce = 33n;
    const cid = "QmBadAdmin";

    const groupWithBadAdmin = [
      adminAccount.address,
      user1.account.address,
      user2.account.address,
      taOwner.account.address, // not an admin
    ];

    const proof = await generateProof({
      privKey: adminPrivKey,
      admins: groupWithBadAdmin,
      nonce,
      cid,
      company: company.account.address,
      marketplace: marketplace.address,
    });

    const zkInput = {
      marketplace: marketplace.address,
      cid,
      company: company.account.address,
      companyAdmins: groupWithBadAdmin,
      inputNonce: nonce,
      ...proof,
    };

    await assert.rejects(
      controller.write.privatelyPublishMarketplaceData(
        [zkInput],
        { account: taOwner.account }
      ),
      /invalid_company_admin/
    );
  });

/* =========================================================
    4. Invalid signature (Group Membership Failure)
   ========================================================= */
it("Fails if invalid admin attempts to generate a proof for a group they do not belong to", async () => {
    const nonce = 55n;
    const cid = "QmInvalidSig";
    
    // We expect the proof generation itself to fail because of the 
    // circuit constraint: 0 === products[m-1]
    await assert.rejects(
        generateProof({
            privKey: generatePrivateKey(), // A random key not in the 'companyAdmins' list
            admins: companyAdmins,         // The list of valid admins
            nonce,
            cid,
            company: company.account.address,
            marketplace: marketplace.address,
        }),
        // This regex matches the Circom runtime error you received
        /Assert Failed|Error in template Main/ 
    );
});

  /* =========================================================
     5. Nonce Replay
  ========================================================= */

  it("Prevents nonce reuse", async () => {

    const nonce = 44n;
    const cid = "QmReplay";

    const proof = await generateProof({
      privKey: adminPrivKey,
      admins: companyAdmins,
      nonce,
      cid,
      company: company.account.address,
      marketplace: marketplace.address,
    });

    const zkInput = {
      marketplace: marketplace.address,
      cid,
      company: company.account.address,
      companyAdmins: companyAdmins,
      inputNonce: nonce,
      ...proof,
    };

    /* First OK */
    await controller.write.privatelyPublishMarketplaceData(
      [zkInput],
      { account: taOwner.account }
    );

    /* Replay fails */
    await assert.rejects(
      controller.write.privatelyPublishMarketplaceData(
        [zkInput],
        { account: taOwner.account }
      ),
      /nonce_used/
    );
  });


  after(() => {
    setTimeout(() => process.exit(0), 1000);
  });

});