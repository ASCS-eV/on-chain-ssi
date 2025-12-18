// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
ERC-1056 compliant DID Registry for Ethereum-based Decentralized Identifiers. This contract serves as a draft with minimal functionality, all the contents are subject to change.
This contract could be extended for our needs, swapped out for the https://github.com/uport-project/ethr-did-registry/blob/develop/contracts/EthereumDIDRegistry.sol , or replaced with another implementation.
 */
contract DIDRegistry {
    // Storage mappings
    mapping(address => address) public owners;
    mapping(address => uint256) public changed;
    mapping(address => mapping(bytes32 => mapping(address => uint256))) public delegates;
    mapping(address => mapping(bytes32 => bytes)) public attributes;
    mapping(address => mapping(bytes32 => uint256)) public attributeExpiry;
    
    // Events for DID Document resolution
    event DIDOwnerChanged(
        address indexed identity,
        address owner,
        uint256 previousChange
    );
    
    event DIDDelegateChanged(
        address indexed identity,
        bytes32 delegateType,
        address delegate,
        uint256 validTo,
        uint256 previousChange
    );
    
    event DIDAttributeChanged(
        address indexed identity,
        bytes32 name,
        bytes value,
        uint256 validTo,
        uint256 previousChange
    );
    
    modifier onlyOwner(address identity) {
        require(
            identityOwner(identity) == msg.sender || identity == msg.sender,
            "Not authorized"
        );
        _;
    }
    
    // Returns the owner of an identity
    function identityOwner(address identity) public view returns (address) {
        address owner = owners[identity];
        return owner != address(0) ? owner : identity;
    }
    
    // Changes the owner of an identity. Used to transfer the ownership to the trust anchor. If the ownership is not transferred after creation to the trustAnchor, the company can not be registered by the CompanyRegistry/TrustAnchor
    function changeOwner(address identity, address newOwner) external onlyOwner(identity) {
        owners[identity] = newOwner;
        changed[identity] = block.number;
        emit DIDOwnerChanged(identity, newOwner, changed[identity]);
    }
    
    // Adds - revokes a delegate with specific permissions for a certain time. For our case, there wont be necessarily time limits, so we can set it to max uint256
    function addDelegate(
        address identity,
        bytes32 delegateType,
        address delegate,
        uint256 validity
    ) external onlyOwner(identity) {
        uint256 validTo = block.timestamp + validity;
        delegates[identity][delegateType][delegate] = validTo;
        changed[identity] = block.number;
        emit DIDDelegateChanged(identity, delegateType, delegate, validTo, changed[identity]);
    }

    function revokeDelegate(
        address identity,
        bytes32 delegateType,
        address delegate
    ) external onlyOwner(identity) {
        delegates[identity][delegateType][delegate] = 0;
        changed[identity] = block.number;
        emit DIDDelegateChanged(identity, delegateType, delegate, 0, changed[identity]);
    }
    
    //Sets an attribute for an identity, and the next function revokes it
    // UPDATED: to support serviceAdmin delegates for serviceEndpoint updates. The admin can only set the serviceEndpoint attribute, whereas the owner (trustAnchor) can set any attribute.
    function setAttribute(
        address identity,
        bytes32 name, // name refers to the attribute key, bytes32 to save gas
        bytes calldata value, // The attribute value (encoded bytes; could be IPFS CID of revocation data, public key, URL, etc.)
        uint256 validity
    ) external {
        // Check if caller is owner
        bool isOwner = identityOwner(identity) == msg.sender;
        
        // Check if caller is a serviceAdmin delegate (for serviceEndpoint only)
        bool isServiceAdmin = validDelegate(identity, keccak256("serviceAdmin"), msg.sender);
        bool isServiceEndpointAttribute = name == keccak256("serviceEndpoint");
        
        // Authorization: owner/trust Anchor can update anything, serviceAdmin can only update serviceEndpoint!
        require(
            isOwner || (isServiceAdmin && isServiceEndpointAttribute),
            "Not authorized to set this attribute"
        );
        
        attributes[identity][name] = value;
        uint256 validTo = block.timestamp + validity;
        attributeExpiry[identity][name] = validTo;
        uint256 previousChange = changed[identity];
        changed[identity] = block.number;
        emit DIDAttributeChanged(identity, name, value, validTo, previousChange);
    }
    
    function revokeAttribute(address identity, bytes32 name) external onlyOwner(identity) {
        delete attributes[identity][name];
        attributeExpiry[identity][name] = 0;
        changed[identity] = block.number;
        emit DIDAttributeChanged(identity, name, "", 0, changed[identity]);
    }
    
    // Checks if  delegate is currently valid
    function validDelegate(
        address identity,
        bytes32 delegateType,
        address delegate
    ) public view returns (bool) {
        return delegates[identity][delegateType][delegate] > block.timestamp;
    }
    
    // Gets an attribute value if still valid

    function getAttribute(address identity, bytes32 name) public view returns (bytes memory) {
        if (attributeExpiry[identity][name] > block.timestamp) {
            return attributes[identity][name];
        }
        return "";
    }
}