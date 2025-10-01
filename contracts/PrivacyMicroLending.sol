// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, euint64, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title PrivacyMicroLending
 * @dev A privacy-first P2P micro-lending platform using Zama's FHE technology
 * @notice This contract allows for fully confidential lending with encrypted loan amounts, 
 *         interest rates, and credit scores
 */
contract PrivacyMicroLending is SepoliaConfig {
    
    address public owner;
    uint256 public loanCounter;
    
    // Constants for loan parameters
    uint256 public constant MAX_LOAN_DURATION = 365 days;
    uint256 public constant MIN_LOAN_AMOUNT = 0.001 ether;
    uint256 public constant MAX_LOAN_AMOUNT = 10 ether;
    uint256 public constant MAX_INTEREST_RATE = 10000; // 100% in basis points
    
    // Loan status enumeration
    enum LoanStatus { 
        Requested,  // 0: Loan has been requested
        Funded,     // 1: Loan has been funded
        Repaid,     // 2: Loan has been repaid
        Defaulted   // 3: Loan has defaulted
    }
    
    /**
     * @dev Structure to store loan information
     */
    struct LoanRequest {
        address borrower;           // Address of the borrower
        address lender;             // Address of the lender (zero until funded)
        euint64 encryptedAmount;    // Encrypted loan amount
        euint32 encryptedInterestRate; // Encrypted interest rate in basis points
        uint256 duration;           // Loan duration in seconds
        uint256 createdAt;          // Timestamp when loan was created
        uint256 fundedAt;           // Timestamp when loan was funded
        uint256 dueDate;            // Due date for repayment
        LoanStatus status;          // Current loan status
        bool isPrivate;             // Whether loan details are private
    }
    
    /**
     * @dev Structure to store borrower profile information
     */
    struct BorrowerProfile {
        euint32 encryptedCreditScore;   // Encrypted credit score (300-850)
        uint256 totalLoans;             // Total number of loans taken
        uint256 successfulRepayments;   // Number of successful repayments
        bool isActive;                  // Whether the borrower account is active
    }
    
    // Mappings to store contract data
    mapping(uint256 => LoanRequest) public loans;
    mapping(address => BorrowerProfile) public borrowerProfiles;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(address => uint256[]) public lenderLoans;
    mapping(address => bool) public approvedBorrowers;
    
    // Privacy settings
    mapping(address => bool) public allowsPublicProfile;
    mapping(uint256 => mapping(address => bool)) public loanViewPermissions;
    
    // Events
    event LoanRequested(uint256 indexed loanId, address indexed borrower);
    event LoanFunded(uint256 indexed loanId, address indexed lender, address indexed borrower);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower);
    event LoanDefaulted(uint256 indexed loanId, address indexed borrower);
    event CreditScoreUpdated(address indexed borrower);
    event BorrowerRegistered(address indexed borrower, bool isPublic);
    event LoanViewPermissionGranted(uint256 indexed loanId, address indexed viewer);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    modifier onlyActiveBorrower() {
        require(borrowerProfiles[msg.sender].isActive, "Borrower not active");
        _;
    }
    
    modifier loanExists(uint256 loanId) {
        require(loanId > 0 && loanId <= loanCounter, "Loan does not exist");
        _;
    }
    
    modifier validCreditScore(uint32 creditScore) {
        require(creditScore >= 300 && creditScore <= 850, "Invalid credit score");
        _;
    }
    
    modifier validLoanAmount(uint64 amount) {
        require(amount >= MIN_LOAN_AMOUNT && amount <= MAX_LOAN_AMOUNT, "Invalid loan amount");
        _;
    }
    
    modifier validInterestRate(uint32 interestRate) {
        require(interestRate <= MAX_INTEREST_RATE, "Interest rate too high");
        _;
    }
    
    modifier validDuration(uint256 duration) {
        require(duration > 0 && duration <= MAX_LOAN_DURATION, "Invalid duration");
        _;
    }
    
    /**
     * @dev Constructor - initializes the contract
     */
    constructor() {
        owner = msg.sender;
        loanCounter = 0;
    }
    
    /**
     * @dev Register as a borrower with encrypted credit score
     * @param creditScore The borrower's credit score (300-850)
     * @param makePublic Whether to make the profile publicly visible
     */
    function registerBorrower(uint32 creditScore, bool makePublic) 
        external 
        validCreditScore(creditScore)
    {
        require(!borrowerProfiles[msg.sender].isActive, "Already registered");
        
        // Encrypt the credit score
        euint32 encryptedScore = FHE.asEuint32(creditScore);
        
        // Create borrower profile
        borrowerProfiles[msg.sender] = BorrowerProfile({
            encryptedCreditScore: encryptedScore,
            totalLoans: 0,
            successfulRepayments: 0,
            isActive: true
        });
        
        // Set privacy preferences
        allowsPublicProfile[msg.sender] = makePublic;
        approvedBorrowers[msg.sender] = true;
        
        // Set ACL permissions for encrypted credit score
        FHE.allowThis(encryptedScore);
        FHE.allow(encryptedScore, msg.sender);
        
        // If profile is public, allow anyone to view encrypted credit score
        if (makePublic) {
            FHE.allow(encryptedScore, address(0));
        }
        
        emit BorrowerRegistered(msg.sender, makePublic);
        emit CreditScoreUpdated(msg.sender);
    }
    
    /**
     * @dev Request a loan with encrypted amount and interest rate
     * @param amount Loan amount in wei
     * @param interestRate Interest rate in basis points (e.g., 500 = 5%)
     * @param duration Loan duration in seconds
     * @param isPrivate Whether the loan should be private
     * @return loanId The ID of the created loan
     */
    function requestLoan(
        uint64 amount,
        uint32 interestRate,
        uint256 duration,
        bool isPrivate
    ) 
        external 
        onlyActiveBorrower
        validLoanAmount(amount)
        validInterestRate(interestRate)
        validDuration(duration)
        returns (uint256)
    {
        // Increment loan counter
        loanCounter++;
        uint256 loanId = loanCounter;
        
        // Encrypt sensitive data
        euint64 encryptedAmount = FHE.asEuint64(amount);
        euint32 encryptedRate = FHE.asEuint32(interestRate);
        
        // Create loan request
        loans[loanId] = LoanRequest({
            borrower: msg.sender,
            lender: address(0),
            encryptedAmount: encryptedAmount,
            encryptedInterestRate: encryptedRate,
            duration: duration,
            createdAt: block.timestamp,
            fundedAt: 0,
            dueDate: 0,
            status: LoanStatus.Requested,
            isPrivate: isPrivate
        });
        
        // Update borrower's loan list and profile
        borrowerLoans[msg.sender].push(loanId);
        borrowerProfiles[msg.sender].totalLoans++;
        
        // Set ACL permissions for encrypted data
        FHE.allowThis(encryptedAmount);
        FHE.allowThis(encryptedRate);
        FHE.allow(encryptedAmount, msg.sender);
        FHE.allow(encryptedRate, msg.sender);
        
        // If loan is public, allow anyone to view encrypted data
        if (!isPrivate) {
            FHE.allow(encryptedAmount, address(0));
            FHE.allow(encryptedRate, address(0));
        }
        
        emit LoanRequested(loanId, msg.sender);
        return loanId;
    }
    
    /**
     * @dev Fund a loan by providing ETH
     * @param loanId The ID of the loan to fund
     */
    function fundLoan(uint256 loanId) 
        external 
        payable 
        loanExists(loanId)
    {
        LoanRequest storage loan = loans[loanId];
        
        require(loan.status == LoanStatus.Requested, "Loan not available");
        require(loan.borrower != msg.sender, "Cannot fund own loan");
        require(msg.value > 0, "Must send ETH");
        
        // For private loans, check if lender has permission
        if (loan.isPrivate) {
            require(
                loanViewPermissions[loanId][msg.sender] || 
                msg.sender == owner, 
                "No permission to view loan"
            );
        }
        
        // Update loan details
        loan.lender = msg.sender;
        loan.status = LoanStatus.Funded;
        loan.fundedAt = block.timestamp;
        loan.dueDate = block.timestamp + loan.duration;
        
        // Update lender's loan list
        lenderLoans[msg.sender].push(loanId);
        
        // Transfer funds to borrower
        payable(loan.borrower).transfer(msg.value);
        
        // Grant lender access to encrypted data
        FHE.allow(loan.encryptedAmount, msg.sender);
        FHE.allow(loan.encryptedInterestRate, msg.sender);
        
        emit LoanFunded(loanId, msg.sender, loan.borrower);
    }
    
    /**
     * @dev Repay a loan with interest
     * @param loanId The ID of the loan to repay
     */
    function repayLoan(uint256 loanId) 
        external 
        payable 
        loanExists(loanId)
    {
        LoanRequest storage loan = loans[loanId];
        
        require(loan.status == LoanStatus.Funded, "Loan not funded");
        require(loan.borrower == msg.sender, "Not borrower");
        require(block.timestamp <= loan.dueDate, "Loan overdue");
        require(msg.value > 0, "Must send repayment");
        
        // Update loan status
        loan.status = LoanStatus.Repaid;
        
        // Update borrower's successful repayments
        borrowerProfiles[msg.sender].successfulRepayments++;
        
        // Transfer repayment to lender
        payable(loan.lender).transfer(msg.value);
        
        // Update credit score positively
        _updateCreditScore(msg.sender, true);
        
        emit LoanRepaid(loanId, msg.sender);
    }
    
    /**
     * @dev Mark a loan as defaulted (callable by lender after due date)
     * @param loanId The ID of the loan to mark as defaulted
     */
    function markDefault(uint256 loanId) 
        external 
        loanExists(loanId)
    {
        LoanRequest storage loan = loans[loanId];
        
        require(loan.status == LoanStatus.Funded, "Loan not funded");
        require(loan.lender == msg.sender, "Not lender");
        require(block.timestamp > loan.dueDate, "Loan not overdue");
        
        // Update loan status
        loan.status = LoanStatus.Defaulted;
        
        // Update credit score negatively
        _updateCreditScore(loan.borrower, false);
        
        emit LoanDefaulted(loanId, loan.borrower);
    }
    
    /**
     * @dev Grant permission to view a private loan
     * @param loanId The ID of the loan
     * @param viewer The address to grant permission to
     */
    function grantLoanViewPermission(uint256 loanId, address viewer) 
        external 
        loanExists(loanId)
    {
        require(loans[loanId].borrower == msg.sender, "Not borrower");
        require(loans[loanId].isPrivate, "Loan is not private");
        
        loanViewPermissions[loanId][viewer] = true;
        
        // Grant access to encrypted data
        FHE.allow(loans[loanId].encryptedAmount, viewer);
        FHE.allow(loans[loanId].encryptedInterestRate, viewer);
        
        emit LoanViewPermissionGranted(loanId, viewer);
    }
    
    /**
     * @dev Internal function to update credit score
     * @param borrower The address of the borrower
     * @param positive Whether the update is positive or negative
     */
    function _updateCreditScore(address borrower, bool positive) internal {
        BorrowerProfile storage profile = borrowerProfiles[borrower];
        
        if (positive) {
            // Increase credit score by 5 points for successful repayment
            profile.encryptedCreditScore = FHE.add(
                profile.encryptedCreditScore, 
                FHE.asEuint32(5)
            );
        } else {
            // Decrease credit score by 20 points for default
            profile.encryptedCreditScore = FHE.sub(
                profile.encryptedCreditScore, 
                FHE.asEuint32(20)
            );
        }
        
        emit CreditScoreUpdated(borrower);
    }
    
    // View functions
    
    /**
     * @dev Get the number of loans for a borrower
     * @param borrower The address of the borrower
     * @return The number of loans
     */
    function getBorrowerLoanCount(address borrower) external view returns (uint256) {
        return borrowerLoans[borrower].length;
    }
    
    /**
     * @dev Get the number of loans for a lender
     * @param lender The address of the lender
     * @return The number of loans
     */
    function getLenderLoanCount(address lender) external view returns (uint256) {
        return lenderLoans[lender].length;
    }
    
    /**
     * @dev Get basic loan information (non-encrypted data)
     * @param loanId The ID of the loan
     * @return borrower The borrower's address
     * @return lender The lender's address
     * @return duration The loan duration
     * @return createdAt Creation timestamp
     * @return fundedAt Funding timestamp
     * @return dueDate Due date
     * @return status Loan status
     * @return isPrivate Whether the loan is private
     */
    function getLoanBasicInfo(uint256 loanId) 
        external 
        view 
        loanExists(loanId) 
        returns (
            address borrower,
            address lender,
            uint256 duration,
            uint256 createdAt,
            uint256 fundedAt,
            uint256 dueDate,
            LoanStatus status,
            bool isPrivate
        )
    {
        LoanRequest storage loan = loans[loanId];
        return (
            loan.borrower,
            loan.lender,
            loan.duration,
            loan.createdAt,
            loan.fundedAt,
            loan.dueDate,
            loan.status,
            loan.isPrivate
        );
    }
    
    /**
     * @dev Get encrypted loan amount (requires permission)
     * @param loanId The ID of the loan
     * @return The encrypted loan amount
     */
    function getEncryptedLoanAmount(uint256 loanId) 
        external 
        view 
        loanExists(loanId) 
        returns (euint64) 
    {
        return loans[loanId].encryptedAmount;
    }
    
    /**
     * @dev Get encrypted interest rate (requires permission)
     * @param loanId The ID of the loan
     * @return The encrypted interest rate
     */
    function getEncryptedInterestRate(uint256 loanId) 
        external 
        view 
        loanExists(loanId) 
        returns (euint32) 
    {
        return loans[loanId].encryptedInterestRate;
    }
    
    /**
     * @dev Get borrower's encrypted credit score (requires permission)
     * @param borrower The address of the borrower
     * @return The encrypted credit score
     */
    function getEncryptedCreditScore(address borrower) 
        external 
        view 
        returns (euint32) 
    {
        require(borrowerProfiles[borrower].isActive, "Borrower not active");
        return borrowerProfiles[borrower].encryptedCreditScore;
    }
    
    // Admin functions
    
    /**
     * @dev Emergency withdrawal function (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    /**
     * @dev Pause a borrower's account (owner only)
     * @param borrower The address of the borrower to pause
     */
    function pauseBorrower(address borrower) external onlyOwner {
        borrowerProfiles[borrower].isActive = false;
    }
    
    /**
     * @dev Unpause a borrower's account (owner only)
     * @param borrower The address of the borrower to unpause
     */
    function unpauseBorrower(address borrower) external onlyOwner {
        borrowerProfiles[borrower].isActive = true;
    }
    
    /**
     * @dev Get contract balance
     * @return The contract's ETH balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}