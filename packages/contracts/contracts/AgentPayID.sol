// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PayIDVerifier.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title AgentPayID
 * @notice Integration for 0G Agent ID (ERC-7857)
 * 
 * This contract allows linking an Agent ID to a PayID Rule Set.
 * AI Agents can own their own payment policies.
 */
contract AgentPayID {
    
    // 0G Agent ID Registry (INFT)
    address public agentRegistry;
    
    // PayID Verifier
    PayIDVerifier public verifier;

    // Mapping AgentID TokenID => RuleSetHash
    mapping(uint256 => bytes32) public agentRules;

    event AgentRuleLinked(uint256 indexed agentTokenId, bytes32 indexed ruleSetHash);

    constructor(address _agentRegistry, address _verifier) {
        agentRegistry = _agentRegistry;
        verifier = PayIDVerifier(_verifier);
    }

    /**
     * @notice Link an Agent ID to a Rule Set
     * @param agentTokenId The ID of the Agent NFT (ERC-7857)
     * @param ruleSetHash The hash of the Rule Set in RuleAuthority
     */
    function linkAgentRule(uint256 agentTokenId, bytes32 ruleSetHash) external {
        // Verify caller owns the Agent NFT
        require(IERC721(agentRegistry).ownerOf(agentTokenId) == msg.sender, "NOT_AGENT_OWNER");
        
        agentRules[agentTokenId] = ruleSetHash;
        emit AgentRuleLinked(agentTokenId, ruleSetHash);
    }

    /**
     * @notice Verify if a payment is allowed for an Agent
     * @param agentTokenId The ID of the Agent NFT
     * @param d The PayID Decision
     * @param sig The signature
     */
    function verifyAgentPayment(
        uint256 agentTokenId,
        PayIDVerifier.Decision calldata d,
        bytes calldata sig
    ) external {
        // 1. Ensure the Decision matches the Agent's registered Rule Set
        require(agentRules[agentTokenId] == d.ruleSetHash, "AGENT_RULE_MISMATCH");

        // 2. Perform standard PayID verification
        verifier.requireAllowed(d, sig);
        
        // 3. Additional Agent-specific checks could go here
        // (e.g., checking Agent status in 0G Registry)
    }
}
