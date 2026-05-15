// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockEthUsdOracle
 * @notice Mock Chainlink ETH/USD oracle untuk testing.
 * @dev FIX: setPrice() sebelumnya tidak punya access control — siapapun
 *      bisa manipulasi harga di shared testnet. Sekarang hanya owner
 *      yang bisa update harga.
 *
 *      HANYA UNTUK TESTING — jangan deploy ke mainnet.
 */
contract MockEthUsdOracle {
    int256  private price;
    uint8   public constant decimals = 8;
    uint256 private lastUpdatedAt;

    address public owner;

    error NotOwner();
    error InvalidPrice();

    event PriceUpdated(int256 newPrice, uint256 updatedAt);
    event OwnershipTransferred(address indexed prev, address indexed next);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(int256 initialPrice) {
        require(initialPrice > 0, "INVALID_INITIAL_PRICE");
        price         = initialPrice;
        lastUpdatedAt = block.timestamp;
        owner         = msg.sender;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80  roundId,
            int256  answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80  answeredInRound
        )
    {
        return (1, price, lastUpdatedAt, lastUpdatedAt, 1);
    }

    /**
     * @notice Update harga ETH/USD.
     * @dev FIX: Sekarang hanya owner yang bisa memanggil ini.
     *      Sebelumnya tidak ada access control — siapapun bisa
     *      manipulasi harga di shared testnet.
     */
    function setPrice(int256 newPrice) external onlyOwner {
        if (newPrice <= 0) revert InvalidPrice();
        price         = newPrice;
        lastUpdatedAt = block.timestamp;
        emit PriceUpdated(newPrice, block.timestamp);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDRESS");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
