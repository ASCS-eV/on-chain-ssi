import { expect } from "chai";
import { ethers } from "hardhat";
import { DIDRegistry, CompanyRegistry, MockTrustAnchor } from "../typechain-types";
import { Signer } from "ethers";

describe("Company DID Management System", function () {
  let didRegistry: DIDRegistry;
  let companyRegistry: CompanyRegistry;
  let mockTrustAnchor: MockTrustAnchor;
  
  let owner: Signer;
  let companyDID: Signer;
  let admin1: Signer;
  let admin2: Signer;
  let randomUser: Signer;
  
  let companyAddress: string;
  let admin1Address: string;
  let admin2Address: string;
  let randomUserAddress: string;

  beforeEach(async function () {
    // Get signers
    [owner, companyDID, admin1, admin2, randomUser] = await ethers.getSigners();
    companyAddress = await companyDID.getAddress();
    admin1Address = await admin1.getAddress();
    admin2Address = await admin2.getAddress();
    randomUserAddress = await randomUser.getAddress();

    // Deploy DIDRegistry
    const DIDRegistryFactory = await ethers.getContractFactory("DIDRegistry");
    didRegistry = await DIDRegistryFactory.deploy();
    await didRegistry.waitForDeployment();

    // Deploy CompanyRegistry
    const CompanyRegistryFactory = await ethers.getContractFactory("CompanyRegistry");
    companyRegistry = await CompanyRegistryFactory.deploy(await didRegistry.getAddress());
    await companyRegistry.waitForDeployment();

    // Deploy MockTrustAnchor
    const MockTrustAnchorFactory = await ethers.getContractFactory("MockTrustAnchor");
    mockTrustAnchor = await MockTrustAnchorFactory.deploy(
      await didRegistry.getAddress(),
      await companyRegistry.getAddress()
    );
    await mockTrustAnchor.waitForDeployment();
  });

  describe("1. Company Creation", function () {
    it("Should allow trust anchor to register a company DID", async function () {
      //first step is company identity transfers ownership to trust anchor
      await didRegistry.connect(companyDID).changeOwner(
        companyAddress,
        await mockTrustAnchor.getAddress()
      );
      
      // Verify ownership in DIDRegistry
      const owner = await didRegistry.identityOwner(companyAddress);
      expect(owner).to.equal(await mockTrustAnchor.getAddress());
    });

    it("Should create company metadata in CompanyRegistry", async function () {
      await didRegistry.connect(companyDID).changeOwner(
        companyAddress,
        await mockTrustAnchor.getAddress()
      );
      
      await companyRegistry.createCompany(
        companyAddress,
        "Test Company Ltd",
        await mockTrustAnchor.getAddress()
      );
      
      const company = await companyRegistry.getCompany(companyAddress);
      expect(company.name).to.equal("Test Company Ltd");
      expect(company.trustAnchor).to.equal(await mockTrustAnchor.getAddress());
      expect(company.active).to.be.true;
    });

    it("Should reject company creation if trust anchor doesn't own the DID", async function () {
      // Try to register without transferring ownership first, should fail
      await expect(
        companyRegistry.createCompany(
          companyAddress,
          "Test Company Ltd",
          await mockTrustAnchor.getAddress()
        )
      ).to.be.revertedWith("Trust anchor does not own this DID");
    });

    it("Should reject duplicate company registration", async function () {
      await didRegistry.connect(companyDID).changeOwner(
        companyAddress,
        await mockTrustAnchor.getAddress()
      );
      await companyRegistry.createCompany(
        companyAddress,
        "Test Company Ltd",
        await mockTrustAnchor.getAddress()
      );
      
      await expect(
        companyRegistry.createCompany(
          companyAddress,
          "Another Name",
          await mockTrustAnchor.getAddress()
        )
      ).to.be.revertedWith("Company already exists");
    });
  });

  describe("2. Admin Management", function () {
    beforeEach(async function () {
      // Setup: Register company
      await didRegistry.connect(companyDID).changeOwner(
        companyAddress,
        await mockTrustAnchor.getAddress()
      );
      await companyRegistry.createCompany(
        companyAddress,
        "Test Company Ltd",
        await mockTrustAnchor.getAddress()
      );
    });

    // veriKey delegate: Admin is registered as delegate on company DID (read-only access)
    // This does NOT give admin permission to edit company attributes - they're just listed as an admin
    it("Should add admin as veriKey delegate on company DID via trust anchor", async function () {
      const validity = 365 * 24 * 60 * 60; // 1 year
      await mockTrustAnchor.addCompanyAdmin(companyAddress, admin1Address, validity);
      
      const isDelegate = await didRegistry.validDelegate(
        companyAddress,
        ethers.keccak256(ethers.toUtf8Bytes("veriKey")),
        admin1Address
      );
      expect(isDelegate).to.be.true;
    });

    it("Should track admin in CompanyRegistry", async function () {
      const validity = 365 * 24 * 60 * 60;
      await mockTrustAnchor.addCompanyAdmin(companyAddress, admin1Address, validity);
      await companyRegistry.addAdmin(companyAddress, admin1Address);
      
      const admins = await companyRegistry.getAdmins(companyAddress);
      expect(admins).to.include(admin1Address);
      
      const isAdmin = await companyRegistry.isCompanyAdmin(companyAddress, admin1Address);
      expect(isAdmin).to.be.true;
    });

    it("Should reject admin addition if not a valid delegate", async function () {
      await expect(
        companyRegistry.addAdmin(companyAddress, admin1Address)
      ).to.be.revertedWith("Admin must be a valid delegate in DIDRegistry");
    });

    it("Should support multiple admins", async function () {
      const validity = 365 * 24 * 60 * 60;
      
      await mockTrustAnchor.addCompanyAdmin(companyAddress, admin1Address, validity);
      await companyRegistry.addAdmin(companyAddress, admin1Address);
      
      await mockTrustAnchor.addCompanyAdmin(companyAddress, admin2Address, validity);
      await companyRegistry.addAdmin(companyAddress, admin2Address);
      
      const admins = await companyRegistry.getAdmins(companyAddress);
      expect(admins).to.have.lengthOf(2);
      expect(admins).to.include(admin1Address);
      expect(admins).to.include(admin2Address);
    });

    it("Should allow admin to manage their own DID document (self-sovereign)", async function () {
      const validity = 365 * 24 * 60 * 60;
      
      // Scenario: Admin has their own did:ethr DID and can edit it
      // Admin manages their own CRSet (credential revocation status) using IPFS
      // 
      // Note: DIDRegistry is generic, the same contract can handle both company DIDs and admin DIDs.
      // Nothing in the contract distinguishes between them; admin DIDs are just regular DIDs
      // where the admin owns their own address (self-sovereign), unlike companies owned by TA.
      // this means the revocation list service endpoint can both be added as a company attribute, or as an admin attribute. This offers flexibility, depending on how we want to structure it.
      
      // Step 1: Admin has self sovereignty by default (owns their own DID)
      const adminOwner = await didRegistry.identityOwner(admin1Address);
      expect(adminOwner).to.equal(admin1Address); // Admin owns themselves
      
      // Step 2: Trust Anchor adds admin as delegate on company DID
      // Only TA can do this because TA owns the company DID
      await mockTrustAnchor.addCompanyAdmin(companyAddress, admin1Address, validity);
      await companyRegistry.addAdmin(companyAddress, admin1Address);
      
      // Step 3: Verify admin is properly registered as company delegate
      const isAdmin = await companyRegistry.isCompanyAdmin(companyAddress, admin1Address);
      expect(isAdmin).to.be.true;
      
      // Step 4: Admin updates their own DID document (like CRSet for issued VCs)
      const crsetAttribute = ethers.keccak256(ethers.toUtf8Bytes("credentialRevocationSet"));
      const ipfsCID = ethers.toUtf8Bytes("QmAdminCRSet123xyz");
      
      // Admin edits their own DID (self-sovereign)
      await didRegistry.connect(admin1).setAttribute(
        admin1Address,  // Admin's own DID
        crsetAttribute, 
        ipfsCID, 
        validity
      );
      
      // Step 5: Verify admin successfully updated their own DID
      const adminAttr = await didRegistry.getAttribute(admin1Address, crsetAttribute);
      expect(ethers.toUtf8String(adminAttr)).to.equal("QmAdminCRSet123xyz");
      
      // Step 6: Verify admin CANNOT update company DID attributes (only delegates, no setAttribute rights)
      const companyAttribute = ethers.keccak256(ethers.toUtf8Bytes("companyName"));
      await expect(
        didRegistry.connect(admin1).setAttribute(
          companyAddress,  // Company DID (owned by TA)
          companyAttribute,
          ethers.toUtf8Bytes("Unauthorized Change"),
          validity
        )
      ).to.be.revertedWith("Not authorized to set this attribute");
      
      // This demonstrates: Admins are self-sovereign for their own DIDs
      // but cannot modify company DID documents, like said in miro board
    });


    it("Should allow TA's admins to edit admin DID document for coordinated management", async function () {
      const validity = 365 * 24 * 60 * 60;
      const trustAnchorAddress = await mockTrustAnchor.getAddress();
      
      // Scenario: From requirements - "Allows trust anchor's admins to edit its DID document"
      // Admin grants TA serviceAdmin access to edit service-related attributes (e.g., CRSet endpoint)
      // This enables coordinated key/CRSet management while admin retains ownership
      // IMPORTANT NOTE: This test and the previous test serve the purpose of filling the (soft) requiremnt "admins can edit its DID document". This comes with a constraint in the implementation; having both the admin itself and the trust anchor being able to edit the admin DID document is only possible when one has ownership, and the other is a delegate. Since the delegates are designed to only have permission for editing serviceEndpoints, 
      // if the admin itself remains as its DID owner, the trust anchor can only be a delegate with serviceAdmin rights. This means the trust anchor's admins can edit serviceEndpoints, but not other attributes. If full editing rights were desired for both parties, we need additional delegation types. OR we proceed with no self soverngty, meaning TA controls admin DID documents completely. OR owner remains TA, admin remains delegate with serviceAdmin rights; useful if CRSet endpoint is stored within admin DID document, irrelevant if CRset endpoint is stored within company DID document.
      
    // this test is for the scenario where TA admins can (only) edit admin serviceEndpoint while admin retains ownership (self-sovereign)

      // Step 1: Verify admin is self-sovereign
      const adminOwner = await didRegistry.identityOwner(admin1Address);
      expect(adminOwner).to.equal(admin1Address);
      
      // Step 2: Admin grants TA serviceAdmin delegate on their own DID
      // This allows TA to update service endpoints (like CRSet location) on admin's DID
      await didRegistry.connect(admin1).addDelegate(
        admin1Address,  // Admin's own DID
        ethers.keccak256(ethers.toUtf8Bytes("serviceAdmin")),
        trustAnchorAddress,  // TA becomes serviceAdmin delegate
        validity
      );
      
      // Step 3: Verify TA is now a serviceAdmin delegate on admin's DID
      const isTAServiceAdmin = await didRegistry.validDelegate(
        admin1Address,
        ethers.keccak256(ethers.toUtf8Bytes("serviceAdmin")),
        trustAnchorAddress
      );
      expect(isTAServiceAdmin).to.be.true;
      
      // Step 4: TA (as serviceAdmin delegate) can update admin's service endpoint
      // Example: TA updates the CRSet location in admin's DID document
      const serviceEndpointKey = ethers.keccak256(ethers.toUtf8Bytes("serviceEndpoint"));
      const crsetLocation = ethers.toUtf8Bytes("https://ipfs.io/ipfs/QmTACRSet123");
      
      // Impersonate TA to update admin's DID
      await ethers.provider.send("hardhat_impersonateAccount", [trustAnchorAddress]);
      await ethers.provider.send("hardhat_setBalance", [
        trustAnchorAddress,
        ethers.toQuantity(ethers.parseEther("1.0"))
      ]);
      const trustAnchorSigner = await ethers.getSigner(trustAnchorAddress);
      
      await didRegistry.connect(trustAnchorSigner).setAttribute(
        admin1Address,  // Admin's DID (TA updating it as serviceAdmin)
        serviceEndpointKey,
        crsetLocation,
        validity
      );
      
      await ethers.provider.send("hardhat_stopImpersonatingAccount", [trustAnchorAddress]);
      
      // Step 5: Verify TA successfully updated admin's service endpoint
      const adminServiceEndpoint = await didRegistry.getAttribute(admin1Address, serviceEndpointKey);
      expect(ethers.toUtf8String(adminServiceEndpoint)).to.equal("https://ipfs.io/ipfs/QmTACRSet123");
      
      // Step 6: Admin still retains ownership and can update their own DID
      const crsetAttribute = ethers.keccak256(ethers.toUtf8Bytes("credentialRevocationSet"));
      await didRegistry.connect(admin1).setAttribute(
        admin1Address,
        crsetAttribute,
        ethers.toUtf8Bytes("QmAdminManagedCRSet"),
        validity
      );
      
      const adminAttr = await didRegistry.getAttribute(admin1Address, crsetAttribute);
      expect(ethers.toUtf8String(adminAttr)).to.equal("QmAdminManagedCRSet");
      
    });
  });

  describe("3. Service Admin Permissions (CRITICAL)", function () {
    const serviceEndpointKey = ethers.keccak256(ethers.toUtf8Bytes("serviceEndpoint"));
    const otherAttributeKey = ethers.keccak256(ethers.toUtf8Bytes("otherAttribute"));
    const validity = 365 * 24 * 60 * 60;

    beforeEach(async function () {
      // Setup: Register company and add admin
      await didRegistry.connect(companyDID).changeOwner(
        companyAddress,
        await mockTrustAnchor.getAddress()
      );
      await companyRegistry.createCompany(
        companyAddress,
        "Test Company Ltd",
        await mockTrustAnchor.getAddress()
      );
      
      await mockTrustAnchor.addCompanyAdmin(companyAddress, admin1Address, validity);
      await companyRegistry.addAdmin(companyAddress, admin1Address);
    });

    it("Should allow owner (trust anchor) to update service endpoint", async function () {
      const ipfsCID = ethers.toUtf8Bytes("QmTest123456789");
      
      await mockTrustAnchor.setCompanyAttribute(
        companyAddress,
        serviceEndpointKey,
        ipfsCID,
        validity
      );
      
      const value = await didRegistry.getAttribute(companyAddress, serviceEndpointKey);
      expect(ethers.toUtf8String(value)).to.equal("QmTest123456789");
    });

    it("Should allow serviceAdmin delegate to update service endpoint", async function () {
      // Grant serviceAdmin role
      await mockTrustAnchor.grantServiceAdmin(companyAddress, admin1Address, validity);
      
      // Admin updates service endpoint
      const ipfsCID = ethers.toUtf8Bytes("QmAdmin789UpdatedCID");
      await didRegistry.connect(admin1).setAttribute(
        companyAddress,
        serviceEndpointKey,
        ipfsCID,
        validity
      );
      
      const value = await didRegistry.getAttribute(companyAddress, serviceEndpointKey);
      expect(ethers.toUtf8String(value)).to.equal("QmAdmin789UpdatedCID");
    });

    it("Should reject random user updating service endpoint", async function () {
      const ipfsCID = ethers.toUtf8Bytes("QmUnauthorized");
      
      await expect(
        didRegistry.connect(randomUser).setAttribute(
          companyAddress,
          serviceEndpointKey,
          ipfsCID,
          validity
        )
      ).to.be.revertedWith("Not authorized to set this attribute");
    });

    it("Should reject serviceAdmin updating non-service attributes", async function () {
      // Grant serviceAdmin role
      await mockTrustAnchor.grantServiceAdmin(companyAddress, admin1Address, validity);
      
      // Try to update a different attribute
      const value = ethers.toUtf8Bytes("someValue");
      await expect(
        didRegistry.connect(admin1).setAttribute(
          companyAddress,
          otherAttributeKey,
          value,
          validity
        )
      ).to.be.revertedWith("Not authorized to set this attribute");
    });

    it("Should allow veriKey admin to update service endpoint if also granted serviceAdmin", async function () {
      // Admin already has veriKey, now grant serviceAdmin
      await mockTrustAnchor.grantServiceAdmin(companyAddress, admin1Address, validity);
      
      const ipfsCID = ethers.toUtf8Bytes("QmVeriKeyAdmin");
      await didRegistry.connect(admin1).setAttribute(
        companyAddress,
        serviceEndpointKey,
        ipfsCID,
        validity
      );
      
      const value = await didRegistry.getAttribute(companyAddress, serviceEndpointKey);
      expect(ethers.toUtf8String(value)).to.equal("QmVeriKeyAdmin");
    });

    it("Should reject veriKey admin without serviceAdmin role", async function () {
      // Admin has veriKey but NOT serviceAdmin
      const ipfsCID = ethers.toUtf8Bytes("QmShouldFail");
      
      await expect(
        didRegistry.connect(admin1).setAttribute(
          companyAddress,
          serviceEndpointKey,
          ipfsCID,
          validity
        )
      ).to.be.revertedWith("Not authorized to set this attribute");
    });

    it("Should maintain ERC-1056 event compliance", async function () {
      await mockTrustAnchor.grantServiceAdmin(companyAddress, admin1Address, validity);
      
      const ipfsCID = ethers.toUtf8Bytes("QmEventTest");
      const previousChange = await didRegistry.changed(companyAddress);
      
      const tx = await didRegistry.connect(admin1).setAttribute(
        companyAddress,
        serviceEndpointKey,
        ipfsCID,
        validity
      );
      
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const expectedValidTo = block!.timestamp + validity;
      
      await expect(tx)
        .to.emit(didRegistry, "DIDAttributeChanged")
        .withArgs(
          companyAddress,
          serviceEndpointKey,
          ipfsCID,
          expectedValidTo,
          previousChange
        );
    });
  });

  describe("4. Full Integration Flow", function () {
    it("Should complete end-to-end company DID lifecycle", async function () {
      const validity = 365 * 24 * 60 * 60;
      const serviceEndpointKey = ethers.keccak256(ethers.toUtf8Bytes("serviceEndpoint"));

      // Step 1: Company transfers ownership to trust anchor
      await didRegistry.connect(companyDID).changeOwner(
        companyAddress,
        await mockTrustAnchor.getAddress()
      );
      await companyRegistry.createCompany(companyAddress, "Complete Test Company", await mockTrustAnchor.getAddress());
      expect(await didRegistry.identityOwner(companyAddress)).to.equal(
        await mockTrustAnchor.getAddress()
      );

      // Step 2: Verify company metadata
      const company = await companyRegistry.getCompany(companyAddress);
      expect(company.name).to.equal("Complete Test Company");
      expect(company.active).to.be.true;

      // Step 3: Add admins
      await mockTrustAnchor.addCompanyAdmin(companyAddress, admin1Address, validity);
      await companyRegistry.addAdmin(companyAddress, admin1Address);
      
      await mockTrustAnchor.addCompanyAdmin(companyAddress, admin2Address, validity);
      await companyRegistry.addAdmin(companyAddress, admin2Address);
      
      const admins = await companyRegistry.getAdmins(companyAddress);
      expect(admins).to.have.lengthOf(2);

      // Step 4: Grant serviceAdmin to first admin
      await mockTrustAnchor.grantServiceAdmin(companyAddress, admin1Address, validity);
      expect(
        await didRegistry.validDelegate(
          companyAddress,
          ethers.keccak256(ethers.toUtf8Bytes("serviceAdmin")),
          admin1Address
        )
      ).to.be.true;

      // Step 5: Admin updates service endpoint
      const initialCID = ethers.toUtf8Bytes("QmInitialRevocationList");
      await didRegistry.connect(admin1).setAttribute(
        companyAddress,
        serviceEndpointKey,
        initialCID,
        validity
      );
      
      let value = await didRegistry.getAttribute(companyAddress, serviceEndpointKey);
      expect(ethers.toUtf8String(value)).to.equal("QmInitialRevocationList");

      // Step 6: Admin updates service endpoint again (simulating revocation list update)
      const updatedCID = ethers.toUtf8Bytes("QmUpdatedRevocationList");
      await didRegistry.connect(admin1).setAttribute(
        companyAddress,
        serviceEndpointKey,
        updatedCID,
        validity
      );
      
      value = await didRegistry.getAttribute(companyAddress, serviceEndpointKey);
      expect(ethers.toUtf8String(value)).to.equal("QmUpdatedRevocationList");

      // Step 7: Verify second admin cannot update without serviceAdmin role
      await expect(
        didRegistry.connect(admin2).setAttribute(
          companyAddress,
          serviceEndpointKey,
          ethers.toUtf8Bytes("QmUnauthorized"),
          validity
        )
      ).to.be.revertedWith("Not authorized to set this attribute");
    });

    it("Should handle admin removal correctly", async function () {
      const validity = 365 * 24 * 60 * 60;

      await didRegistry.connect(companyDID).changeOwner(
        companyAddress,
        await mockTrustAnchor.getAddress()
      );
      await companyRegistry.createCompany(companyAddress, "Test Company", await mockTrustAnchor.getAddress());

      await mockTrustAnchor.addCompanyAdmin(companyAddress, admin1Address, validity);
      await companyRegistry.addAdmin(companyAddress, admin1Address);

      // Impersonate trust anchor to remove admin
      const trustAnchorAddress = await mockTrustAnchor.getAddress();
      await ethers.provider.send("hardhat_impersonateAccount", [trustAnchorAddress]);
      await ethers.provider.send("hardhat_setBalance", [trustAnchorAddress, ethers.toQuantity(ethers.parseEther("1.0"))]);
      const trustAnchorSigner = await ethers.getSigner(trustAnchorAddress);
      
      await companyRegistry.connect(trustAnchorSigner).removeAdmin(companyAddress, admin1Address);
      await ethers.provider.send("hardhat_stopImpersonatingAccount", [trustAnchorAddress]);

      // Also revoke in DIDRegistry
      await mockTrustAnchor.revokeDelegate(
        companyAddress,
        ethers.keccak256(ethers.toUtf8Bytes("veriKey")),
        admin1Address
      );

      const isAdmin = await companyRegistry.isCompanyAdmin(companyAddress, admin1Address);
      expect(isAdmin).to.be.false;

      const admins = await companyRegistry.getAdmins(companyAddress);
      expect(admins).to.not.include(admin1Address);
    });
  });

  describe("5. Edge Cases and Security", function () {
    it("Should prevent non-owner from changing company DID ownership", async function () {
      await didRegistry.connect(companyDID).changeOwner(
        companyAddress,
        await mockTrustAnchor.getAddress()
      );
      await companyRegistry.createCompany(companyAddress, "Test Company Ltd", await mockTrustAnchor.getAddress());
      
      await expect(
        didRegistry.connect(randomUser).changeOwner(companyAddress, randomUserAddress)
      ).to.be.revertedWith("Not authorized");
    });

    it("Should handle expired delegates correctly", async function () {
      // probably we dont needed to have timed delegates, but just in case
      await didRegistry.connect(companyDID).changeOwner(
        companyAddress,
        await mockTrustAnchor.getAddress()
      );
      await companyRegistry.createCompany(companyAddress, "Test Company Ltd", await mockTrustAnchor.getAddress());
      
      // Add admin with 1 second validity
      await mockTrustAnchor.addCompanyAdmin(companyAddress, admin1Address, 1);
      
      expect(
        await didRegistry.validDelegate(
          companyAddress,
          ethers.keccak256(ethers.toUtf8Bytes("veriKey")),
          admin1Address
        )
      ).to.be.true;
      
      // Wait for expiration
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);
      
      expect(
        await didRegistry.validDelegate(
          companyAddress,
          ethers.keccak256(ethers.toUtf8Bytes("veriKey")),
          admin1Address
        )
      ).to.be.false;
    });

    it("Should handle expired attributes correctly", async function () {
      await didRegistry.connect(companyDID).changeOwner(
        companyAddress,
        await mockTrustAnchor.getAddress()
      );
      await companyRegistry.createCompany(companyAddress, "Test Company Ltd", await mockTrustAnchor.getAddress());
      
      const serviceEndpointKey = ethers.keccak256(ethers.toUtf8Bytes("serviceEndpoint"));
      const ipfsCID = ethers.toUtf8Bytes("QmTestCID");
      
      // Set attribute with 1 second validity, probably dont need timed attributes
      await mockTrustAnchor.setCompanyAttribute(companyAddress, serviceEndpointKey, ipfsCID, 1);
      
      let value = await didRegistry.getAttribute(companyAddress, serviceEndpointKey);
      expect(ethers.toUtf8String(value)).to.equal("QmTestCID");
      
      // Wait for expiration
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);
      
      value = await didRegistry.getAttribute(companyAddress, serviceEndpointKey);
      expect(value).to.equal("0x");
    });

    it("Should prevent zero addresses in critical functions", async function () {
      await expect(
        companyRegistry.createCompany(ethers.ZeroAddress, "Test", await mockTrustAnchor.getAddress())
      ).to.be.revertedWith("Invalid company address");
      
      await didRegistry.connect(companyDID).changeOwner(
        companyAddress,
        await mockTrustAnchor.getAddress()
      );
      await companyRegistry.createCompany(companyAddress, "Test Company Ltd", await mockTrustAnchor.getAddress());
      
      await expect(
        mockTrustAnchor.addCompanyAdmin(companyAddress, ethers.ZeroAddress, 365 * 24 * 60 * 60)
      ).to.be.revertedWith("Invalid admin address");
    });
  });
});
