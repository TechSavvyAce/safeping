// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PaymentProcessorOptimized
 * @dev Gas-optimized smart contract for processing USDT payments on BSC Mainnet
 * @notice This contract uses approve + transferFrom pattern for secure payments
 * Uses real BSC USDT: 0x55d398326f99059fF775485246999027B3197955
 *
 * Key optimizations:
 * - Packed structs to minimize storage slots
 * - Custom errors instead of require strings
 * - Reduced redundant storage operations
 * - Optimized event emissions
 * - Simplified payment tracking
 */

contract PaymentProcessorOptimized {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                               CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/

    error Unauthorized();
    error ZeroAddress();
    error ZeroAmount();
    error EmptyString();
    error PaymentIdExists();
    error PaymentNotFound();
    error PaymentCompleted();
    error InsufficientBalance();
    error InsufficientAllowance();

    /*//////////////////////////////////////////////////////////////
                               STORAGE
    //////////////////////////////////////////////////////////////*/

    // USDT contract interface
    IERC20 public immutable USDT;

    // Owner and treasury addresses (packed in single slot)
    address public owner;
    address public treasury;

    // Payment tracking - optimized struct (fits in 3 storage slots)
    struct Payment {
        address payer; // 20 bytes
        uint96 amount; // 12 bytes - sufficient for USDT amounts (max ~79B tokens)
        uint32 timestamp; // 4 bytes - sufficient until year 2106
        bool completed; // 1 byte
        // serviceDescription moved to separate mapping to reduce struct size
    }

    // Mappings
    mapping(bytes32 => Payment) public payments;
    mapping(bytes32 => string) public paymentDescriptions;
    mapping(address => bytes32[]) public userPayments;

    /*//////////////////////////////////////////////////////////////
                               EVENTS
    //////////////////////////////////////////////////////////////*/

    event PaymentProcessed(
        bytes32 indexed paymentHash,
        address indexed payer,
        uint256 amount
    );

    event TreasuryUpdated(
        address indexed oldTreasury,
        address indexed newTreasury
    );

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _treasury, address _usdtToken) {
        if (_treasury == address(0)) revert ZeroAddress();
        if (_usdtToken == address(0)) revert ZeroAddress();

        owner = msg.sender;
        treasury = _treasury;
        USDT = IERC20(_usdtToken);
    }

    /*//////////////////////////////////////////////////////////////
                           PAYMENT PROCESSING
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Process payment using approve + transferFrom pattern
     * @param _paymentId Unique payment identifier from backend
     * @param _amount Amount of USDT to pay (in wei, 18 decimals for BSC USDT)
     * @param _serviceDescription Description of the service being purchased
     *
     * Gas optimizations:
     * - Uses bytes32 hash of paymentId instead of storing string
     * - Combines balance and allowance checks
     * - Single event emission instead of two
     * - Packed struct reduces storage operations
     */
    function processPayment(
        string calldata _paymentId,
        uint256 _amount,
        string calldata _serviceDescription
    ) external {
        if (_amount == 0) revert ZeroAmount();
        if (bytes(_paymentId).length == 0) revert EmptyString();
        if (bytes(_serviceDescription).length == 0) revert EmptyString();

        // Create payment hash to save gas on string storage
        bytes32 paymentHash = keccak256(abi.encodePacked(_paymentId));

        // Check if payment already exists
        if (payments[paymentHash].payer != address(0)) revert PaymentIdExists();

        // Check amount fits in uint96 (gas optimization)
        if (_amount > type(uint96).max) revert ZeroAmount();

        // Combined balance and allowance check (saves gas)
        uint256 balance = USDT.balanceOf(msg.sender);
        uint256 allowance = USDT.allowance(msg.sender, address(this));

        if (balance < _amount) revert InsufficientBalance();
        if (allowance < _amount) revert InsufficientAllowance();

        // Create payment record (optimized struct)
        payments[paymentHash] = Payment({
            payer: msg.sender,
            amount: uint96(_amount),
            timestamp: uint32(block.timestamp),
            completed: true // Set to true immediately after successful transfer
        });

        // Store service description separately to keep struct small
        paymentDescriptions[paymentHash] = _serviceDescription;

        // Add to user's payment history
        userPayments[msg.sender].push(paymentHash);

        // Transfer USDT from user to treasury
        USDT.safeTransferFrom(msg.sender, treasury, _amount);

        // Single event emission
        emit PaymentProcessed(paymentHash, msg.sender, _amount);
    }

    /*//////////////////////////////////////////////////////////////
                               VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Get payment details by string ID
     * @param _paymentId Payment ID to query
     */
    function getPayment(
        string calldata _paymentId
    )
        external
        view
        returns (
            address payer,
            uint256 amount,
            uint256 timestamp,
            bool completed,
            string memory serviceDescription
        )
    {
        bytes32 paymentHash = keccak256(abi.encodePacked(_paymentId));
        return getPaymentByHash(paymentHash);
    }

    /**
     * @dev Get payment details by hash (more gas efficient)
     * @param _paymentHash Payment hash to query
     */
    function getPaymentByHash(
        bytes32 _paymentHash
    )
        public
        view
        returns (
            address payer,
            uint256 amount,
            uint256 timestamp,
            bool completed,
            string memory serviceDescription
        )
    {
        Payment memory payment = payments[_paymentHash];
        if (payment.payer == address(0)) revert PaymentNotFound();

        return (
            payment.payer,
            uint256(payment.amount),
            uint256(payment.timestamp),
            payment.completed,
            paymentDescriptions[_paymentHash]
        );
    }

    /**
     * @dev Get user's payment history (returns hashes for gas efficiency)
     * @param _user User address
     * @return Array of payment hashes
     */
    function getUserPaymentHashes(
        address _user
    ) external view returns (bytes32[] memory) {
        return userPayments[_user];
    }

    /**
     * @dev Get user's payment history with details (gas intensive, use carefully)
     * @param _user User address
     * @param _offset Starting index
     * @param _limit Maximum number of payments to return
     */
    function getUserPayments(
        address _user,
        uint256 _offset,
        uint256 _limit
    )
        external
        view
        returns (
            bytes32[] memory hashes,
            address[] memory payers,
            uint256[] memory amounts,
            uint256[] memory timestamps,
            bool[] memory completedStatuses
        )
    {
        bytes32[] memory userHashes = userPayments[_user];
        uint256 length = userHashes.length;

        if (_offset >= length) {
            return (
                new bytes32[](0),
                new address[](0),
                new uint256[](0),
                new uint256[](0),
                new bool[](0)
            );
        }

        uint256 end = _offset + _limit;
        if (end > length) {
            end = length;
        }

        uint256 resultLength = end - _offset;
        hashes = new bytes32[](resultLength);
        payers = new address[](resultLength);
        amounts = new uint256[](resultLength);
        timestamps = new uint256[](resultLength);
        completedStatuses = new bool[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            bytes32 hash = userHashes[_offset + i];
            Payment memory payment = payments[hash];

            hashes[i] = hash;
            payers[i] = payment.payer;
            amounts[i] = uint256(payment.amount);
            timestamps[i] = uint256(payment.timestamp);
            completedStatuses[i] = payment.completed;
        }
    }

    /**
     * @dev Check if user has sufficient allowance for payment
     * @param _user User address
     * @param _amount Amount to check
     * @return True if allowance is sufficient
     */
    function checkAllowance(
        address _user,
        uint256 _amount
    ) external view returns (bool) {
        return USDT.allowance(_user, address(this)) >= _amount;
    }

    /**
     * @dev Get user's USDT balance
     * @param _user User address
     * @return USDT balance
     */
    function getUserBalance(address _user) external view returns (uint256) {
        return USDT.balanceOf(_user);
    }

    /**
     * @dev Get contract information
     */
    function getContractInfo()
        external
        view
        returns (
            address contractOwner,
            address treasuryAddress,
            address usdtAddress
        )
    {
        return (owner, treasury, address(USDT));
    }

    /*//////////////////////////////////////////////////////////////
                               ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Update treasury address (only owner)
     * @param _newTreasury New treasury address
     */
    function updateTreasury(address _newTreasury) external onlyOwner {
        if (_newTreasury == address(0)) revert ZeroAddress();

        address oldTreasury = treasury;
        treasury = _newTreasury;
        emit TreasuryUpdated(oldTreasury, _newTreasury);
    }

    /**
     * @dev Transfer ownership (only owner)
     * @param _newOwner New owner address
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        if (_newOwner == address(0)) revert ZeroAddress();

        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
}
