// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title RevenueSplitter
 * @notice Enhanced revenue split contract with oracle-based enforcement
 * @dev Only authorized oracle (Stripe webhook server) can process payments
 */
contract RevenueSplitter {
    address public brand;
    address public oracle; // Authorized Stripe webhook server
    address public licensee;

    uint256 public constant ACTIVE_BRAND_SHARE = 6;
    uint256 public constant ACTIVE_LICENSEE_SHARE = 94;
    uint256 public constant INACTIVE_BRAND_SHARE = 97;
    uint256 public constant INACTIVE_LICENSEE_SHARE = 3;

    bool public isActive;
    uint256 public gracePeriodEnd;
    uint256 public constant GRACE_PERIOD = 14 days;
    uint256 public subscriptionExpiresAt;

    // Payment tracking
    mapping(bytes32 => bool) public processedTransactions;
    mapping(bytes32 => uint256) public transactionAmounts;

    // Revenue totals for audit
    uint256 public totalRevenue;
    uint256 public totalUserShare;
    uint256 public totalBrandShare;

    event RevenueSplit(
        bytes32 indexed txId,
        uint256 amount,
        uint256 brandAmount,
        uint256 licenseeAmount,
        bool active,
        uint256 timestamp
    );

    event SubscriptionActivated(uint256 expiresAt);
    event GracePeriodStarted(uint256 endsAt);
    event SubscriptionLapsed();
    event LicenseRevoked(string reason);
    event OracleUpdated(address newOracle);

    modifier onlyBrand() {
        require(msg.sender == brand, "Only brand");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle");
        _;
    }

    modifier onlyLicensee() {
        require(msg.sender == licensee, "Only licensee");
        _;
    }

    constructor(address _licensee, address _oracle) {
        brand = msg.sender;
        licensee = _licensee;
        oracle = _oracle;
        isActive = true;
        subscriptionExpiresAt = block.timestamp + 30 days;
    }

    /**
     * @notice Process a verified payment from the oracle
     * @param txId Unique transaction identifier (from Stripe)
     * @param amountCents Amount in cents (for precision)
     * @param currency Currency code (e.g., "usd")
     */
    function processPayment(
        bytes32 txId,
        uint256 amountCents,
        string calldata currency
    ) external onlyOracle {
        require(!processedTransactions[txId], "Already processed");
        require(amountCents > 0, "Zero amount");

        processedTransactions[txId] = true;
        transactionAmounts[txId] = amountCents;

        // Determine split based on subscription status
        uint256 brandShare = isActive ? ACTIVE_BRAND_SHARE : INACTIVE_BRAND_SHARE;
        uint256 licenseeShare = isActive ? ACTIVE_LICENSEE_SHARE : INACTIVE_LICENSEE_SHARE;

        uint256 brandAmount = (amountCents * brandShare) / 100;
        uint256 licenseeAmount = amountCents - brandAmount;

        totalRevenue += amountCents;
        totalBrandShare += brandAmount;
        totalUserShare += licenseeAmount;

        emit RevenueSplit(txId, amountCents, brandAmount, licenseeAmount, isActive, block.timestamp);
    }

    /**
     * @notice Activate or extend subscription
     */
    function activateSubscription(uint256 duration) external onlyOracle {
        subscriptionExpiresAt = block.timestamp + duration;
        isActive = true;
        gracePeriodEnd = 0;
        emit SubscriptionActivated(subscriptionExpiresAt);
    }

    /**
     * @notice Start grace period after failed payment
     */
    function startGracePeriod() external onlyOracle {
        gracePeriodEnd = block.timestamp + GRACE_PERIOD;
        emit GracePeriodStarted(gracePeriodEnd);
    }

    /**
     * @notice Check and enforce grace period expiration
     */
    function checkGracePeriod() external {
        if (gracePeriodEnd > 0 && block.timestamp > gracePeriodEnd && isActive) {
            isActive = false;
            emit SubscriptionLapsed();
        }
    }

    /**
     * @notice Revoke license permanently (kill switch)
     */
    function revokeLicense(string calldata reason) external onlyBrand {
        isActive = false;
        gracePeriodEnd = 0;
        subscriptionExpiresAt = 0;
        emit LicenseRevoked(reason);
    }

    /**
     * @notice Update oracle address (in case of server rotation)
     */
    function updateOracle(address newOracle) external onlyBrand {
        require(newOracle != address(0), "Invalid address");
        oracle = newOracle;
        emit OracleUpdated(newOracle);
    }

    /**
     * @notice Get current split rates
     */
    function getCurrentSplit() external view returns (uint256 userShare, uint256 brandShare, bool active) {
        if (isActive) {
            return (ACTIVE_LICENSEE_SHARE, ACTIVE_BRAND_SHARE, true);
        } else {
            return (INACTIVE_LICENSEE_SHARE, INACTIVE_BRAND_SHARE, false);
        }
    }

    /**
     * @notice Get financial summary
     */
    function getSummary() external view returns (
        uint256 totalRev,
        uint256 totalBrand,
        uint256 totalLicensee,
        uint256 txCount
    ) {
        return (totalRevenue, totalBrandShare, totalUserShare, 0); // txCount would need counter
    }

    receive() external payable {
        revert("Use processPayment");
    }
}
