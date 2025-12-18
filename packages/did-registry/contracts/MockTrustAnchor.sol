// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DIDRegistry.sol";
import "./CompanyRegistry.sol";

/*
PLACEHOLDER for multi-sig trust anchor governance contract
 Responsibilities:
 - Manage Trust Anchor's own governance
 - Execute privileged operations on behalf of companies it owns
 - NO internal state - just wraps calls to DIDRegistry and CompanyRegistry
 */

 // NOTE: This wrapper contract is NOT strictly necessary, as the trust anchor could directly call DIDRegistry and CompanyRegistry.
 // This contract could become useful if we proceed to add governance features for the trust anchor itself.
 // For now, it mainly serves as an abstraction layer for trust anchor operations.
contract MockTrustAnchor {
    address public didRegistryAddress;
    address public companyRegistryAddress;
    
    event AdminGranted(
        address indexed companyDID,
        address indexed admin,
        string role,
        uint256 validity
    );
    
    constructor(address _didRegistry, address _companyRegistry) {
        require(_didRegistry != address(0), "Invalid DIDRegistry address");
        require(_companyRegistry != address(0), "Invalid CompanyRegistry address");
        didRegistryAddress = _didRegistry;
        companyRegistryAddress = _companyRegistry;
    }
    
    // two different admin roles can be granted: veriKey and serviceAdmin, only one could suffice depending on use case

    function addCompanyAdmin(
        address companyDID,
        address admin,
        uint256 validity
    ) external {
        _verifyCompanyOwnership(companyDID);
        require(admin != address(0), "Invalid admin address");
        
        // Add admin as veriKey delegate in DIDRegistry
        DIDRegistry(didRegistryAddress).addDelegate(
            companyDID,
            keccak256("veriKey"),
            admin,
            validity
        );
        
        emit AdminGranted(companyDID, admin, "veriKey", validity);
    }
    

    // this is the role that can update serviceEndpoint attributes, (the revocation list CID) 
    function grantServiceAdmin(
        address companyDID,
        address admin,
        uint256 validity
    ) external {
        _verifyCompanyOwnership(companyDID);
        require(admin != address(0), "Invalid admin address");
        
        // Add admin as serviceAdmin delegate in DIDRegistry
        DIDRegistry(didRegistryAddress).addDelegate(
            companyDID,
            keccak256("serviceAdmin"),
            admin,
            validity
        );
        
        emit AdminGranted(companyDID, admin, "serviceAdmin", validity);
    }
    

    function revokeDelegate(
        address companyDID,
        bytes32 delegateType,
        address delegate
    ) external {
        _verifyCompanyOwnership(companyDID);
        
        DIDRegistry(didRegistryAddress).revokeDelegate(companyDID, delegateType, delegate);
    }
    

    function setCompanyAttribute(
        address companyDID,
        bytes32 name,
        bytes calldata value,
        uint256 validity
    ) external {
        _verifyCompanyOwnership(companyDID);
        
        DIDRegistry(didRegistryAddress).setAttribute(companyDID, name, value, validity);
    }
    
    // Transfer ownership of a company DID to a new trust anchor
    function transferCompanyOwnership(address companyDID, address newOwner) external {
        _verifyCompanyOwnership(companyDID);
        require(newOwner != address(0), "Invalid new owner address");
        
        DIDRegistry(didRegistryAddress).changeOwner(companyDID, newOwner);
    }
    
    // Internal helper to verify this TA owns a company DID
    function _verifyCompanyOwnership(address companyDID) internal view {
        require(
            DIDRegistry(didRegistryAddress).identityOwner(companyDID) == address(this),
            "Trust anchor does not own this company DID"
        );
    }
}
