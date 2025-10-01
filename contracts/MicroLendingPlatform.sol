// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MicroLendingPlatform
 * @dev A basic P2P micro-lending platform for initial testing
 */
contract MicroLendingPlatform {
    
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
        uint256 amount;            // Loan amount
        uint256 interestRate;      // Interest rate in basis points
        uint256 duration;          // Loan duration in seconds
        uint256 createdAt;         // Timestamp when loan was created
        uint256 fundedAt;          // Timestamp when loan was funded
        uint256 dueDate;           // Due date for repayment
        LoanStatus status;         // Current loan status
    }
    
    /**
     * @dev Structure to store borrower profile information
     */
    struct BorrowerProfile {
        uint256 creditScore;           // Credit score (300-850)
        uint256 totalLoans;            // Total number of loans taken
        uint256 successfulRepayments;  // Number of successful repayments
        bool isActive;                 // Whether the borrower account is active
    }
    
    // Mappings to store contract data
    mapping(uint256 => LoanRequest) public loans;
    mapping(address => BorrowerProfile) public borrowerProfiles;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(address => uint256[]) public lenderLoans;
    mapping(address => bool) public approvedBorrowers;
    
    // Events
    event LoanRequested(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event LoanFunded(uint256 indexed loanId, address indexed lender, address indexed borrower);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower);
    event LoanDefaulted(uint256 indexed loanId, address indexed borrower);
    event CreditScoreUpdated(address indexed borrower, uint256 newScore);
    event BorrowerRegistered(address indexed borrower);
    
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
    
    modifier validCreditScore(uint256 creditScore) {
        require(creditScore >= 300 && creditScore <= 850, "Invalid credit score");
        _;
    }
    
    modifier validLoanAmount(uint256 amount) {
        require(amount >= MIN_LOAN_AMOUNT && amount <= MAX_LOAN_AMOUNT, "Invalid loan amount");
        _;
    }
    
    modifier validInterestRate(uint256 interestRate) {
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
     * @dev Register as a borrower with credit score
     * @param creditScore The borrower's credit score (300-850)
     */
    function registerBorrower(uint256 creditScore) 
        external 
        validCreditScore(creditScore)
    {
        require(!borrowerProfiles[msg.sender].isActive, "Already registered");
        
        // Create borrower profile
        borrowerProfiles[msg.sender] = BorrowerProfile({
            creditScore: creditScore,
            totalLoans: 0,
            successfulRepayments: 0,
            isActive: true
        });
        
        approvedBorrowers[msg.sender] = true;
        
        emit BorrowerRegistered(msg.sender);
        emit CreditScoreUpdated(msg.sender, creditScore);
    }
    
    /**
     * @dev Request a loan
     * @param amount Loan amount in wei
     * @param interestRate Interest rate in basis points (e.g., 500 = 5%)
     * @param duration Loan duration in seconds
     * @return loanId The ID of the created loan
     */
    function requestLoan(
        uint256 amount,
        uint256 interestRate,
        uint256 duration
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
        
        // Create loan request
        loans[loanId] = LoanRequest({
            borrower: msg.sender,
            lender: address(0),
            amount: amount,
            interestRate: interestRate,
            duration: duration,
            createdAt: block.timestamp,
            fundedAt: 0,
            dueDate: 0,
            status: LoanStatus.Requested
        });
        
        // Update borrower's loan list and profile
        borrowerLoans[msg.sender].push(loanId);
        borrowerProfiles[msg.sender].totalLoans++;
        
        emit LoanRequested(loanId, msg.sender, amount);
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
        require(msg.value >= loan.amount, "Insufficient funding amount");
        
        // Update loan details
        loan.lender = msg.sender;
        loan.status = LoanStatus.Funded;
        loan.fundedAt = block.timestamp;
        loan.dueDate = block.timestamp + loan.duration;
        
        // Update lender's loan list
        lenderLoans[msg.sender].push(loanId);
        
        // Transfer funds to borrower
        payable(loan.borrower).transfer(loan.amount);
        
        // Return excess funds if any
        if (msg.value > loan.amount) {
            payable(msg.sender).transfer(msg.value - loan.amount);
        }
        
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
        
        // Calculate total repayment amount (principal + interest)
        uint256 totalRepayment = loan.amount + (loan.amount * loan.interestRate / 10000);
        require(msg.value >= totalRepayment, "Insufficient repayment amount");
        
        // Update loan status
        loan.status = LoanStatus.Repaid;
        
        // Update borrower's successful repayments
        borrowerProfiles[msg.sender].successfulRepayments++;
        
        // Transfer repayment to lender
        payable(loan.lender).transfer(totalRepayment);
        
        // Return excess funds if any
        if (msg.value > totalRepayment) {
            payable(msg.sender).transfer(msg.value - totalRepayment);
        }
        
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
     * @dev Internal function to update credit score
     * @param borrower The address of the borrower
     * @param positive Whether the update is positive or negative
     */
    function _updateCreditScore(address borrower, bool positive) internal {
        BorrowerProfile storage profile = borrowerProfiles[borrower];
        
        if (positive) {
            // Increase credit score by 5 points for successful repayment
            if (profile.creditScore <= 845) {
                profile.creditScore += 5;
            }
        } else {
            // Decrease credit score by 20 points for default
            if (profile.creditScore >= 320) {
                profile.creditScore -= 20;
            }
        }
        
        emit CreditScoreUpdated(borrower, profile.creditScore);
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
     * @dev Calculate total repayment amount for a loan
     * @param loanId The ID of the loan
     * @return The total repayment amount including interest
     */
    function calculateRepaymentAmount(uint256 loanId) 
        external 
        view 
        loanExists(loanId) 
        returns (uint256) 
    {
        LoanRequest storage loan = loans[loanId];
        return loan.amount + (loan.amount * loan.interestRate / 10000);
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