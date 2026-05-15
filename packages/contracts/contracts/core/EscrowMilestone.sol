// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title EscrowMilestone
 * @notice Milestone-based escrow with VRAN arbiter integration.
 *         Client locks funds. Freelancer delivers milestones.
 *         VRAN sentinel confirms delivery → funds release.
 */
contract EscrowMilestone {
    enum Status { Pending, Active, Disputed, Completed, Refunded }

    struct Milestone {
        string description;
        uint256 amount;
        bool released;
        bool confirmed;
        bytes32 evidenceHash; // IPFS/Arweave hash of delivery proof
    }

    struct Escrow {
        address client;
        address freelancer;
        address asset;        // address(0) for ETH
        uint256 total;
        uint256 released;
        Status status;
        Milestone[] milestones;
        uint256 createdAt;
        uint256 deadline;     // auto-refund if passed
    }

    mapping(uint256 => Escrow) public escrows;
    uint256 public nextEscrowId;

    // Trusted arbiters (VRAN sentinels with high reputation)
    mapping(address => bool) public arbiters;

    error NotClient();
    error NotFreelancer();
    error NotArbiter();
    error InvalidMilestone();
    error AlreadyReleased();
    error DeadlinePassed();
    error TransferFailed();
    error NotDisputed();

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed client,
        address indexed freelancer,
        uint256 total
    );
    event MilestoneConfirmed(
        uint256 indexed escrowId,
        uint256 indexed index,
        bytes32 evidenceHash
    );
    event MilestoneReleased(
        uint256 indexed escrowId,
        uint256 indexed index,
        uint256 amount
    );
    event Disputed(uint256 indexed escrowId);
    event Refunded(uint256 indexed escrowId);

    modifier onlyArbiter() {
        if (!arbiters[msg.sender]) revert NotArbiter();
        _;
    }

    function setArbiter(address arbiter, bool allowed) external {
        // In production, restrict to owner/governance
        arbiters[arbiter] = allowed;
    }

    function createEscrow(
        address freelancer,
        address asset,
        uint256[] calldata amounts,
        string[] calldata descriptions,
        uint256 deadline
    ) external payable returns (uint256 escrowId) {
        require(amounts.length == descriptions.length && amounts.length > 0, "INVALID_INPUT");

        uint256 total;
        for (uint256 i; i < amounts.length; ++i) {
            total += amounts[i];
        }

        if (asset == address(0)) {
            require(msg.value == total, "ETH_MISMATCH");
        } else {
            IERC20(asset).transferFrom(msg.sender, address(this), total);
        }

        escrowId = nextEscrowId++;
        Escrow storage e = escrows[escrowId];
        e.client = msg.sender;
        e.freelancer = freelancer;
        e.asset = asset;
        e.total = total;
        e.status = Status.Active;
        e.createdAt = block.timestamp;
        e.deadline = deadline;

        for (uint256 i; i < amounts.length; ++i) {
            e.milestones.push(Milestone({
                description: descriptions[i],
                amount: amounts[i],
                released: false,
                confirmed: false,
                evidenceHash: 0
            }));
        }

        emit EscrowCreated(escrowId, msg.sender, freelancer, total);
    }

    /**
     * @notice Freelancer submits delivery evidence for a milestone.
     */
    function submitMilestone(
        uint256 escrowId,
        uint256 index,
        bytes32 evidenceHash
    ) external {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.freelancer) revert NotFreelancer();
        if (index >= e.milestones.length) revert InvalidMilestone();
        if (e.milestones[index].released) revert AlreadyReleased();

        e.milestones[index].evidenceHash = evidenceHash;
        emit MilestoneConfirmed(escrowId, index, evidenceHash);
    }

    /**
     * @notice VRAN arbiter confirms delivery and releases funds.
     *         Links to VindexRegistry.confirmReport() pattern.
     */
    function releaseMilestone(
        uint256 escrowId,
        uint256 index
    ) external onlyArbiter {
        Escrow storage e = escrows[escrowId];
        if (index >= e.milestones.length) revert InvalidMilestone();
        if (e.milestones[index].released) revert AlreadyReleased();

        e.milestones[index].released = true;
        e.milestones[index].confirmed = true;
        e.released += e.milestones[index].amount;

        _transfer(e.freelancer, e.asset, e.milestones[index].amount);

        emit MilestoneReleased(escrowId, index, e.milestones[index].amount);
    }

    /**
     * @notice Client disputes escrow. Arbiter must resolve.
     */
    function dispute(uint256 escrowId) external {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.client && msg.sender != e.freelancer) revert NotClient();
        e.status = Status.Disputed;
        emit Disputed(escrowId);
    }

    /**
     * @notice Arbiter resolves dispute: refund remaining to client.
     */
    function resolveRefund(uint256 escrowId) external onlyArbiter {
        Escrow storage e = escrows[escrowId];
        if (e.status != Status.Disputed) revert NotDisputed();
        uint256 remaining = e.total - e.released;
        e.status = Status.Refunded;
        _transfer(e.client, e.asset, remaining);
        emit Refunded(escrowId);
    }

    /**
     * @notice Auto-refund if deadline passed and not completed.
     */
    function autoRefund(uint256 escrowId) external {
        Escrow storage e = escrows[escrowId];
        if (block.timestamp < e.deadline) revert DeadlinePassed();
        if (e.status != Status.Active && e.status != Status.Disputed) revert NotDisputed();
        uint256 remaining = e.total - e.released;
        e.status = Status.Refunded;
        _transfer(e.client, e.asset, remaining);
        emit Refunded(escrowId);
    }

    function _transfer(address to, address asset, uint256 amount) internal {
        if (asset == address(0)) {
            (bool ok, ) = payable(to).call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            bool ok = IERC20(asset).transfer(to, amount);
            if (!ok) revert TransferFailed();
        }
    }

    receive() external payable {}
}
