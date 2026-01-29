// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DigitalAssetMarketplaceStub  {
    
    // owner of the contract
    address public owner;

    // digital assets on marketplace
    mapping(uint256 => string) digitalAssets; // stores digital assets by ID
    uint256 assetCount;
    mapping(uint256 => address) public assetOwners; // stores owners of digital assets

    // modifier to restrict access to owner only
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    // events
    event DataPublished(string data);
    event NewOwner(address newOwner);

    // constructor to set the owner
    constructor(address initialOwner) {
        owner = initialOwner;
    }

    // publish data as digital asset on marketplace
    function publishData(string calldata data, address assetOwner) external onlyOwner {
        // add data as digital asset to marketplace and register it to its owner
        digitalAssets[assetCount] = data;
        assetOwners[assetCount] = assetOwner;
        assetCount++;
        emit DataPublished(data);
    }

    // set owner after deployment of contract
    function setOwner(address newOwner) external onlyOwner {
        owner = newOwner;
        emit NewOwner(newOwner);
    } 
}