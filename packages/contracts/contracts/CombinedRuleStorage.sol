// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRuleLicense {
    function ownerOf(uint256 tokenId) external view returns (address);
    function ruleExpiry(uint256 tokenId) external view returns (uint256);
    function ruleTokenId(uint256 ruleId) external view returns (uint256);
    function tokenRule(uint256 tokenId) external view returns (uint256);
    function getRule(uint256 ruleId)
        external
        view
        returns (
            bytes32,
            string memory,
            address,
            uint256,
            uint16,
            bool,
            bool
        );
}

contract CombinedRuleStorage {
    struct RuleRef {
        address ruleNFT;
        uint256 tokenId;
    }

    struct CombinedRule {
        address owner;
        bytes32 ruleSetHash;
        RuleRef[] rules;
        uint64 version;
        bool active;
    }

    enum RuleDirection {
        INBOUND,
        OUTBOUND
    }

    /* ===================== ERRORS ===================== */
    error InvalidRuleNFTContract();
    error NotRuleNFTOwner();
    error RuleExpired();
    error RuleDeprecated();
    error RuleNotActive();
    error InvalidHash();
    error EmptyRuleSet();
    error MaxRulesExceeded();
    error ArrayLengthMismatch();
    error RuleNFTAlreadyUsed();
    error NoActiveRule();
    error NoActiveRuleForDirection();
    error EmptyRules();
    error RuleNFTOwnershipSplit();

    /* ===================== STORAGE ===================== */
    mapping(address => mapping(uint256 => bool)) public usedRuleNFT;
    uint256 public constant MAX_RULES = 10;

    mapping(bytes32 => CombinedRule) private rules;

    mapping(address => bytes32) public activeRuleOf;

    mapping(address => mapping(RuleDirection => bytes32))
        public activeRuleOfByDirection;

    bytes32[] private allRuleSetHashes;
    mapping(bytes32 => bool) private exists;

    /* ===================== EVENTS ===================== */

    event CombinedRuleRegistered(
        bytes32 indexed ruleSetHash,
        address indexed owner,
        uint64 version
    );

    event CombinedRuleDeactivated(bytes32 indexed ruleSetHash);

    event CombinedRuleOwnershipSynced(
        bytes32 indexed ruleSetHash,
        address indexed oldOwner,
        address indexed newOwner
    );

    event CombinedRuleRegisteredWithDirection(
        bytes32 indexed ruleSetHash,
        address indexed owner,
        RuleDirection indexed direction,
        uint64 version
    );

    /* ===================== INTERNAL VALIDATION ===================== */

    function _validateRuleNFT(
        address ruleNFT,
        uint256 tokenId,
        address caller
    ) internal view {
        // FIX: gunakan custom errors, bukan require string
        if (ruleNFT.code.length == 0) revert InvalidRuleNFTContract();

        IRuleLicense nft = IRuleLicense(ruleNFT);

        if (nft.ownerOf(tokenId) != caller) revert NotRuleNFTOwner();

        uint256 expiry = nft.ruleExpiry(tokenId);
        if (expiry != 0 && expiry < block.timestamp) revert RuleExpired();

        uint256 ruleId = nft.tokenRule(tokenId);
        (, , , , , bool deprecated, bool active) = nft.getRule(ruleId);

        if (deprecated) revert RuleDeprecated();
        if (!active) revert RuleNotActive();
    }

    /* ===================== VIEW ===================== */

    function isActive(bytes32 ruleSetHash) external view returns (bool) {
        return rules[ruleSetHash].active;
    }

    function listAllRuleSetHashes()
        external
        view
        returns (bytes32[] memory)
    {
        return allRuleSetHashes;
    }

    function getActiveRuleOf(address owner)
        external
        view
        returns (bytes32 ruleSetHash)
    {
        ruleSetHash = activeRuleOf[owner];
        if (ruleSetHash == bytes32(0)) revert NoActiveRule();
    }

    function getActiveRuleOfByDirection(
        address owner,
        RuleDirection direction
    ) external view returns (bytes32 ruleSetHash) {
        ruleSetHash = activeRuleOfByDirection[owner][direction];
        if (ruleSetHash == bytes32(0)) revert NoActiveRuleForDirection();
    }

    function getRuleByHash(
        bytes32 ruleSetHash
    )
        external
        view
        returns (
            address owner,
            RuleRef[] memory ruleRefs,
            uint64 version
        )
    {
        CombinedRule storage r = rules[ruleSetHash];
        if (!r.active) revert RuleNotActive();

        return (r.owner, r.rules, r.version);
    }

    /* ===================== MUTATION ===================== */

    function registerCombinedRule(
        bytes32 ruleSetHash,
        address[] calldata ruleNFTs,
        uint256[] calldata tokenIds,
        uint64 version
    ) external {
        _registerInternal(
            ruleSetHash,
            ruleNFTs,
            tokenIds,
            version,
            true,
            RuleDirection.OUTBOUND
        );
    }

    function registerCombinedRuleForDirection(
        bytes32 ruleSetHash,
        RuleDirection direction,
        address[] calldata ruleNFTs,
        uint256[] calldata tokenIds,
        uint64 version
    ) external {
        _registerInternal(
            ruleSetHash,
            ruleNFTs,
            tokenIds,
            version,
            false,
            direction
        );
    }

    function _unlock(bytes32 hash) internal {
        RuleRef[] storage refs = rules[hash].rules;

        for (uint256 i = 0; i < refs.length; i++) {
            usedRuleNFT[refs[i].ruleNFT][refs[i].tokenId] = false;
        }
    }

    function _registerInternal(
        bytes32 ruleSetHash,
        address[] calldata ruleNFTs,
        uint256[] calldata tokenIds,
        uint64 version,
        bool legacy,
        RuleDirection direction
    ) internal {
        if (ruleSetHash == bytes32(0)) revert InvalidHash();
        if (ruleNFTs.length == 0) revert EmptyRuleSet();
        if (ruleNFTs.length > MAX_RULES) revert MaxRulesExceeded();
        if (ruleNFTs.length != tokenIds.length) revert ArrayLengthMismatch();

        if (legacy) {
            bytes32 prev = activeRuleOf[msg.sender];
            if (prev != bytes32(0)) {
                _unlock(prev);
                rules[prev].active = false;
                emit CombinedRuleDeactivated(prev);
            }
        } else {
            bytes32 prev = activeRuleOfByDirection[msg.sender][direction];
            if (prev != bytes32(0)) {
                _unlock(prev);
                rules[prev].active = false;
                emit CombinedRuleDeactivated(prev);
            }
        }

        if (!exists[ruleSetHash]) {
            exists[ruleSetHash] = true;
            allRuleSetHashes.push(ruleSetHash);
        }

        CombinedRule storage r = rules[ruleSetHash];
        delete r.rules;

        for (uint256 i = 0; i < ruleNFTs.length; i++) {
            if (usedRuleNFT[ruleNFTs[i]][tokenIds[i]]) revert RuleNFTAlreadyUsed();

            usedRuleNFT[ruleNFTs[i]][tokenIds[i]] = true;
            _validateRuleNFT(ruleNFTs[i], tokenIds[i], msg.sender);

            r.rules.push(RuleRef({ ruleNFT: ruleNFTs[i], tokenId: tokenIds[i] }));
        }

        r.owner = msg.sender;
        r.ruleSetHash = ruleSetHash;
        r.version = version;
        r.active = true;

        if (legacy) {
            activeRuleOf[msg.sender] = ruleSetHash;
            emit CombinedRuleRegistered(ruleSetHash, msg.sender, version);
        } else {
            activeRuleOfByDirection[msg.sender][direction] = ruleSetHash;
            emit CombinedRuleRegisteredWithDirection(
                ruleSetHash,
                msg.sender,
                direction,
                version
            );
        }
    }

    /**
     * @notice Deactivate the caller's legacy combined rule.
     * @dev FIX #1: Reset activeRuleOfByDirection juga jika hash yang sama
     *      ada di sana — sebelumnya hanya reset activeRuleOf sehingga
     *      state korup untuk rule yang register via direction-based flow.
     */
    function deactivateMyCombinedRule() external {
        bytes32 hash = activeRuleOf[msg.sender];
        if (hash == bytes32(0)) revert NoActiveRule();

        rules[hash].active = false;
        activeRuleOf[msg.sender] = bytes32(0);

        if (activeRuleOfByDirection[msg.sender][RuleDirection.OUTBOUND] == hash) {
            activeRuleOfByDirection[msg.sender][RuleDirection.OUTBOUND] = bytes32(0);
        }
        if (activeRuleOfByDirection[msg.sender][RuleDirection.INBOUND] == hash) {
            activeRuleOfByDirection[msg.sender][RuleDirection.INBOUND] = bytes32(0);
        }

        _unlock(hash);
        emit CombinedRuleDeactivated(hash);
    }

    /**
     * @notice Deactivate a direction-specific combined rule.
     * @dev Fungsi baru — partner dari deactivateMyCombinedRule()
     *      untuk rule yang di-register via registerCombinedRuleForDirection.
     */
    function deactivateMyCombinedRuleForDirection(RuleDirection direction) external {
        bytes32 hash = activeRuleOfByDirection[msg.sender][direction];
        if (hash == bytes32(0)) revert NoActiveRuleForDirection();

        rules[hash].active = false;
        activeRuleOfByDirection[msg.sender][direction] = bytes32(0);

        if (activeRuleOf[msg.sender] == hash) {
            activeRuleOf[msg.sender] = bytes32(0);
        }

        _unlock(hash);
        emit CombinedRuleDeactivated(hash);
    }

    /**
     * @notice Sync ownership jika semua rule NFT berpindah ke owner baru.
     * @dev FIX #2: Sebelumnya hanya update activeRuleOf (legacy mapping).
     *      Sekarang juga reset activeRuleOfByDirection old owner dan bisa
     *      di-extend oleh caller untuk set direction-based mapping new owner
     *      jika diperlukan.
     */
    function syncOwner(bytes32 ruleSetHash) external {
        CombinedRule storage r = rules[ruleSetHash];
        if (!r.active) revert RuleNotActive();
        if (r.rules.length == 0) revert EmptyRules();

        address newOwner =
            IRuleLicense(r.rules[0].ruleNFT).ownerOf(r.rules[0].tokenId);

        for (uint256 i = 1; i < r.rules.length; i++) {
            if (
                IRuleLicense(r.rules[i].ruleNFT).ownerOf(r.rules[i].tokenId) != newOwner
            ) revert RuleNFTOwnershipSplit();
        }

        if (newOwner != r.owner) {
            address old = r.owner;

            // FIX: clear legacy mapping old owner
            if (activeRuleOf[old] == ruleSetHash) {
                activeRuleOf[old] = bytes32(0);
            }

            // FIX: clear direction-based mappings old owner
            if (activeRuleOfByDirection[old][RuleDirection.OUTBOUND] == ruleSetHash) {
                activeRuleOfByDirection[old][RuleDirection.OUTBOUND] = bytes32(0);
            }
            if (activeRuleOfByDirection[old][RuleDirection.INBOUND] == ruleSetHash) {
                activeRuleOfByDirection[old][RuleDirection.INBOUND] = bytes32(0);
            }

            r.owner = newOwner;
            activeRuleOf[newOwner] = ruleSetHash;

            emit CombinedRuleOwnershipSynced(ruleSetHash, old, newOwner);
        }
    }
}
