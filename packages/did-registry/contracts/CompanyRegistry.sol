// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DIDRegistry.sol";

/**
Tracks company DIDs and their metadata, including admin relationships and it works alongside DIDRegistry to manage company identities and permissions
 */
contract CompanyRegistry {
    struct Company {
        string name;
        address trustAnchor;
        bool active;
        uint256 registeredAt;
    }
    
    // Storage
    mapping(address => Company) public companies;
    mapping(address => address[]) public companyAdmins;
    mapping(address => mapping(address => bool)) public isAdmin;
    
    address public didRegistry;
    
    // Events
    event CompanyRegistered(
        address indexed companyDID,
        string name,
        address indexed trustAnchor,
        uint256 timestamp
    );
    
    event AdminAdded(
        address indexed companyDID,
        address indexed admin,
        uint256 timestamp
    );
    
    event AdminRemoved(
        address indexed companyDID,
        address indexed admin,
        uint256 timestamp
    );
    
    event CompanyDeactivated(
        address indexed companyDID,
        uint256 timestamp
    );
    
    constructor(address _didRegistry) {
        require(_didRegistry != address(0), "Invalid DIDRegistry address");
        didRegistry = _didRegistry;
    }
    
    // Creates a new company DID entry, with trust anchor ownership. The ownership is transferred in DIDRegistry beforehand
    // this is for registering the company metadata in CompanyRegistry, most importantly the name and trust anchor
    function createCompany(
        address companyDID,
        string memory name,
        address trustAnchor
    ) external {
        require(companyDID != address(0), "Invalid company address");
        require(trustAnchor != address(0), "Invalid trust anchor address");
        require(bytes(name).length > 0, "Company name required");
        require(!companies[companyDID].active, "Company already exists");
        
        // Verify that the trust anchor actually owns this DID
        DIDRegistry registry = DIDRegistry(didRegistry);
        require(
            registry.identityOwner(companyDID) == trustAnchor,
            "Trust anchor does not own this DID"
        );
        
        companies[companyDID] = Company({
            name: name,
            trustAnchor: trustAnchor,
            active: true,
            registeredAt: block.timestamp
        });
        
        emit CompanyRegistered(companyDID, name, trustAnchor, block.timestamp);
    }
    
    //Add an admin to a company, with company DID and admin address
    // similar to createCompany, this is for bookkeeping purposes. Actual access control happens in DIDRegistry using delegates. This function exist to help querying, as DIDRegistry stores delegates in a mapping which is not iterable
    

    function addAdmin(address companyDID, address admin) external {
        require(companies[companyDID].active, "Company does not exist");
        require(admin != address(0), "Invalid admin address");
        require(!isAdmin[companyDID][admin], "Admin already exists");
        
        // Verify admin is actually a delegate in DIDRegistry
        DIDRegistry registry = DIDRegistry(didRegistry);
        require(
            registry.validDelegate(companyDID, keccak256("veriKey"), admin) ||
            registry.validDelegate(companyDID, keccak256("serviceAdmin"), admin),
            "Admin must be a valid delegate in DIDRegistry"
        );
        
        companyAdmins[companyDID].push(admin);
        isAdmin[companyDID][admin] = true;
        
        emit AdminAdded(companyDID, admin, block.timestamp);
    }
    
    //Removes an admin from a company

    function removeAdmin(address companyDID, address admin) external {
        require(companies[companyDID].active, "Company does not exist");
        require(isAdmin[companyDID][admin], "Admin does not exist");
        
        // Only trust anchor can remove admins!
        require(
            msg.sender == companies[companyDID].trustAnchor,
            "Only trust anchor can remove admins"
        );
        
        isAdmin[companyDID][admin] = false;
        
        // Remove from array (swap with last and pop)
        address[] storage admins = companyAdmins[companyDID];
        for (uint256 i = 0; i < admins.length; i++) {
            if (admins[i] == admin) {
                admins[i] = admins[admins.length - 1];
                admins.pop();
                break;
            }
        }
        
        emit AdminRemoved(companyDID, admin, block.timestamp);
    }
    
    function deactivateCompany(address companyDID) external {
        require(companies[companyDID].active, "Company does not exist");
        require(
            msg.sender == companies[companyDID].trustAnchor,
            "Only trust anchor can deactivate"
        );
        
        companies[companyDID].active = false;
        emit CompanyDeactivated(companyDID, block.timestamp);
    }
    
    //Gets company information, company struct with metadata

    function getCompany(address companyDID) external view returns (Company memory) {
        return companies[companyDID];
    }
    
    // get all admins of a company
    function getAdmins(address companyDID) external view returns (address[] memory) {
        return companyAdmins[companyDID];
    }
    
    // check if an address is an admin of a company
    function isCompanyAdmin(address companyDID, address admin) external view returns (bool) {
        return isAdmin[companyDID][admin];
    }
}
