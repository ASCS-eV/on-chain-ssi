// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// CompanyCRSetRegisty Manages credential revocation set (CRSet) IPFS CIDs for companies. Can handle extended metadata in future, like company name, admins list, etc.
// Enables joint management by company admins, owned by Trust Anchor multisig.

/* Workflow:
 1. Trust Anchor deploys this contract, and multisig becomes the owner
 2. TA adds company admins via addCompanyAdmin()
 3. Company admins update their CRSet CID via updateRevocationCID()
 4. TA service listens to RevocationCIDUpdated events 
 5. TA service updates the DID document's service section accordingly

 NO NEED for admins to touch the DID document directly! Admins interact with this contract instead.
 */
contract CompanyCRSetRegistry {
    // Storage

    //Trust Anchor multisig is owner
    address public owner;

    //Maps company DID address to current revocation list CID, CID points to IPFS hash containing the credential revocation set 
    mapping(address => string) public revocationCIDs;

    // Maps company DID => admin address => authorization status, only authorized admins can update their company's CRSet CID
    mapping(address => mapping(address => bool)) public companyAdmins;

    // Events

    // Emitted when a company's revocation CID is updated
    // Trust Anchor service listens to this to update DID document
    event RevocationCIDUpdated(
        address indexed companyDID,
        string newCID,
        address indexed updatedBy,
        uint256 timestamp
    );

    event CompanyAdminAdded(
        address indexed companyDID,
        address indexed admin,
        uint256 timestamp
    );

    event CompanyAdminRemoved(
        address indexed companyDID,
        address indexed admin,
        uint256 timestamp
    );

    // Emitted when ownership is transferred
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // Errors

    error OnlyOwner();
    error OnlyCompanyAdmin();
    error InvalidAddress();
    error AdminAlreadyExists();
    error AdminDoesNotExist();
    error EmptyCID();

    // Modifiers

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyCompanyAdmin(address companyDID) {
        if (!companyAdmins[companyDID][msg.sender]) revert OnlyCompanyAdmin();
        _;
    }

    // Constructor

    //Initializes the registry with Trust Anchor as owner. _owner is Address of the Trust Anchor ( DIDMultisigController)
    constructor(address _owner) {
        if (_owner == address(0)) revert InvalidAddress();
        owner = _owner;
        emit OwnershipTransferred(address(0), _owner);
    }

    // Admin management (Called by Trust Anchor multisig)

    // Authorizes an admin to manage a company CRSet, only trustAnchor calls this

    function addCompanyAdmin(address companyDID, address admin) external onlyOwner {
        if (companyDID == address(0) || admin == address(0)) revert InvalidAddress();
        if (companyAdmins[companyDID][admin]) revert AdminAlreadyExists();

        companyAdmins[companyDID][admin] = true;
        emit CompanyAdminAdded(companyDID, admin, block.timestamp);
    }

    function removeCompanyAdmin(address companyDID, address admin) external onlyOwner {
        if (!companyAdmins[companyDID][admin]) revert AdminDoesNotExist();

        companyAdmins[companyDID][admin] = false;
        emit CompanyAdminRemoved(companyDID, admin, block.timestamp);
    }

    // CRSET CID MANAGEMENT (Called directly by company admins, admins interact with this contract instead of the DID document)

    // Updates the revocation list CID for a company
    // Can be called by any authorized admin of the company
    //newCID: The new IPFS CID pointing to the revocation list
    function updateRevocationCID(
        address companyDID,
        string calldata newCID
    ) external onlyCompanyAdmin(companyDID) {
        if (bytes(newCID).length == 0) revert EmptyCID();

        revocationCIDs[companyDID] = newCID;
        emit RevocationCIDUpdated(companyDID, newCID, msg.sender, block.timestamp);
    }

    // View functions

    function getRevocationCID(address companyDID) external view returns (string memory) {
        return revocationCIDs[companyDID];
    }

    // Checks if an address is an authorized admin for a company, true if authorized

    function isCompanyAdmin(address companyDID, address admin) external view returns (bool) {
        return companyAdmins[companyDID][admin];
    }

    // Ownership transfer to a new trust anchor multisig

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
