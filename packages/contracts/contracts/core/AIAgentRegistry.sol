// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AIAgentRegistry
 * @notice Dual registry: Admin agents (encrypted, minimal on-chain) & User agents (rich metadata, self-register).
 * @dev Admin agents: only admin can register. Metadata encrypted, only hash+URI on-chain.
 *      User agents: anyone can register. Rich metadata on-chain for discoverability.
 */
contract AIAgentRegistry {

    /* ─────────────────── ADMIN AGENT (minimal, encrypted) ─────────────────── */

    struct AdminAgent {
        address agentWallet;        // AI agent identity / payment receiver
        address owner;              // admin who manages this agent
        string  displayName;        // public display name (e.g. "Gift Bot")
        bytes32 metadataHash;       // keccak256(plaintext metadataJSON)
        string  encryptedURI;       // 0G Storage blob ID (encrypted metadata)
        string  publicEndpoint;     // public AI endpoint for user chat
        uint256 registeredAt;
        bool    active;
    }

    /* ─────────────────── USER AGENT (rich metadata, self-registered) ─────────────────── */

    struct UserAgent {
        address owner;
        string  handle;             // unique human-readable ID e.g. "mybot.0g"
        string  name;               // display name
        string  metadataURI;        // ipfs://... atau https://...
        string  modelType;          // e.g. "llama-3", "gpt-4", "custom"
        string  computeProvider;    // e.g. "0g-compute", "replicate"
        string  computeEndpoint;    // URL ke compute endpoint
        uint256 registeredAt;
        bool    active;
        bool    verified;           // verified by protocol/admin
        uint256 reputationScore;    // 0-1000, base 500
        uint256 totalInferences;
        uint256 lastActiveAt;
    }

    /* ===================== STORAGE ===================== */

    // Admin agents
    mapping(address => AdminAgent) public adminAgents;       // key = agentWallet
    mapping(address => bool)       public isAdminAgent;
    address[] public adminAgentList;

    // User agents
    mapping(address => UserAgent) public userAgents;         // key = owner address
    mapping(address => bool)      public isUserAgent;
    mapping(string => address)    public resolveUserHandle;  // handle => owner
    mapping(address => string)    public userAgentHandleOf;  // owner => handle
    address[] public userAgentList;

    // Access control
    address public admin;
    mapping(address => bool) public isVerifier;

    /* ===================== ERRORS ===================== */
    error AlreadyRegistered();
    error NotRegistered();
    error NotAgentOwner();
    error NotAdmin();
    error NotVerifier();
    error InvalidName();
    error HandleTaken();
    error InvalidHandle();
    error HandleTooLong();
    error HandleTooShort();
    error AgentWalletTaken();

    /* ===================== EVENTS ===================== */
    event AdminAgentRegistered(
        address indexed agentWallet,
        address indexed owner,
        string  displayName,
        bytes32 metadataHash
    );
    event AdminAgentUpdated(
        address indexed agentWallet,
        bytes32 metadataHash
    );
    event AdminAgentDeactivated(address indexed agentWallet);
    event UserAgentRegistered(
        address indexed owner,
        string  name,
        string  metadataURI,
        string  modelType,
        string  computeProvider
    );
    event UserAgentUpdated(
        address indexed owner,
        string  name,
        string  metadataURI,
        string  modelType,
        string  computeProvider
    );
    event UserAgentDeactivated(address indexed owner);
    event UserAgentReactivated(address indexed owner);
    event UserAgentVerified(address indexed owner);
    event InferenceRecorded(address indexed owner, uint256 total);
    event ReputationUpdated(address indexed owner, uint256 newScore);

    /* ===================== CONSTRUCTOR ===================== */

    constructor() {
        admin = msg.sender;
        isVerifier[msg.sender] = true;
    }

    /* ===================== MODIFIERS ===================== */

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyVerifier() {
        if (!isVerifier[msg.sender]) revert NotVerifier();
        _;
    }

    /* ===================== HELPERS ===================== */

    function _validateHandle(string calldata handle) internal pure {
        bytes memory h = bytes(handle);
        if (h.length < 3) revert HandleTooShort();
        if (h.length > 32) revert HandleTooLong();
        for (uint256 i = 0; i < h.length; i++) {
            bytes1 c = h[i];
            bool isLower = (c >= 0x61 && c <= 0x7A); // a-z
            bool isDigit = (c >= 0x30 && c <= 0x39); // 0-9
            bool isSpecial = (c == 0x2D || c == 0x5F || c == 0x2E); // - _ .
            if (!isLower && !isDigit && !isSpecial) revert InvalidHandle();
        }
    }

    /* ─────────────────── ADMIN AGENT MUTATION ─────────────────── */

    /**
     * @notice Register an admin-managed AI agent (minimal on-chain footprint).
     * @param agentWallet     Address that represents the AI agent / receives payments
     * @param displayName     Public display name shown to users
     * @param metadataHash    keccak256(plaintext metadataJSON) for verifiability
     * @param encryptedURI    0G Storage blob ID containing encrypted metadata
     * @param publicEndpoint  Public AI endpoint URL for user chat
     */
    function registerAdminAgent(
        address agentWallet,
        string calldata displayName,
        bytes32 metadataHash,
        string calldata encryptedURI,
        string calldata publicEndpoint
    ) external onlyAdmin {
        if (isAdminAgent[agentWallet]) revert AlreadyRegistered();
        if (bytes(displayName).length == 0 || bytes(displayName).length > 64) revert InvalidName();

        adminAgents[agentWallet] = AdminAgent({
            agentWallet: agentWallet,
            owner: msg.sender,
            displayName: displayName,
            metadataHash: metadataHash,
            encryptedURI: encryptedURI,
            publicEndpoint: publicEndpoint,
            registeredAt: block.timestamp,
            active: true
        });

        isAdminAgent[agentWallet] = true;
        adminAgentList.push(agentWallet);

        emit AdminAgentRegistered(agentWallet, msg.sender, displayName, metadataHash);
    }

    /**
     * @notice Update admin agent metadata.
     */
    function updateAdminAgent(
        address agentWallet,
        string calldata displayName,
        bytes32 metadataHash,
        string calldata encryptedURI,
        string calldata publicEndpoint
    ) external onlyAdmin {
        if (!isAdminAgent[agentWallet]) revert NotRegistered();
        if (bytes(displayName).length == 0 || bytes(displayName).length > 64) revert InvalidName();

        AdminAgent storage a = adminAgents[agentWallet];
        a.displayName = displayName;
        a.metadataHash = metadataHash;
        a.encryptedURI = encryptedURI;
        a.publicEndpoint = publicEndpoint;

        emit AdminAgentUpdated(agentWallet, metadataHash);
    }

    function deactivateAdminAgent(address agentWallet) external onlyAdmin {
        if (!isAdminAgent[agentWallet]) revert NotRegistered();
        adminAgents[agentWallet].active = false;
        emit AdminAgentDeactivated(agentWallet);
    }

    function reactivateAdminAgent(address agentWallet) external onlyAdmin {
        if (!isAdminAgent[agentWallet]) revert NotRegistered();
        adminAgents[agentWallet].active = true;
    }

    /* ─────────────────── USER AGENT MUTATION ─────────────────── */

    /**
     * @notice Register yourself as a User AI Agent (rich metadata, discoverable).
     * @param handle          Unique handle (a-z, 0-9, -, _, .) max 32 chars
     * @param name            Nama agent (max 64 chars)
     * @param metadataURI     IPFS/URL ke metadata lengkap
     * @param modelType       Tipe model AI
     * @param computeProvider Provider compute
     * @param computeEndpoint URL ke compute endpoint
     */
    function registerUserAgent(
        string calldata handle,
        string calldata name,
        string calldata metadataURI,
        string calldata modelType,
        string calldata computeProvider,
        string calldata computeEndpoint
    ) external {
        if (isUserAgent[msg.sender]) revert AlreadyRegistered();
        if (bytes(name).length == 0 || bytes(name).length > 64) revert InvalidName();
        _validateHandle(handle);
        if (resolveUserHandle[handle] != address(0)) revert HandleTaken();

        userAgents[msg.sender] = UserAgent({
            owner: msg.sender,
            handle: handle,
            name: name,
            metadataURI: metadataURI,
            modelType: modelType,
            computeProvider: computeProvider,
            computeEndpoint: computeEndpoint,
            registeredAt: block.timestamp,
            active: true,
            verified: false,
            reputationScore: 500,
            totalInferences: 0,
            lastActiveAt: block.timestamp
        });

        isUserAgent[msg.sender] = true;
        userAgentList.push(msg.sender);
        resolveUserHandle[handle] = msg.sender;
        userAgentHandleOf[msg.sender] = handle;

        emit UserAgentRegistered(msg.sender, name, metadataURI, modelType, computeProvider);
    }

    /**
     * @notice Update user agent metadata.
     */
    function updateUserAgent(
        string calldata name,
        string calldata metadataURI,
        string calldata modelType,
        string calldata computeProvider,
        string calldata computeEndpoint
    ) external {
        if (!isUserAgent[msg.sender]) revert NotRegistered();
        if (bytes(name).length == 0 || bytes(name).length > 64) revert InvalidName();

        UserAgent storage a = userAgents[msg.sender];
        a.name = name;
        a.metadataURI = metadataURI;
        a.modelType = modelType;
        a.computeProvider = computeProvider;
        a.computeEndpoint = computeEndpoint;

        emit UserAgentUpdated(msg.sender, name, metadataURI, modelType, computeProvider);
    }

    function deactivateUserAgent() external {
        if (!isUserAgent[msg.sender]) revert NotRegistered();
        userAgents[msg.sender].active = false;
        emit UserAgentDeactivated(msg.sender);
    }

    function reactivateUserAgent() external {
        if (!isUserAgent[msg.sender]) revert NotRegistered();
        userAgents[msg.sender].active = true;
        emit UserAgentReactivated(msg.sender);
    }

    /**
     * @notice Verify a user agent (admin/verifier only).
     */
    function verifyUserAgent(address owner) external onlyVerifier {
        if (!isUserAgent[owner]) revert NotRegistered();
        userAgents[owner].verified = true;
        emit UserAgentVerified(owner);
    }

    /**
     * @notice Record an inference for user agent reputation.
     */
    function recordUserInference() external {
        if (!isUserAgent[msg.sender]) revert NotRegistered();
        UserAgent storage a = userAgents[msg.sender];
        a.totalInferences++;
        a.lastActiveAt = block.timestamp;
        emit InferenceRecorded(msg.sender, a.totalInferences);
    }

    /**
     * @notice Update user agent reputation (verifier only).
     */
    function updateUserReputation(address owner, uint256 newScore) external onlyVerifier {
        if (!isUserAgent[owner]) revert NotRegistered();
        if (newScore > 1000) newScore = 1000;
        userAgents[owner].reputationScore = newScore;
        emit ReputationUpdated(owner, newScore);
    }

    /* ===================== ADMIN ===================== */

    function setVerifier(address verifier, bool status) external onlyAdmin {
        isVerifier[verifier] = status;
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }

    /* ===================== VIEW: ADMIN AGENTS ===================== */

    function getAdminAgent(address agentWallet) external view returns (AdminAgent memory) {
        return adminAgents[agentWallet];
    }

    function getAllAdminAgents() external view returns (AdminAgent[] memory) {
        AdminAgent[] memory result = new AdminAgent[](adminAgentList.length);
        for (uint256 i = 0; i < adminAgentList.length; i++) {
            result[i] = adminAgents[adminAgentList[i]];
        }
        return result;
    }

    function getActiveAdminAgents() external view returns (AdminAgent[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < adminAgentList.length; i++) {
            if (adminAgents[adminAgentList[i]].active) activeCount++;
        }

        AdminAgent[] memory result = new AdminAgent[](activeCount);
        uint256 j = 0;
        for (uint256 i = 0; i < adminAgentList.length; i++) {
            if (adminAgents[adminAgentList[i]].active) {
                result[j] = adminAgents[adminAgentList[i]];
                j++;
            }
        }
        return result;
    }

    function getAdminAgentCount() external view returns (uint256) {
        return adminAgentList.length;
    }

    /* ===================== VIEW: USER AGENTS ===================== */

    function getUserAgent(address owner) external view returns (UserAgent memory) {
        return userAgents[owner];
    }

    function getUserAgentByHandle(string calldata handle) external view returns (UserAgent memory) {
        address owner = resolveUserHandle[handle];
        if (owner == address(0)) revert NotRegistered();
        return userAgents[owner];
    }

    function getAllUserAgents() external view returns (UserAgent[] memory) {
        UserAgent[] memory result = new UserAgent[](userAgentList.length);
        for (uint256 i = 0; i < userAgentList.length; i++) {
            result[i] = userAgents[userAgentList[i]];
        }
        return result;
    }

    function getActiveUserAgents() external view returns (UserAgent[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < userAgentList.length; i++) {
            if (userAgents[userAgentList[i]].active) activeCount++;
        }

        UserAgent[] memory result = new UserAgent[](activeCount);
        uint256 j = 0;
        for (uint256 i = 0; i < userAgentList.length; i++) {
            if (userAgents[userAgentList[i]].active) {
                result[j] = userAgents[userAgentList[i]];
                j++;
            }
        }
        return result;
    }

    function getVerifiedUserAgents() external view returns (UserAgent[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < userAgentList.length; i++) {
            if (userAgents[userAgentList[i]].active && userAgents[userAgentList[i]].verified) count++;
        }

        UserAgent[] memory result = new UserAgent[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < userAgentList.length; i++) {
            if (userAgents[userAgentList[i]].active && userAgents[userAgentList[i]].verified) {
                result[j] = userAgents[userAgentList[i]];
                j++;
            }
        }
        return result;
    }

    function getUserAgentCount() external view returns (uint256) {
        return userAgentList.length;
    }

    /* ===================== BACKWARD COMPATIBILITY ===================== */

    /**
     * @notice Check if address is registered as either admin or user agent.
     * @dev Backward compat for AIAgentRuleManager and other consumers.
     */
    function isRegistered(address addr) external view returns (bool) {
        return isAdminAgent[addr] || isUserAgent[addr];
    }

    /**
     * @notice Backward compat: returns user agent count.
     */
    function getAgentCount() external view returns (uint256) {
        return userAgentList.length;
    }

    /**
     * @notice Backward compat: returns user agent address by index.
     */
    function agentList(uint256 index) external view returns (address) {
        return userAgentList[index];
    }
}
