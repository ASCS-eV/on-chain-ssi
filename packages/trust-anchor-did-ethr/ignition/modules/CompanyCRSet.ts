import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import TrustAnchorModule from "./TrustAnchor.js";

export default buildModule("CompanyCRSetModule", (m) => {
  // Get the multisig from TrustAnchor deployment
  const { multisig } = m.useModule(TrustAnchorModule);

  // Deploy CompanyCRSetRegistry with multisig as owner
  const crsetRegistry = m.contract("CompanyCRSetRegistry", [multisig]);

  return { crsetRegistry };
});
