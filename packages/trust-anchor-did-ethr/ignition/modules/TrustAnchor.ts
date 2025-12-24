import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("TrustAnchorModule", (m) => {
  // 1. Deploy the standard Ethereum DID Registry first
  const registry = m.contract("EthereumDIDRegistry");

  // 2. Define our Trust Anchor Admins (using default Hardhat test accounts)
  // Account #0, #1, #2
  const owners = [
    "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"
  ];

  // 3. Deploy the Trust Anchor Smart Contract (DIDMultisigController)
  // Arguments: Registry Address, Array of Owners, Quorum (2)
  const multisig = m.contract("DIDMultisigController", [
    registry,
    owners,
    2n // Quorum of 2
  ]);

  return { registry, multisig };
});