// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VindexRegistry
 * @notice Vindex Reputation & Anti-Scam Network (VRAN)
 *
 * Provides a decentralized trust layer for PAY.ID and other Web3 protocols.
 * Features:
 *   - Reputation scores (0–1000, base 500)
 *   - Community-driven staked reporting
 *   - Blacklist for verified bad actors
 *   - Web of Trust consensus (high-rep reporters weighted more)
 *   - EAS-compatible attestation triggers
 *
 * Deploy flow:
 *   1. Deploy via CREATE2 → address sama di semua chain
 *   2. Call initialize(adminAddress) per chain
 */
contract VindexRegistry is AccessControl, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                                 ROLES
    //////////////////////////////////////////////////////////////*/
    bytes32 public constant ENGINE_ROLE = keccak256("ENGINE_ROLE");
    bytes32 public constant SENTINEL_ROLE = keccak256("SENTINEL_ROLE");

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/
    bool private _initialized;

    /// @notice Minimum stake (wei) required to submit a report
    uint256 public minStake = 0.001 ether;

    /// @notice Number of unique high-reputation reporter confirmations needed
    uint8 public consensusThreshold = 3;

    /// @notice Minimum reporter reputation to count toward consensus
    uint16 public minReporterReputation = 700;

    /// @notice Reputation score per address (0–1000)
    mapping(address => uint16) public reputationOf;

    /// @notice Whether an address is globally blacklisted
    mapping(address => bool) public isBlacklisted;

    /// @notice Report ID counter
    uint256 public reportCount;

    struct Report {
        address target;           /// who is being reported
        address reporter;         /// who filed the report
        string evidenceHash;      /// IPFS / Arweave CID of evidence
        uint256 stake;            /// ETH staked by reporter
        uint256 timestamp;
        uint8 confirmations;      /// unique high-reputation confirmations
        bool resolved;            /// true if consensus reached
        bool valid;               /// true if report was accepted
    }

    /// @notice reportId => Report
    mapping(uint256 => Report) public reports;

    /// @notice target => reportIds[]
    mapping(address => uint256[]) public reportsAgainst;

    /// @notice target => reporter => hasConfirmed (for consensus tracking)
    mapping(address => mapping(address => bool)) public hasConfirmed;

    /// @notice reporter => total successful reports
    mapping(address => uint256) public successfulReports;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/
    event ReputationUpdated(address indexed account, uint16 oldScore, uint16 newScore, string reason);
    event Blacklisted(address indexed account, uint256 reportId, string evidenceHash);
    event Unblacklisted(address indexed account, string reason);
    event ReportSubmitted(uint256 indexed reportId, address indexed target, address indexed reporter, string evidenceHash, uint256 stake);
    event ReportConfirmed(uint256 indexed reportId, address indexed confirmer);
    event ReportResolved(uint256 indexed reportId, bool valid, uint16 reputationDelta);
    event MinStakeUpdated(uint256 oldValue, uint256 newValue);
    event ConsensusThresholdUpdated(uint8 oldValue, uint8 newValue);

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/
    modifier whenInitialized() {
        require(_initialized, "VRAN: not initialized");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            INITIALIZATION
    //////////////////////////////////////////////////////////////*/
    function initialize(address admin) external {
        require(!_initialized, "VRAN: already initialized");
        _initialized = true;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ENGINE_ROLE, admin);
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW HELPERS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Returns the reputation score for an account (default 500)
     */
    function getReputation(address account) external view returns (uint16) {
        uint16 score = reputationOf[account];
        return score == 0 ? 500 : score;
    }

    /**
     * @notice Returns all report IDs filed against a target
     */
    function getReportsAgainst(address target) external view returns (uint256[] memory) {
        return reportsAgainst[target];
    }

    /**
     * @notice Returns true if an account is safe (not blacklisted, rep >= threshold)
     */
    function isTrusted(address account, uint16 threshold) external view returns (bool) {
        return !isBlacklisted[account] && this.getReputation(account) >= threshold;
    }

    /*//////////////////////////////////////////////////////////////
                         REPORTING & CONSENSUS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Submit a staked report against a target address.
     * @param target       Address being reported
     * @param evidenceHash IPFS / Arweave CID of evidence package
     */
    function submitReport(address target, string calldata evidenceHash) external payable nonReentrant whenInitialized {
        require(msg.value >= minStake, "VRAN: insufficient stake");
        require(target != msg.sender, "VRAN: cannot self-report");
        require(bytes(evidenceHash).length > 0, "VRAN: evidence required");

        uint256 id = ++reportCount;
        reports[id] = Report({
            target: target,
            reporter: msg.sender,
            evidenceHash: evidenceHash,
            stake: msg.value,
            timestamp: block.timestamp,
            confirmations: 1,
            resolved: false,
            valid: false
        });
        reportsAgainst[target].push(id);

        emit ReportSubmitted(id, target, msg.sender, evidenceHash, msg.value);

        // Auto-resolve if reporter is high-reputation and threshold is low
        if (this.getReputation(msg.sender) >= minReporterReputation && consensusThreshold <= 1) {
            _resolveReport(id, true);
        }
    }

    /**
     * @notice A high-reputation sentinel confirms an existing report.
     * @param reportId Report to confirm
     */
    function confirmReport(uint256 reportId) external whenInitialized {
        Report storage r = reports[reportId];
        require(r.target != address(0), "VRAN: report not found");
        require(!r.resolved, "VRAN: already resolved");
        require(r.reporter != msg.sender, "VRAN: cannot confirm own");
        require(!hasConfirmed[r.target][msg.sender], "VRAN: already confirmed");

        uint16 rep = this.getReputation(msg.sender);
        require(rep >= minReporterReputation, "VRAN: rep too low");

        r.confirmations += 1;
        hasConfirmed[r.target][msg.sender] = true;

        emit ReportConfirmed(reportId, msg.sender);

        if (r.confirmations >= consensusThreshold) {
            _resolveReport(reportId, true);
        }
    }

    /**
     * @notice Admin / Engine can resolve a report manually (e.g., after off-chain AI review)
     */
    function resolveReport(uint256 reportId, bool valid) external whenInitialized {
        require(hasRole(ENGINE_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "VRAN: unauthorized");
        _resolveReport(reportId, valid);
    }

    /**
     * @notice Slash a false reporter and return stakes to victim.
     * Called when a report is proven malicious/false.
     */
    function slashReporter(uint256 reportId) external nonReentrant whenInitialized {
        require(hasRole(ENGINE_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "VRAN: unauthorized");
        Report storage r = reports[reportId];
        require(!r.resolved || !r.valid, "VRAN: cannot slash valid report");

        // Return victim stake if any was slashed
        (bool sent, ) = r.target.call{value: r.stake}("");
        require(sent, "VRAN: refund failed");

        // Penalize reporter reputation
        _updateReputation(r.reporter, 100, "False report slashed");

        r.resolved = true;
        r.valid = false;
    }

    /*//////////////////////////////////////////////////////////////
                         REPUTATION MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Engine can adjust reputation (e.g., after analysis)
     */
    function adjustReputation(address account, uint16 newScore, string calldata reason) external whenInitialized {
        require(hasRole(ENGINE_ROLE, msg.sender), "VRAN: not engine");
        require(newScore <= 1000, "VRAN: max 1000");
        uint16 old = reputationOf[account];
        reputationOf[account] = newScore;
        emit ReputationUpdated(account, old, newScore, reason);
    }

    /**
     * @notice Batch adjust reputation for multiple accounts.
     */
    function batchAdjustReputation(address[] calldata accounts, uint16[] calldata scores, string calldata reason) external whenInitialized {
        require(hasRole(ENGINE_ROLE, msg.sender), "VRAN: not engine");
        require(accounts.length == scores.length, "VRAN: length mismatch");
        for (uint256 i = 0; i < accounts.length; i++) {
            require(scores[i] <= 1000, "VRAN: max 1000");
            uint16 old = reputationOf[accounts[i]];
            reputationOf[accounts[i]] = scores[i];
            emit ReputationUpdated(accounts[i], old, scores[i], reason);
        }
    }

    /*//////////////////////////////////////////////////////////////
                         BLACKLIST MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Blacklist an account immediately (admin or engine)
     */
    function blacklist(address account, uint256 reportId, string calldata evidenceHash) external whenInitialized {
        require(hasRole(ENGINE_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "VRAN: unauthorized");
        isBlacklisted[account] = true;
        emit Blacklisted(account, reportId, evidenceHash);
    }

    /**
     * @notice Remove an address from the blacklist
     */
    function unblacklist(address account, string calldata reason) external whenInitialized {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "VRAN: not admin");
        isBlacklisted[account] = false;
        emit Unblacklisted(account, reason);
    }

    /*//////////////////////////////////////////////////////////////
                            CONFIGURATION
    //////////////////////////////////////////////////////////////*/

    function setMinStake(uint256 newStake) external whenInitialized {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "VRAN: not admin");
        uint256 old = minStake;
        minStake = newStake;
        emit MinStakeUpdated(old, newStake);
    }

    function setConsensusThreshold(uint8 newThreshold) external whenInitialized {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "VRAN: not admin");
        uint8 old = consensusThreshold;
        consensusThreshold = newThreshold;
        emit ConsensusThresholdUpdated(old, newThreshold);
    }

    /*//////////////////////////////////////////////////////////////
                         INTERNAL HELPERS
    //////////////////////////////////////////////////////////////*/

    function _resolveReport(uint256 reportId, bool valid) internal {
        Report storage r = reports[reportId];
        if (r.resolved) return;

        r.resolved = true;
        r.valid = valid;

        if (valid) {
            // Penalize target
            uint16 currentRep = this.getReputation(r.target);
            uint16 penalty = currentRep > 200 ? 200 : currentRep;
            uint16 newRep = currentRep - penalty;
            _updateReputation(r.target, newRep, "Report confirmed");

            // Reward reporter
            successfulReports[r.reporter]++;
            uint16 repGain = this.getReputation(r.reporter) < 900 ? 10 : 0;
            if (repGain > 0) {
                _updateReputation(r.reporter, this.getReputation(r.reporter) + repGain, "Valid report reward");
            }

            // Auto-blacklist if reputation drops below 100
            if (newRep < 100) {
                isBlacklisted[r.target] = true;
                emit Blacklisted(r.target, reportId, r.evidenceHash);
            }

            emit ReportResolved(reportId, true, penalty);
        } else {
            // Refund reporter stake
            (bool sent, ) = r.reporter.call{value: r.stake}("");
            require(sent, "VRAN: stake refund failed");
            emit ReportResolved(reportId, false, 0);
        }
    }

    function _updateReputation(address account, uint16 newScore, string memory reason) internal {
        uint16 old = reputationOf[account];
        reputationOf[account] = newScore;
        emit ReputationUpdated(account, old == 0 ? 500 : old, newScore, reason);
    }

    /*//////////////////////////////////////////////////////////////
                              RECEIVE
    //////////////////////////////////////////////////////////////*/

    receive() external payable {}
}
