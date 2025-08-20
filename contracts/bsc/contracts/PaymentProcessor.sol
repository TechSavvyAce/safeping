// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PaymentProcessor
 * @dev Smart contract for processing USDT payments on BSC Mainnet
 * @notice This contract uses approve + transferFrom pattern for secure payments
 * Uses real BSC USDT: 0x55d398326f99059fF775485246999027B3197955
 *
 * @notice Uses SafeERC20 for consistent and safe token interactions
 * BSC USDT is more standard than Ethereum USDT but SafeERC20 provides additional safety
 */

contract PaymentProcessor {
    using SafeERC20 for IERC20;

    // USDT contract interface
    IERC20 public immutable USDT;

    // Owner and treasury addresses
    address public owner;
    address public treasury;

    // Payment tracking
    struct Payment {
        string paymentId;
        address payer;
        uint256 amount;
        uint256 timestamp;
        bool completed;
        string serviceDescription;
    }

    // Mappings
    mapping(string => Payment) public payments;
    mapping(address => string[]) public userPayments;
    mapping(string => bool) public paymentExists;

    // Events
    event PaymentInitiated(
        string indexed paymentId,
        address indexed payer,
        uint256 amount,
        string serviceDescription
    );

    event PaymentCompleted(
        string indexed paymentId,
        address indexed payer,
        uint256 amount,
        uint256 timestamp
    );

    event TreasuryUpdated(
        address indexed oldTreasury,
        address indexed newTreasury
    );
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // Modifiers
    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "PaymentProcessor: Only owner can call this function"
        );
        _;
    }

    modifier validPaymentId(string memory _paymentId) {
        require(
            bytes(_paymentId).length > 0,
            "PaymentProcessor: Payment ID cannot be empty"
        );
        require(
            !paymentExists[_paymentId],
            "PaymentProcessor: Payment ID already exists"
        );
        _;
    }

    modifier paymentNotCompleted(string memory _paymentId) {
        require(
            paymentExists[_paymentId],
            "PaymentProcessor: Payment does not exist"
        );
        require(
            !payments[_paymentId].completed,
            "PaymentProcessor: Payment already completed"
        );
        _;
    }

    constructor(address _treasury, address _usdtToken) {
        require(
            _treasury != address(0),
            "PaymentProcessor: Treasury cannot be zero address"
        );
        require(
            _usdtToken != address(0),
            "PaymentProcessor: USDT token cannot be zero address"
        );
        owner = msg.sender;
        treasury = _treasury;
        USDT = IERC20(_usdtToken);
    }

    /**
     * @dev Process payment using approve + transferFrom pattern
     * @param _paymentId Unique payment identifier from backend
     * @param _amount Amount of USDT to pay (in wei, 18 decimals for BSC USDT)
     * @param _serviceDescription Description of the service being purchased
     *
     * Flow:
     * 1. User calls USDT.approve(contractAddress, amount) first
     * 2. User calls this function to complete payment
     * 3. Contract calls USDT.safeTransferFrom(user, treasury, amount)
     */
    function processPayment(
        string memory _paymentId,
        uint256 _amount,
        string memory _serviceDescription
    ) external validPaymentId(_paymentId) {
        require(_amount > 0, "PaymentProcessor: Amount must be greater than 0");
        require(
            bytes(_serviceDescription).length > 0,
            "PaymentProcessor: Service description required"
        );

        // Check user's USDT balance
        require(
            USDT.balanceOf(msg.sender) >= _amount,
            "PaymentProcessor: Insufficient USDT balance"
        );

        // Check allowance
        require(
            USDT.allowance(msg.sender, address(this)) >= _amount,
            "PaymentProcessor: Insufficient allowance. Please approve USDT first"
        );

        // Create payment record
        payments[_paymentId] = Payment({
            paymentId: _paymentId,
            payer: msg.sender,
            amount: _amount,
            timestamp: block.timestamp,
            completed: false,
            serviceDescription: _serviceDescription
        });

        // Mark payment as existing
        paymentExists[_paymentId] = true;

        // Add to user's payment history
        userPayments[msg.sender].push(_paymentId);

        emit PaymentInitiated(
            _paymentId,
            msg.sender,
            _amount,
            _serviceDescription
        );

        // Transfer USDT from user to treasury using SafeERC20
        // SafeERC20 provides additional safety and consistency across different tokens
        USDT.safeTransferFrom(msg.sender, treasury, _amount);

        // Mark payment as completed
        payments[_paymentId].completed = true;

        emit PaymentCompleted(_paymentId, msg.sender, _amount, block.timestamp);
    }

    /**
     * @dev Get payment details
     * @param _paymentId Payment ID to query
     * @return paymentId The payment identifier
     * @return payer The address of the payer
     * @return amount The payment amount in USDT
     * @return timestamp The timestamp of payment creation
     * @return completed Whether the payment is completed
     * @return serviceDescription Description of the service
     */
    function getPayment(
        string memory _paymentId
    )
        external
        view
        returns (
            string memory paymentId,
            address payer,
            uint256 amount,
            uint256 timestamp,
            bool completed,
            string memory serviceDescription
        )
    {
        require(
            paymentExists[_paymentId],
            "PaymentProcessor: Payment does not exist"
        );
        Payment memory payment = payments[_paymentId];
        return (
            payment.paymentId,
            payment.payer,
            payment.amount,
            payment.timestamp,
            payment.completed,
            payment.serviceDescription
        );
    }

    /**
     * @dev Get user's payment history
     * @param _user User address
     * @return Array of payment IDs
     */
    function getUserPayments(
        address _user
    ) external view returns (string[] memory) {
        return userPayments[_user];
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
     * @dev Update treasury address (only owner)
     * @param _newTreasury New treasury address
     */
    function updateTreasury(address _newTreasury) external onlyOwner {
        require(
            _newTreasury != address(0),
            "PaymentProcessor: Treasury cannot be zero address"
        );
        address oldTreasury = treasury;
        treasury = _newTreasury;
        emit TreasuryUpdated(oldTreasury, _newTreasury);
    }

    /**
     * @dev Transfer ownership (only owner)
     * @param _newOwner New owner address
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(
            _newOwner != address(0),
            "PaymentProcessor: New owner cannot be zero address"
        );
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }

    /**
     * @dev Get contract information
     * @return contractOwner The address of the contract owner
     * @return treasuryAddress The address of the treasury
     * @return usdtAddress The address of the USDT token contract
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
}
