import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", await deployer.getAddress());
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const DIDRegistryFactory = await ethers.getContractFactory("DIDRegistry");
  const didRegistry = await DIDRegistryFactory.deploy();
  await didRegistry.waitForDeployment();
  const didRegistryAddress = await didRegistry.getAddress();
  console.log("DIDRegistry:", didRegistryAddress);

  const CompanyRegistryFactory = await ethers.getContractFactory("CompanyRegistry");
  const companyRegistry = await CompanyRegistryFactory.deploy(didRegistryAddress);
  await companyRegistry.waitForDeployment();
  const companyRegistryAddress = await companyRegistry.getAddress();
  console.log("CompanyRegistry:", companyRegistryAddress);

  const MockTrustAnchorFactory = await ethers.getContractFactory("MockTrustAnchor");
  const mockTrustAnchor = await MockTrustAnchorFactory.deploy(
    didRegistryAddress,
    companyRegistryAddress
  );
  await mockTrustAnchor.waitForDeployment();
  const mockTrustAnchorAddress = await mockTrustAnchor.getAddress();
  console.log("MockTrustAnchor:", mockTrustAnchorAddress);

  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: await deployer.getAddress(),
    timestamp: new Date().toISOString(),
    contracts: {
      DIDRegistry: didRegistryAddress,
      CompanyRegistry: companyRegistryAddress,
      MockTrustAnchor: mockTrustAnchorAddress
    }
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const filename = `deployment-${deploymentInfo.network}-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  fs.writeFileSync(
    path.join(deploymentsDir, `deployment-${deploymentInfo.network}-latest.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\nDeployment saved to:", filename);
  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:");
    console.error(error);
    process.exit(1);
  });
