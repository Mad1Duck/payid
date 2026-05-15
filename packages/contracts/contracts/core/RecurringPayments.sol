// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PayIDVerifier.sol";
import "./PayWithPayID.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title RecurringPayments
 * @notice Subscription billing with pre-approved max amounts.
 *         User approves recurring deduction up to maxAmount / period.
 *         Executor (e.g., merchant/service) triggers payment each period.
 */
contract RecurringPayments {
    struct Subscription {
        address payer;
        address receiver;
        address asset;        // address(0) for ETH
        uint256 maxAmount;    // max per charge
        uint256 period;       // seconds between charges
        uint256 nextCharge;   // timestamp of next allowed charge
        uint256 totalCharged; // lifetime total
        uint256 numCharges;   // count of charges executed
        bool active;
    }

    mapping(uint256 => Subscription) public subscriptions;
    uint256 public nextSubId;

    PayWithPayID public payWithPayID;

    error NotPayer();
    error NotReceiver();
    error NotActive();
    error TooSoon();
    error ExceedsMax();
    error TransferFailed();

    event SubscriptionCreated(
        uint256 indexed subId,
        address indexed payer,
        address indexed receiver,
        address asset,
        uint256 maxAmount,
        uint256 period
    );
    event Charged(
        uint256 indexed subId,
        uint256 amount,
        uint256 timestamp
    );
    event Cancelled(uint256 indexed subId);

    function initialize(address payWithPayID_) external {
        require(address(payWithPayID) == address(0), "ALREADY_INIT");
        payWithPayID = PayWithPayID(payWithPayID_);
    }

    /**
     * @notice Create a new recurring subscription.
     *         Payer must have approved ERC20 or sent ETH for first charge.
     */
    function createSubscription(
        address receiver,
        address asset,
        uint256 maxAmount,
        uint256 period
    ) external payable returns (uint256 subId) {
        subId = nextSubId++;
        subscriptions[subId] = Subscription({
            payer: msg.sender,
            receiver: receiver,
            asset: asset,
            maxAmount: maxAmount,
            period: period,
            nextCharge: block.timestamp + period,
            totalCharged: 0,
            numCharges: 0,
            active: true
        });
        emit SubscriptionCreated(subId, msg.sender, receiver, asset, maxAmount, period);
    }

    /**
     * @notice Execute a scheduled charge. Callable by receiver or approved executor.
     *         Requires valid DecisionProof from payer (SessionPolicyV2).
     */
    function charge(
        uint256 subId,
        PayIDVerifier.Decision calldata decision,
        bytes calldata sig,
        bytes32[] calldata attestationUIDs
    ) external {
        Subscription storage s = subscriptions[subId];
        if (!s.active) revert NotActive();
        if (block.timestamp < s.nextCharge) revert TooSoon();
        if (msg.sender != s.receiver) revert NotReceiver();
        if (decision.amount > s.maxAmount) revert ExceedsMax();
        if (decision.payer != s.payer) revert NotPayer();

        s.nextCharge = block.timestamp + s.period;
        s.totalCharged += decision.amount;
        s.numCharges++;

        if (s.asset == address(0)) {
            // ETH — requires pre-deposit or payer sends value via charge()
            payWithPayID.payETH{value: decision.amount}(decision, sig, attestationUIDs);
        } else {
            // ERC20 — PayWithPayID handles transferFrom(payer, receiver)
            payWithPayID.payERC20(decision, sig, attestationUIDs);
        }

        emit Charged(subId, decision.amount, block.timestamp);
    }

    function cancel(uint256 subId) external {
        Subscription storage s = subscriptions[subId];
        if (msg.sender != s.payer && msg.sender != s.receiver) revert NotPayer();
        s.active = false;
        emit Cancelled(subId);
    }
}
