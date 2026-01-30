import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";
import { keccak256, encodePacked, toHex, encodeFunctionData } from "viem";

describe("DIDMultisigController – publishMarketplaceData (delegated)", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  const [
    taOwner,
    company,
    companyAdmin,
    randomUser
  ] = await viem.getWalletClients();

  let registry: any;
  let multisig: any;
  let marketplace: any;

  const COMPANY_ADMIN_TYPE = keccak256(toHex("CompanyAdmin"));

  beforeEach(async () => {
    // deploy contracts
    registry = await viem.deployContract("EthereumDIDRegistry"); //did:ethr contract
    multisig = await viem.deployContract("DIDMultisigController", [
      registry.address,
      [taOwner.account.address],
      1n
    ]);
    marketplace = await viem.deployContract(
      "DigitalAssetMarketplaceStub",
      [multisig.address]
    );

    // create company did:ethr identity and assign trust anchor multisig contract as owner
    await registry.write.changeOwner(
      [company.account.address, multisig.address],
      { account: company.account }
    );

    // trust anchor adds company admin as delegate of company's did:ethr
    const data = encodeFunctionData({
      abi: registry.abi,
      functionName: "addDelegate",
      args: [company.account.address, COMPANY_ADMIN_TYPE, companyAdmin.account.address, 3600n]
    });
    await multisig.write.execCall([registry.address, data], { account: taOwner.account });


    // assert that delegate was added
    const isDelegate = await registry.read.validDelegate([
      company.account.address,
      COMPANY_ADMIN_TYPE,
      companyAdmin.account.address
    ]);
    assert.equal(isDelegate, true);
  });

  it("Trust Anchor can publish on behalf of company with valid signature", async () => {
    const data = "QmDelegatedAsset";

    const messageHash = keccak256(
      encodePacked(
        ["address", "string", "address"],
        [marketplace.address, data, company.account.address]
      )
    );

    const signature = await companyAdmin.signMessage({
      message: { raw: messageHash }
    });

    await multisig.write.publishMarketplaceData(
      [marketplace.address, data, company.account.address, signature],
      { account: taOwner.account }
    );

    const owner = await marketplace.read.assetOwners([0n]);
    assert.equal(owner.toLowerCase(), company.account.address.toLowerCase());
  });

  it("Fails if signer is not company admin", async () => {
    const data = "InvalidSignerAsset";;

    const badSig = await randomUser.signMessage({
      message: { raw: keccak256(toHex("bad")) }
    });

    await assert.rejects(
      multisig.write.publishMarketplaceData(
        [marketplace.address, data, company.account.address, badSig],
        { account: taOwner.account }
      ),
      /signer_not_company_admin/
    );
  });

  it("Non Trust Anchor cannot publish even with valid signature from valid company admin", async () => {
    const data = "UnauthorizedTA";

    const messageHash = keccak256(
      encodePacked(
        ["address", "string", "address"],
        [marketplace.address, data, company.account.address]
      )
    );

    const signature = await companyAdmin.signMessage({
      message: { raw: messageHash }
    });

    await assert.rejects(
      multisig.write.publishMarketplaceData(
        [marketplace.address, data, company.account.address, signature],
        { account: randomUser.account }
      ),
      /not_owner/
    );
  });
});
