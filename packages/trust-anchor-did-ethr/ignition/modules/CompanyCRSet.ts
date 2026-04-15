import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CompanyCRSetModule", (m) => {
  const owners = m.getParameter("owners", [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
  ]);

  // Deploy the standard Ethereum DID Registry first
  const registry = m.contract("EthereumDIDRegistry");

  // Deploy the Trust Anchor Smart Contract (DIDMultisigController)
  // Arguments: Registry Address, Array of Owners, Quorum (2)
  const multisig = m.contract("DIDMultisigController", [
    registry,
    owners,
    2n // Quorum of 2
  ]);

  // Deploy CompanyCRSetRegistry with multisig as owner
  const crsetRegistry = m.contract("CompanyCRSetRegistry", [multisig]);

  return { registry, multisig, crsetRegistry };
});
