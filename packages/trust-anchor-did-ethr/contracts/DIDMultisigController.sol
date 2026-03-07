// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IEthereumDIDRegistry {
    function changeOwner(address identity, address newOwner) external;
    function addDelegate(address identity, bytes32 delegateType, address delegate, uint validity) external;
    function revokeDelegate(address identity, bytes32 delegateType, address delegate) external;
    function setAttribute(address identity, bytes32 name, bytes calldata value, uint validity) external;
    function revokeAttribute(address identity, bytes32 name, bytes calldata value) external;
    function validDelegate(address identity, bytes32 delegateType, address delegate) external view returns (bool);
}

interface IDigitalAssetMarketplaceStub {
    function publishData(string calldata data, address assetOwner) external;
}

contract DIDMultisigController {
    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    IEthereumDIDRegistry public immutable registry;
    address[] public owners;
    mapping(address => bool) public isOwner;

    uint256 public quorum; // Standard M-of-N for routine tasks

    struct Proposal {
        bytes data;
        uint256 approvals;
        bool executed;
        bool requiresUnanimity;
        address ownerToRemove;
        mapping(address => bool) approvedBy;
    }

    mapping(bytes32 => Proposal) public proposals;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event ProposalCreated(bytes32 indexed id, bytes data, bool requiresUnanimity);
    event Approved(bytes32 indexed id, address indexed owner);
    event Executed(bytes32 indexed id);
    event QuorumUpdated(uint256 newQuorum);
    event OwnerAdded(address indexed newOwner);
    event OwnerRemoved(address indexed removedOwner);

    /*//////////////////////////////////////////////////////////////
                                MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyOwner() {
        require(isOwner[msg.sender], "not_owner");
        _;
    }

    modifier onlySelf() {
        require(msg.sender == address(this), "only_self");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _registry,
        address[] memory _owners,
        uint256 _quorum
    ) {
        require(_owners.length > 0, "no_owners");
        require(_quorum > 0 && _quorum <= _owners.length, "bad_quorum");

        registry = IEthereumDIDRegistry(_registry);
        quorum = _quorum;

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "zero_owner");
            require(!isOwner[owner], "duplicate_owner");
            isOwner[owner] = true;
            owners.push(owner);
        }
    }

    /*//////////////////////////////////////////////////////////////
                         1. SINGLE ADMIN ACTIONS
             (For managing Company DIDs - Speed Layer)
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Allows a single admin to execute calls on external contracts (Companies).
     * @dev RESTRICTED: Cannot call the Registry to modify THIS contract's identity.
     */
    function execCall(address target, bytes calldata data) external onlyOwner {
        // Security Check: If calling the Registry, ensure we are NOT modifying our own identity.
        if (target == address(registry)) {
            // Registry functions usually start with (address identity, ...)
            // We decode the first 32 bytes of the payload (after the 4-byte selector)
            // to check the 'identity' argument.
            require(data.length >= 36, "invalid_data_length");

            // Slice out the 4-byte selector to decode the args
            bytes memory args = data[4:];
            // Decode strictly as (address) to get the first parameter
            address identityParam = abi.decode(args, (address));

            require(identityParam != address(this), "use_proposal_for_self");
        }

        (bool success, ) = target.call(data);
        require(success, "call_failed");
    }

    /*//////////////////////////////////////////////////////////////
                            2. PROPOSAL LOGIC
                 (For Consensus Actions - Security Layer)
    //////////////////////////////////////////////////////////////*/

    function _propose(bytes memory data, bool requiresUnanimity, address ownerToRemove) internal returns (bytes32 id) {
        id = keccak256(abi.encode(address(this), data, block.timestamp));
        Proposal storage p = proposals[id];
        require(p.data.length == 0, "already_exists");

        p.data = data;
        p.requiresUnanimity = requiresUnanimity;
        p.ownerToRemove = ownerToRemove;

        emit ProposalCreated(id, data, requiresUnanimity);
    }

    function approve(bytes32 id) external onlyOwner {
        Proposal storage p = proposals[id];
        require(p.data.length != 0, "no_proposal");
        require(!p.executed, "already_executed");
        require(!p.approvedBy[msg.sender], "already_approved");

        p.approvedBy[msg.sender] = true;
        p.approvals++;

        emit Approved(id, msg.sender);

        _tryExecute(id);
    }

    function _tryExecute(bytes32 id) internal {
        Proposal storage p = proposals[id];
        uint256 threshold;

        if (p.requiresUnanimity) {
            if (p.ownerToRemove != address(0)) {
                threshold = owners.length - 1;
            } else {
                threshold = owners.length;
            }
        } else {
            threshold = quorum;
        }

        if (p.approvals >= threshold) {
            p.executed = true;
            // Calls a function on THIS contract (which then calls Registry)
            (bool ok,) = address(this).call(p.data);
            require(ok, "execution_failed");
            emit Executed(id);
        }
    }

    /*//////////////////////////////////////////////////////////////
                     3. CRITICAL ACTIONS (UNANIMOUS)
    //////////////////////////////////////////////////////////////*/

    function proposeChangeOwner(address identity, address newOwner) external onlyOwner returns (bytes32) {
        return _propose(
            abi.encodeWithSelector(this._executeChangeOwner.selector, identity, newOwner),
            true,
            address(0)
        );
    }

    function _executeChangeOwner(address identity, address newOwner) external onlySelf {
        registry.changeOwner(identity, newOwner);
    }

    function proposeAddOwner(address newOwner) external onlyOwner returns (bytes32) {
        require(!isOwner[newOwner], "already_owner");
        return _propose(
            abi.encodeWithSelector(this._addOwner.selector, newOwner),
            true,
            address(0)
        );
    }

    function _addOwner(address newOwner) external onlySelf {
        isOwner[newOwner] = true;
        owners.push(newOwner);
        emit OwnerAdded(newOwner);
    }

    function proposeRemoveOwner(address owner) external onlyOwner returns (bytes32) {
        require(isOwner[owner], "not_owner");
        return _propose(
            abi.encodeWithSelector(this._removeOwner.selector, owner),
            true,
            owner
        );
    }

    function _removeOwner(address owner) external onlySelf {
        require(owners.length - 1 >= quorum, "quorum_violation");

        isOwner[owner] = false;
        for (uint i = 0; i < owners.length; i++) {
            if (owners[i] == owner) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }
        emit OwnerRemoved(owner);
    }

    function proposeQuorumUpdate(uint256 newQuorum) external onlyOwner returns (bytes32) {
        return _propose(
            abi.encodeWithSelector(this._setQuorum.selector, newQuorum),
            true,
            address(0)
        );
    }

    function _setQuorum(uint256 newQuorum) external onlySelf {
        require(newQuorum > 0 && newQuorum <= owners.length, "bad_quorum");
        quorum = newQuorum;
        emit QuorumUpdated(newQuorum);
    }

    /*//////////////////////////////////////////////////////////////
                     4. ROUTINE ACTIONS (QUORUM)
               (For managing THIS contract's identity)
    //////////////////////////////////////////////////////////////*/

    // WRAPPER 1: Set Attribute
    function proposeSetAttribute(bytes32 name, bytes calldata value, uint validity) external onlyOwner returns (bytes32) {
        // Target THIS contract's wrapper function
        return _propose(
            abi.encodeWithSelector(this._setAttribute.selector, name, value, validity),
            false, // Quorum
            address(0)
        );
    }

    function _setAttribute(bytes32 name, bytes calldata value, uint validity) external onlySelf {
        // Multisig calls registry for ITSELF
        registry.setAttribute(address(this), name, value, validity);
    }

    // WRAPPER 2: Add Delegate
    function proposeAddDelegate(bytes32 delegateType, address delegate, uint validity) external onlyOwner returns (bytes32) {
        return _propose(
            abi.encodeWithSelector(this._addDelegate.selector, delegateType, delegate, validity),
            false, // Quorum
            address(0)
        );
    }

    function _addDelegate(bytes32 delegateType, address delegate, uint validity) external onlySelf {
        registry.addDelegate(address(this), delegateType, delegate, validity);
    }

    /*//////////////////////////////////////////////////////////////
                     5. COMPANY ADMIN ACTIONS VIA MULTISIG
    //////////////////////////////////////////////////////////////*/

    // verifiable delegated execution of publishing data to a marketplace (WITHOUT privacy of company admin!)
    // company admins call this function to authorize trust anchor with a signature on a message requesting
    // to publish data through the marketplace on behalf of their company
    function publishMarketplaceData(
        address marketplace,
        string calldata data,
        address company,
        bytes calldata signature
    ) external onlyOwner {
        // recreate signed message hash
        bytes32 messageHash = keccak256(
            abi.encodePacked(marketplace, data, company)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        // recover signer (= company admin)
        address signer = _recoverSigner(ethSignedMessageHash, signature);
        require(signer != address(0), "invalid_signature");

        // verify signer is authorized to request publication of data as asset through trust anchor,
        // i.e. is signer a delegate and thus company admin of the company's did:ethr for which the data should be published
        require(
            registry.validDelegate(
                company,
                keccak256("CompanyAdmin"),
                signer
            ),
            "signer_not_company_admin"
        );

        // publish asset with company as owner
        IDigitalAssetMarketplaceStub(marketplace).publishData(data, company);
    }

    function _recoverSigner(
        bytes32 ethSignedMessageHash,
        bytes calldata signature
    ) internal pure returns (address) {
        require(signature.length == 65, "bad_signature_length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);

        return ecrecover(ethSignedMessageHash, v, r, s);
    }

    function privatelyPublishMarketplaceData(
        address marketplace,
        string calldata data,
        address company,
        address[] calldata companyAdmins
    ) external onlyOwner {

        // require at least 1 company admin
        require(companyAdmins.length > 0, "no_company_admins");

        // require all provided company admins to be valid delegates
        for (uint i = 0; i < companyAdmins.length; i++) {
            require(
                registry.validDelegate(
                    company,
                    keccak256("CompanyAdmin"),
                    companyAdmins[i]
                ),
                "invalid_list_of_company_admins"
            );
        }

        // verify ZKP that proves that...
        // 1. the trust anchor knows a signature over the message authorizing the publication of data
        // 2. one of the company admins signed the message authorizing the publication of data
        // 3. without revealing which company admin signed the message

        // publish asset with company as owner
        IDigitalAssetMarketplaceStub(marketplace).publishData(data, company);
    }
}