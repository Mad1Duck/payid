// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IDRX
 * @dev Indonesian Rupiah-pegged token (2 decimals like IDR)
 * @custom:icon https://cryptologos.cc/logos/idrx-idrx-logo.png
 */
contract IDRX is ERC20, Ownable {

    // ─── Constants ───────────────────────────────────────────────────────────

    uint256 public constant MAX_SUPPLY = 1_000_000_000_000 * 10**2; // 1 Trillion IDRX

    // ─── State ───────────────────────────────────────────────────────────────

    mapping(address => uint256) private _locked;      // tokens locked per address
    mapping(address => uint256) private _claimable;   // tokens ready to be claimed

    // ─── Events ──────────────────────────────────────────────────────────────

    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);
    event Released(address indexed to, uint256 amount);
    event Claimed(address indexed by, uint256 amount);

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor() ERC20("IDRX", "IDRX") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000_000 * 10**2); // Initial supply: 1 Billion IDRX
    }

    // ─── Decimals (IDR uses 2 decimals) ──────────────────────────────────────

    function decimals() public pure override returns (uint8) {
        return 2;
    }

    // ─── Supply Cap ───────────────────────────────────────────────────────────

    /**
     * @notice Returns the maximum supply cap
     */
    function cap() public pure returns (uint256) {
        return MAX_SUPPLY;
    }

    /**
     * @notice Alias for cap() — returns MAX_SUPPLY
     */
    function maxSupply() public pure returns (uint256) {
        return MAX_SUPPLY;
    }

    // ─── Mint ─────────────────────────────────────────────────────────────────

    /**
     * @notice Mint new IDRX tokens (onlyOwner, respects MAX_SUPPLY cap)
     * @param to Recipient address
     * @param amount Amount to mint (in smallest unit, 2 decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "IDRX: cap exceeded");
        _mint(to, amount);
        emit Minted(to, amount);
    }

    // ─── Burn ─────────────────────────────────────────────────────────────────

    /**
     * @notice Burn tokens from caller's balance
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit Burned(msg.sender, amount);
    }

    // ─── Release ──────────────────────────────────────────────────────────────

    /**
     * @notice Owner locks tokens for a recipient and marks them as claimable
     * @dev Transfers tokens from owner to contract, marks them for `to` to claim
     * @param to Address that will be able to claim
     * @param amount Amount to release/lock for claiming
     */
    function release(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "IDRX: zero address");
        require(balanceOf(owner()) >= amount, "IDRX: insufficient balance");

        _transfer(owner(), address(this), amount);
        _claimable[to] += amount;
        _locked[to]    += amount;

        emit Released(to, amount);
    }

    // ─── Claim ────────────────────────────────────────────────────────────────

    /**
     * @notice Caller claims their released/claimable IDRX tokens
     */
    function claim() external {
        uint256 amount = _claimable[msg.sender];
        require(amount > 0, "IDRX: nothing to claim");

        _claimable[msg.sender] = 0;
        _locked[msg.sender]    = 0;

        _transfer(address(this), msg.sender, amount);

        emit Claimed(msg.sender, amount);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /**
     * @notice Returns how many tokens are claimable by an address
     */
    function claimableOf(address account) external view returns (uint256) {
        return _claimable[account];
    }

    /**
     * @notice Returns how many tokens are locked for an address
     */
    function lockedOf(address account) external view returns (uint256) {
        return _locked[account];
    }

    // ─── Approve override ────────────────────────────────────────────────────

    function approve(address spender, uint256 amount) public override returns (bool) {
        return super.approve(spender, amount);
    }
}