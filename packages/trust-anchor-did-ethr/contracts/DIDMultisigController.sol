// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IEthereumDIDRegistry {
    function changeOwner(address identity, address newOwner) external;
    function addDelegate(address identity, bytes32 delegateType, address delegate, uint validity) external;
    function revokeDelegate(address identity, bytes32 delegateType, address delegate) external;
    function setAttribute(address identity, bytes32 name, bytes calldata value, uint validity) external;
    function revokeAttribute(address identity, bytes32 name, bytes calldata value) external;
}

contract DIDMultisigController {
    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    IEthereumDIDRegistry public immutable registry;
    address[] public owners;
    mapping(address => bool) public isOwner;

    uint256 public quorum; // M-of-N

    struct Proposal {
        bytes data;
        uint256 approvals;
        bool executed;
        mapping(address => bool) approvedBy;
    }

    mapping(bytes32 => Proposal) public proposals;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event ProposalCreated(bytes32 indexed id, bytes data);
    event Approved(bytes32 indexed id, address indexed owner);
    event Executed(bytes32 indexed id);
    event QuorumUpdated(uint256 newQuorum);

    /*//////////////////////////////////////////////////////////////
                                MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyOwner() {
        require(isOwner[msg.sender], "not_owner");
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
                         PROPOSAL MECHANISM
    //////////////////////////////////////////////////////////////*/

    function _propose(bytes memory data) internal returns (bytes32 id) {
        id = keccak256(abi.encode(address(this), data));
        Proposal storage p = proposals[id];
        require(p.data.length == 0, "already_exists");

        p.data = data;
        emit ProposalCreated(id, data);
    }

    function propose(bytes calldata data)
        external
        onlyOwner
        returns (bytes32)
    {
        return _propose(data);
    }


    function approve(bytes32 id) external onlyOwner {
        Proposal storage p = proposals[id];
        require(p.data.length != 0, "no_proposal");
        require(!p.executed, "already_executed");
        require(!p.approvedBy[msg.sender], "already_approved");

        p.approvedBy[msg.sender] = true;
        p.approvals++;

        emit Approved(id, msg.sender);

        if (p.approvals >= quorum) {
            _execute(id);
        }
    }

    function _execute(bytes32 id) internal {
        Proposal storage p = proposals[id];
        require(!p.executed, "already_executed");

        p.executed = true;

        (bool ok,) = address(registry).call(p.data);
        require(ok, "execution_failed");

        emit Executed(id);
    }

    /*//////////////////////////////////////////////////////////////
                        DID REGISTRY HELPERS
    //////////////////////////////////////////////////////////////*/

    function proposeChangeOwner(address newOwner) external onlyOwner returns (bytes32) {
        return _propose(
            abi.encodeWithSelector(
                registry.changeOwner.selector,
                address(this),
                newOwner
            )
        );
    }

    function proposeAddDelegate(
        bytes32 delegateType,
        address delegate,
        uint validity
    ) external onlyOwner returns (bytes32) {
        return _propose(
            abi.encodeWithSelector(
                registry.addDelegate.selector,
                address(this),
                delegateType,
                delegate,
                validity
            )
        );
    }

    function proposeRevokeDelegate(
        bytes32 delegateType,
        address delegate
    ) external onlyOwner returns (bytes32) {
        return _propose(
            abi.encodeWithSelector(
                registry.revokeDelegate.selector,
                address(this),
                delegateType,
                delegate
            )
        );
    }

    function proposeSetAttribute(
        bytes32 name,
        bytes calldata value,
        uint validity
    ) external onlyOwner returns (bytes32) {
        return _propose(
            abi.encodeWithSelector(
                registry.setAttribute.selector,
                address(this),
                name,
                value,
                validity
            )
        );
    }

    function proposeRevokeAttribute(
        bytes32 name,
        bytes calldata value
    ) external onlyOwner returns (bytes32) {
        return _propose(
            abi.encodeWithSelector(
                registry.revokeAttribute.selector,
                address(this),
                name,
                value
            )
        );
    }

    /*//////////////////////////////////////////////////////////////
                     QUORUM GOVERNANCE (UNANIMOUS)
    //////////////////////////////////////////////////////////////*/

    function proposeQuorumUpdate(uint256 newQuorum) external onlyOwner returns (bytes32) {
        require(newQuorum > 0 && newQuorum <= owners.length, "bad_quorum");

        return _propose(
            abi.encodeWithSelector(this._setQuorum.selector, newQuorum)
        );
    }

    function _setQuorum(uint256 newQuorum) external {
        require(msg.sender == address(this), "only_self");
        require(newQuorum > 0 && newQuorum <= owners.length, "bad_quorum");

        quorum = newQuorum;
        emit QuorumUpdated(newQuorum);
    }
}
