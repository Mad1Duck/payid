// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TimeLockVesting
 * @notice Token vesting with cliff and linear release.
 *         Uses block.timestamp for time-lock validation.
 *         Integrates with PAY.ID rule engine via env.timestamp check.
 */
contract TimeLockVesting {
    struct VestingSchedule {
        address beneficiary;
        address asset;          // address(0) for ETH
        uint256 totalAmount;
        uint256 startTime;
        uint256 cliff;          // seconds before first release
        uint256 duration;       // total vesting duration
        uint256 released;       // amount already withdrawn
        bool revocable;
        bool revoked;
        address revoker;        // who can revoke (e.g., employer/DAO)
    }

    mapping(uint256 => VestingSchedule) public schedules;
    uint256 public nextScheduleId;

    error NotBeneficiary();
    error NotRevoker();
    error CliffNotReached();
    error NothingToRelease();
    error AlreadyRevoked();
    error TransferFailed();
    error InvalidDuration();

    event ScheduleCreated(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        address asset,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliff,
        uint256 duration
    );
    event Released(
        uint256 indexed scheduleId,
        uint256 amount
    );
    event Revoked(
        uint256 indexed scheduleId,
        uint256 remaining
    );

    function createSchedule(
        address beneficiary,
        address asset,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliff,
        uint256 duration,
        bool revocable,
        address revoker
    ) external payable returns (uint256 scheduleId) {
        if (duration == 0 || cliff > duration) revert InvalidDuration();

        if (asset == address(0)) {
            require(msg.value == totalAmount, "ETH_MISMATCH");
        } else {
            IERC20(asset).transferFrom(msg.sender, address(this), totalAmount);
        }

        scheduleId = nextScheduleId++;
        schedules[scheduleId] = VestingSchedule({
            beneficiary: beneficiary,
            asset: asset,
            totalAmount: totalAmount,
            startTime: startTime,
            cliff: cliff,
            duration: duration,
            released: 0,
            revocable: revocable,
            revoked: false,
            revoker: revoker
        });

        emit ScheduleCreated(
            scheduleId,
            beneficiary,
            asset,
            totalAmount,
            startTime,
            cliff,
            duration
        );
    }

    /**
     * @notice Calculate releasable amount based on elapsed time.
     *         Linear vesting after cliff.
     */
    function releasable(uint256 scheduleId) public view returns (uint256) {
        VestingSchedule storage s = schedules[scheduleId];
        if (block.timestamp < s.startTime + s.cliff) return 0;
        if (s.revoked) return 0;

        uint256 elapsed = block.timestamp - s.startTime;
        if (elapsed >= s.duration) {
            return s.totalAmount - s.released;
        }

        uint256 vested = (s.totalAmount * elapsed) / s.duration;
        return vested - s.released;
    }

    function release(uint256 scheduleId) external {
        VestingSchedule storage s = schedules[scheduleId];
        if (msg.sender != s.beneficiary) revert NotBeneficiary();
        if (s.revoked) revert AlreadyRevoked();

        uint256 amount = releasable(scheduleId);
        if (amount == 0) revert NothingToRelease();

        s.released += amount;
        _transfer(s.beneficiary, s.asset, amount);

        emit Released(scheduleId, amount);
    }

    function revoke(uint256 scheduleId) external {
        VestingSchedule storage s = schedules[scheduleId];
        if (!s.revocable) revert NotRevoker();
        if (msg.sender != s.revoker) revert NotRevoker();
        if (s.revoked) revert AlreadyRevoked();

        s.revoked = true;
        uint256 remaining = s.totalAmount - s.released;

        _transfer(s.revoker, s.asset, remaining);

        emit Revoked(scheduleId, remaining);
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
