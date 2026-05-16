// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AIAgentRegistry.sol";
import "./CombinedRuleStorage.sol";

/**
 * @title AIAgentRuleManager
 * @notice Manajemen Combined Rule untuk AI Agent dan subscription-nya.
 * @dev Flow:
 *      1. AI Agent register di AIAgentRegistry.
 *      2. AI Agent buat Combined Rule di CombinedRuleStorage (harus own rule NFTs).
 *      3. AI Agent set active combined rule hash di AIAgentRuleManager.
 *      4. User subscribe ke AI Agent dengan bayar ETH.
 *      5. User bisa pakai agent rule sebagai effective rule mereka.
 */
contract AIAgentRuleManager {

    /* ===================== STRUCTS ===================== */
    struct Subscription {
        uint256 expiry;
        bool    active;
    }

    struct AgentRuleInfo {
        bytes32 ruleSetHash;
        uint256 setAt;
        bool    active;
    }

    /* ===================== CONFIG ===================== */
    uint256 public constant SUB_DURATION = 30 days;
    uint256 public subscriptionPrice = 0.0001 ether; // default, bisa di-update

    AIAgentRegistry public agentRegistry;
    CombinedRuleStorage public combinedRuleStorage;

    address public admin;

    /* ===================== STORAGE ===================== */
    // agent address => info rule mereka
    mapping(address => AgentRuleInfo) public agentRules;

    // user => agent => subscription
    mapping(address => mapping(address => Subscription)) public subscriptions;

    // user => agent yang mereka pilih sebagai preferred (jika ada subscription aktif)
    mapping(address => address) public preferredAgentOf;

    // track total subscribers per agent
    mapping(address => uint256) public subscriberCount;

    /* ===================== ERRORS ===================== */
    error NotRegisteredAgent();
    error NotAgentOwner();
    error RuleNotFound();
    error AlreadySubscribed();
    error SubscriptionExpired();
    error NoActiveSubscription();
    error SameAgent();
    error InvalidPrice();
    error TransferFailed();
    error NotAdmin();
    error RuleNotOwnedByAgent();

    /* ===================== EVENTS ===================== */
    event AgentRuleSet(address indexed agent, bytes32 indexed ruleSetHash);
    event AgentRuleUnset(address indexed agent);
    event Subscribed(address indexed user, address indexed agent, uint256 expiry);
    event Unsubscribed(address indexed user, address indexed agent);
    event PreferredAgentSet(address indexed user, address indexed agent);
    event SubscriptionPriceUpdated(uint256 newPrice);

    /* ===================== CONSTRUCTOR ===================== */
    constructor(address _agentRegistry, address _combinedRuleStorage) {
        agentRegistry = AIAgentRegistry(_agentRegistry);
        combinedRuleStorage = CombinedRuleStorage(_combinedRuleStorage);
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    /* ===================== AGENT RULE MANAGEMENT ===================== */

    /**
     * @notice Set combined rule hash untuk AI Agent.
     * @dev Bisa dipanggil oleh agent wallet sendiri ATAU owner agent.
     *      Combined rule harus aktif dan dimiliki oleh agent/owner di CombinedRuleStorage.
     */
    function setAgentCombinedRule(address agentWallet, bytes32 ruleSetHash) external {
        // adminAgents mapping public returns tuple: (agentWallet, owner, displayName, metadataHash, encryptedURI, publicEndpoint, registeredAt, active)
        (address regAgentWallet, address owner,,,,,, bool active) = agentRegistry.adminAgents(agentWallet);
        if (regAgentWallet == address(0) || !active) revert NotRegisteredAgent();
        if (msg.sender != agentWallet && msg.sender != owner) revert NotAgentOwner();
        if (ruleSetHash == bytes32(0)) revert RuleNotFound();

        // Verify rule exists and is active in CombinedRuleStorage
        try combinedRuleStorage.getRuleByHash(ruleSetHash) returns (
            address ruleOwner,
            IRuleAuthority.RuleRef[] memory,
            uint64
        ) {
            if (ruleOwner != agentWallet && ruleOwner != owner) revert RuleNotOwnedByAgent();
        } catch {
            revert RuleNotFound();
        }

        agentRules[agentWallet] = AgentRuleInfo({
            ruleSetHash: ruleSetHash,
            setAt: block.timestamp,
            active: true
        });

        emit AgentRuleSet(agentWallet, ruleSetHash);
    }

    /**
     * @notice Unset agent rule (deactivate tanpa hapus hash).
     * @dev Bisa dipanggil oleh agent wallet sendiri ATAU owner agent.
     */
    function unsetAgentCombinedRule(address agentWallet) external {
        (address regAgentWallet, address owner,,,,,, bool active) = agentRegistry.adminAgents(agentWallet);
        if (regAgentWallet == address(0) || !active) revert NotRegisteredAgent();
        if (msg.sender != agentWallet && msg.sender != owner) revert NotAgentOwner();
        agentRules[agentWallet].active = false;
        emit AgentRuleUnset(agentWallet);
    }

    /* ===================== SUBSCRIPTION ===================== */

    /**
     * @notice User subscribe ke AI Agent untuk pakai combined rule mereka.
     * @param agent Address AI Agent yang mau di-subscribe.
     */
    function subscribeToAgent(address agent) external payable {
        if (!agentRegistry.isRegistered(agent)) revert NotRegisteredAgent();
        if (agent == msg.sender) revert SameAgent();
        if (msg.value < subscriptionPrice) revert InvalidPrice();

        Subscription storage sub = subscriptions[msg.sender][agent];

        if (sub.active && sub.expiry > block.timestamp) {
            // Extend existing subscription
            sub.expiry += SUB_DURATION;
        } else {
            // New subscription
            sub.expiry = block.timestamp + SUB_DURATION;
            sub.active = true;
            subscriberCount[agent]++;
        }

        // Auto-set sebagai preferred agent jika user belum punya
        if (preferredAgentOf[msg.sender] == address(0)) {
            preferredAgentOf[msg.sender] = agent;
            emit PreferredAgentSet(msg.sender, agent);
        }

        emit Subscribed(msg.sender, agent, sub.expiry);
    }

    /**
     * @notice User unsubscribe dari AI Agent.
     */
    function unsubscribeFromAgent(address agent) external {
        Subscription storage sub = subscriptions[msg.sender][agent];
        if (!sub.active) revert NoActiveSubscription();

        sub.active = false;
        subscriberCount[agent]--;

        // Clear preferred agent kalau ini yang dipakai
        if (preferredAgentOf[msg.sender] == agent) {
            preferredAgentOf[msg.sender] = address(0);
        }

        emit Unsubscribed(msg.sender, agent);
    }

    /**
     * @notice User pilih agent mana yang jadi preferred (default) mereka.
     * @dev Harus punya subscription aktif ke agent tersebut.
     */
    function setPreferredAgent(address agent) external {
        if (agent != address(0)) {
            Subscription storage sub = subscriptions[msg.sender][agent];
            if (!sub.active || sub.expiry <= block.timestamp) revert SubscriptionExpired();
            if (!agentRegistry.isRegistered(agent)) revert NotRegisteredAgent();
        }

        preferredAgentOf[msg.sender] = agent;
        emit PreferredAgentSet(msg.sender, agent);
    }

    /* ===================== ADMIN ===================== */

    function setSubscriptionPrice(uint256 newPrice) external onlyAdmin {
        subscriptionPrice = newPrice;
        emit SubscriptionPriceUpdated(newPrice);
    }

    function withdraw() external onlyAdmin {
        (bool ok, ) = admin.call{value: address(this).balance}("");
        if (!ok) revert TransferFailed();
    }

    /* ===================== VIEW ===================== */

    /**
     * @notice Cek apakah user punya subscription aktif ke agent.
     */
    function isSubscribed(address user, address agent) external view returns (bool) {
        Subscription storage sub = subscriptions[user][agent];
        return sub.active && sub.expiry > block.timestamp;
    }

    /**
     * @notice Dapatkan subscription info user ke agent.
     */
    function getSubscription(address user, address agent)
        external
        view
        returns (Subscription memory)
    {
        return subscriptions[user][agent];
    }

    /**
     * @notice Dapatkan rule set hash dari agent (jika aktif).
     */
    function getAgentRule(address agent) external view returns (AgentRuleInfo memory) {
        return agentRules[agent];
    }

    /**
     * @notice Dapatkan effective rule hash untuk user.
     * @dev Priority:
     *      1. Kalau user punya preferred agent + subscription aktif => return agent rule
     *      2. Kalau tidak => return bytes32(0) (frontend/sdk harus cek CombinedRuleStorage sendiri)
     */
    function getEffectiveAgentRule(address user)
        external
        view
        returns (bytes32 ruleSetHash, address agent)
    {
        agent = preferredAgentOf[user];
        if (agent == address(0)) return (bytes32(0), address(0));

        Subscription storage sub = subscriptions[user][agent];
        if (!sub.active || sub.expiry <= block.timestamp) {
            return (bytes32(0), address(0));
        }

        AgentRuleInfo storage info = agentRules[agent];
        if (!info.active) return (bytes32(0), address(0));

        return (info.ruleSetHash, agent);
    }

    /**
     * @notice List semua agent yang punya active rule.
     */
    function getAgentsWithRules()
        external
        view
        returns (address[] memory agents, bytes32[] memory hashes)
    {
        uint256 count = agentRegistry.getAgentCount();
        uint256 activeCount = 0;

        // First pass: count active
        for (uint256 i = 0; i < count; i++) {
            address agent = agentRegistry.agentList(i);
            if (agentRules[agent].active) activeCount++;
        }

        agents = new address[](activeCount);
        hashes = new bytes32[](activeCount);
        uint256 j = 0;

        for (uint256 i = 0; i < count; i++) {
            address agent = agentRegistry.agentList(i);
            if (agentRules[agent].active) {
                agents[j] = agent;
                hashes[j] = agentRules[agent].ruleSetHash;
                j++;
            }
        }
    }
}
