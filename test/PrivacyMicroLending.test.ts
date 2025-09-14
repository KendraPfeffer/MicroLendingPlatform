import { expect } from "chai"
import { ethers } from "hardhat"
import { PrivacyMicroLending } from "../typechain-types"
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers"

describe("PrivacyMicroLending", function () {
  let privacyMicroLending: PrivacyMicroLending
  let owner: HardhatEthersSigner
  let borrower1: HardhatEthersSigner
  let borrower2: HardhatEthersSigner
  let lender1: HardhatEthersSigner
  let lender2: HardhatEthersSigner
  let accounts: HardhatEthersSigner[]

  // Test constants
  const VALID_CREDIT_SCORE = 750
  const INVALID_LOW_CREDIT_SCORE = 250
  const INVALID_HIGH_CREDIT_SCORE = 900
  const LOAN_AMOUNT = ethers.parseEther("1.0") // 1 ETH
  const INTEREST_RATE = 500 // 5% in basis points
  const LOAN_DURATION = 30 * 24 * 60 * 60 // 30 days in seconds

  beforeEach(async function () {
    // Get signers
    accounts = await ethers.getSigners()
    ;[owner, borrower1, borrower2, lender1, lender2] = accounts

    // Deploy the contract
    const PrivacyMicroLendingFactory = await ethers.getContractFactory("PrivacyMicroLending")
    privacyMicroLending = await PrivacyMicroLendingFactory.deploy()
    await privacyMicroLending.waitForDeployment()
  })

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await privacyMicroLending.owner()).to.equal(owner.address)
    })

    it("Should initialize loan counter to 0", async function () {
      expect(await privacyMicroLending.loanCounter()).to.equal(0)
    })

    it("Should set correct constants", async function () {
      expect(await privacyMicroLending.MAX_LOAN_DURATION()).to.equal(365 * 24 * 60 * 60)
      expect(await privacyMicroLending.MIN_LOAN_AMOUNT()).to.equal(ethers.parseEther("0.001"))
      expect(await privacyMicroLending.MAX_LOAN_AMOUNT()).to.equal(ethers.parseEther("10"))
      expect(await privacyMicroLending.MAX_INTEREST_RATE()).to.equal(10000)
    })
  })

  describe("Borrower Registration", function () {
    it("Should allow borrower registration with valid credit score", async function () {
      await expect(privacyMicroLending.connect(borrower1).registerBorrower(VALID_CREDIT_SCORE, true))
        .to.emit(privacyMicroLending, "BorrowerRegistered")
        .withArgs(borrower1.address, true)

      expect(await privacyMicroLending.approvedBorrowers(borrower1.address)).to.be.true

      const profile = await privacyMicroLending.borrowerProfiles(borrower1.address)
      expect(profile.totalLoans).to.equal(0)
      expect(profile.successfulRepayments).to.equal(0)
      expect(profile.isActive).to.be.true
    })

    it("Should reject registration with credit score below minimum", async function () {
      await expect(
        privacyMicroLending.connect(borrower1).registerBorrower(INVALID_LOW_CREDIT_SCORE, true)
      ).to.be.revertedWith("Invalid credit score")
    })

    it("Should reject registration with credit score above maximum", async function () {
      await expect(
        privacyMicroLending.connect(borrower1).registerBorrower(INVALID_HIGH_CREDIT_SCORE, true)
      ).to.be.revertedWith("Invalid credit score")
    })

    it("Should prevent double registration", async function () {
      await privacyMicroLending.connect(borrower1).registerBorrower(VALID_CREDIT_SCORE, true)
      
      await expect(
        privacyMicroLending.connect(borrower1).registerBorrower(800, false)
      ).to.be.revertedWith("Already registered")
    })

    it("Should handle both public and private profile preferences", async function () {
      // Register public profile
      await privacyMicroLending.connect(borrower1).registerBorrower(VALID_CREDIT_SCORE, true)
      expect(await privacyMicroLending.allowsPublicProfile(borrower1.address)).to.be.true

      // Register private profile
      await privacyMicroLending.connect(borrower2).registerBorrower(700, false)
      expect(await privacyMicroLending.allowsPublicProfile(borrower2.address)).to.be.false
    })
  })

  describe("Loan Requests", function () {
    beforeEach(async function () {
      // Register borrower1 for loan tests
      await privacyMicroLending.connect(borrower1).registerBorrower(VALID_CREDIT_SCORE, true)
    })

    it("Should allow registered borrower to request loan", async function () {
      await expect(
        privacyMicroLending.connect(borrower1).requestLoan(LOAN_AMOUNT, INTEREST_RATE, LOAN_DURATION, false)
      )
        .to.emit(privacyMicroLending, "LoanRequested")
        .withArgs(1, borrower1.address)

      expect(await privacyMicroLending.loanCounter()).to.equal(1)

      const profile = await privacyMicroLending.borrowerProfiles(borrower1.address)
      expect(profile.totalLoans).to.equal(1)

      const loanCount = await privacyMicroLending.getBorrowerLoanCount(borrower1.address)
      expect(loanCount).to.equal(1)
    })

    it("Should reject loan request from unregistered borrower", async function () {
      await expect(
        privacyMicroLending.connect(borrower2).requestLoan(LOAN_AMOUNT, INTEREST_RATE, LOAN_DURATION, false)
      ).to.be.revertedWith("Borrower not active")
    })

    it("Should reject loan with invalid amount (too small)", async function () {
      const tooSmallAmount = ethers.parseEther("0.0001") // Below minimum
      
      await expect(
        privacyMicroLending.connect(borrower1).requestLoan(tooSmallAmount, INTEREST_RATE, LOAN_DURATION, false)
      ).to.be.revertedWith("Invalid loan amount")
    })

    it("Should reject loan with invalid amount (too large)", async function () {
      const tooLargeAmount = ethers.parseEther("15") // Above maximum
      
      await expect(
        privacyMicroLending.connect(borrower1).requestLoan(tooLargeAmount, INTEREST_RATE, LOAN_DURATION, false)
      ).to.be.revertedWith("Invalid loan amount")
    })

    it("Should reject loan with invalid interest rate", async function () {
      const invalidInterestRate = 15000 // 150% - above maximum
      
      await expect(
        privacyMicroLending.connect(borrower1).requestLoan(LOAN_AMOUNT, invalidInterestRate, LOAN_DURATION, false)
      ).to.be.revertedWith("Interest rate too high")
    })

    it("Should reject loan with invalid duration", async function () {
      const invalidDuration = 400 * 24 * 60 * 60 // Over 365 days
      
      await expect(
        privacyMicroLending.connect(borrower1).requestLoan(LOAN_AMOUNT, INTEREST_RATE, invalidDuration, false)
      ).to.be.revertedWith("Invalid duration")
    })

    it("Should create both public and private loans", async function () {
      // Create public loan
      await privacyMicroLending.connect(borrower1).requestLoan(LOAN_AMOUNT, INTEREST_RATE, LOAN_DURATION, false)
      
      let loanInfo = await privacyMicroLending.getLoanBasicInfo(1)
      expect(loanInfo.isPrivate).to.be.false

      // Create private loan
      await privacyMicroLending.connect(borrower1).requestLoan(LOAN_AMOUNT, INTEREST_RATE, LOAN_DURATION, true)
      
      loanInfo = await privacyMicroLending.getLoanBasicInfo(2)
      expect(loanInfo.isPrivate).to.be.true
    })
  })

  describe("Loan Funding", function () {
    let loanId: number

    beforeEach(async function () {
      // Register borrower and create loan
      await privacyMicroLending.connect(borrower1).registerBorrower(VALID_CREDIT_SCORE, true)
      await privacyMicroLending.connect(borrower1).requestLoan(LOAN_AMOUNT, INTEREST_RATE, LOAN_DURATION, false)
      loanId = 1
    })

    it("Should allow lender to fund public loan", async function () {
      const fundingAmount = ethers.parseEther("1.0")

      await expect(
        privacyMicroLending.connect(lender1).fundLoan(loanId, { value: fundingAmount })
      )
        .to.emit(privacyMicroLending, "LoanFunded")
        .withArgs(loanId, lender1.address, borrower1.address)

      const loanInfo = await privacyMicroLending.getLoanBasicInfo(loanId)
      expect(loanInfo.lender).to.equal(lender1.address)
      expect(loanInfo.status).to.equal(1) // LoanStatus.Funded

      const lenderLoanCount = await privacyMicroLending.getLenderLoanCount(lender1.address)
      expect(lenderLoanCount).to.equal(1)
    })

    it("Should prevent borrower from funding own loan", async function () {
      const fundingAmount = ethers.parseEther("1.0")

      await expect(
        privacyMicroLending.connect(borrower1).fundLoan(loanId, { value: fundingAmount })
      ).to.be.revertedWith("Cannot fund own loan")
    })

    it("Should prevent funding with zero ETH", async function () {
      await expect(
        privacyMicroLending.connect(lender1).fundLoan(loanId, { value: 0 })
      ).to.be.revertedWith("Must send ETH")
    })

    it("Should prevent funding already funded loan", async function () {
      const fundingAmount = ethers.parseEther("1.0")

      // Fund the loan first time
      await privacyMicroLending.connect(lender1).fundLoan(loanId, { value: fundingAmount })

      // Try to fund again
      await expect(
        privacyMicroLending.connect(lender2).fundLoan(loanId, { value: fundingAmount })
      ).to.be.revertedWith("Loan not available")
    })

    it("Should prevent funding non-existent loan", async function () {
      const nonExistentLoanId = 999
      const fundingAmount = ethers.parseEther("1.0")

      await expect(
        privacyMicroLending.connect(lender1).fundLoan(nonExistentLoanId, { value: fundingAmount })
      ).to.be.revertedWith("Loan does not exist")
    })

    it("Should transfer funds to borrower correctly", async function () {
      const fundingAmount = ethers.parseEther("1.0")
      const borrowerBalanceBefore = await ethers.provider.getBalance(borrower1.address)

      await privacyMicroLending.connect(lender1).fundLoan(loanId, { value: fundingAmount })

      const borrowerBalanceAfter = await ethers.provider.getBalance(borrower1.address)
      expect(borrowerBalanceAfter - borrowerBalanceBefore).to.equal(fundingAmount)
    })
  })

  describe("Loan Repayment", function () {
    let loanId: number

    beforeEach(async function () {
      // Register borrower, create and fund loan
      await privacyMicroLending.connect(borrower1).registerBorrower(VALID_CREDIT_SCORE, true)
      await privacyMicroLending.connect(borrower1).requestLoan(LOAN_AMOUNT, INTEREST_RATE, LOAN_DURATION, false)
      loanId = 1

      const fundingAmount = ethers.parseEther("1.0")
      await privacyMicroLending.connect(lender1).fundLoan(loanId, { value: fundingAmount })
    })

    it("Should allow borrower to repay loan", async function () {
      const repaymentAmount = ethers.parseEther("1.05") // Principal + interest

      await expect(
        privacyMicroLending.connect(borrower1).repayLoan(loanId, { value: repaymentAmount })
      )
        .to.emit(privacyMicroLending, "LoanRepaid")
        .withArgs(loanId, borrower1.address)

      const loanInfo = await privacyMicroLending.getLoanBasicInfo(loanId)
      expect(loanInfo.status).to.equal(2) // LoanStatus.Repaid

      const profile = await privacyMicroLending.borrowerProfiles(borrower1.address)
      expect(profile.successfulRepayments).to.equal(1)
    })

    it("Should prevent non-borrower from repaying loan", async function () {
      const repaymentAmount = ethers.parseEther("1.05")

      await expect(
        privacyMicroLending.connect(lender1).repayLoan(loanId, { value: repaymentAmount })
      ).to.be.revertedWith("Not borrower")
    })

    it("Should prevent repaying unfunded loan", async function () {
      // Create another loan that's not funded
      await privacyMicroLending.connect(borrower1).requestLoan(LOAN_AMOUNT, INTEREST_RATE, LOAN_DURATION, false)
      const unfundedLoanId = 2

      const repaymentAmount = ethers.parseEther("1.05")

      await expect(
        privacyMicroLending.connect(borrower1).repayLoan(unfundedLoanId, { value: repaymentAmount })
      ).to.be.revertedWith("Loan not funded")
    })

    it("Should prevent repaying with zero ETH", async function () {
      await expect(
        privacyMicroLending.connect(borrower1).repayLoan(loanId, { value: 0 })
      ).to.be.revertedWith("Must send repayment")
    })

    it("Should transfer repayment to lender correctly", async function () {
      const repaymentAmount = ethers.parseEther("1.05")
      const lenderBalanceBefore = await ethers.provider.getBalance(lender1.address)

      await privacyMicroLending.connect(borrower1).repayLoan(loanId, { value: repaymentAmount })

      const lenderBalanceAfter = await ethers.provider.getBalance(lender1.address)
      expect(lenderBalanceAfter - lenderBalanceBefore).to.equal(repaymentAmount)
    })
  })

  describe("Loan Default", function () {
    let loanId: number

    beforeEach(async function () {
      // Register borrower, create and fund loan with short duration for testing
      await privacyMicroLending.connect(borrower1).registerBorrower(VALID_CREDIT_SCORE, true)
      await privacyMicroLending.connect(borrower1).requestLoan(LOAN_AMOUNT, INTEREST_RATE, 1, false) // 1 second duration
      loanId = 1

      const fundingAmount = ethers.parseEther("1.0")
      await privacyMicroLending.connect(lender1).fundLoan(loanId, { value: fundingAmount })

      // Wait for loan to become overdue
      await new Promise(resolve => setTimeout(resolve, 2000))
    })

    it("Should allow lender to mark loan as defaulted after due date", async function () {
      await expect(
        privacyMicroLending.connect(lender1).markDefault(loanId)
      )
        .to.emit(privacyMicroLending, "LoanDefaulted")
        .withArgs(loanId, borrower1.address)

      const loanInfo = await privacyMicroLending.getLoanBasicInfo(loanId)
      expect(loanInfo.status).to.equal(3) // LoanStatus.Defaulted
    })

    it("Should prevent non-lender from marking default", async function () {
      await expect(
        privacyMicroLending.connect(borrower1).markDefault(loanId)
      ).to.be.revertedWith("Not lender")
    })

    it("Should prevent marking default on unfunded loan", async function () {
      // Create another unfunded loan
      await privacyMicroLending.connect(borrower1).requestLoan(LOAN_AMOUNT, INTEREST_RATE, LOAN_DURATION, false)
      const unfundedLoanId = 2

      await expect(
        privacyMicroLending.connect(lender1).markDefault(unfundedLoanId)
      ).to.be.revertedWith("Loan not funded")
    })
  })

  describe("Privacy Features", function () {
    beforeEach(async function () {
      await privacyMicroLending.connect(borrower1).registerBorrower(VALID_CREDIT_SCORE, false) // Private profile
    })

    it("Should create private loan correctly", async function () {
      await privacyMicroLending.connect(borrower1).requestLoan(LOAN_AMOUNT, INTEREST_RATE, LOAN_DURATION, true)
      
      const loanInfo = await privacyMicroLending.getLoanBasicInfo(1)
      expect(loanInfo.isPrivate).to.be.true
    })

    it("Should allow borrower to grant view permission for private loan", async function () {
      await privacyMicroLending.connect(borrower1).requestLoan(LOAN_AMOUNT, INTEREST_RATE, LOAN_DURATION, true)
      
      await expect(
        privacyMicroLending.connect(borrower1).grantLoanViewPermission(1, lender1.address)
      )
        .to.emit(privacyMicroLending, "LoanViewPermissionGranted")
        .withArgs(1, lender1.address)

      expect(await privacyMicroLending.loanViewPermissions(1, lender1.address)).to.be.true
    })

    it("Should prevent non-borrower from granting permissions", async function () {
      await privacyMicroLending.connect(borrower1).requestLoan(LOAN_AMOUNT, INTEREST_RATE, LOAN_DURATION, true)
      
      await expect(
        privacyMicroLending.connect(lender1).grantLoanViewPermission(1, lender2.address)
      ).to.be.revertedWith("Not borrower")
    })

    it("Should prevent granting permissions for public loans", async function () {
      await privacyMicroLending.connect(borrower1).requestLoan(LOAN_AMOUNT, INTEREST_RATE, LOAN_DURATION, false)
      
      await expect(
        privacyMicroLending.connect(borrower1).grantLoanViewPermission(1, lender1.address)
      ).to.be.revertedWith("Loan is not private")
    })
  })

  describe("View Functions", function () {
    beforeEach(async function () {
      await privacyMicroLending.connect(borrower1).registerBorrower(VALID_CREDIT_SCORE, true)
      await privacyMicroLending.connect(borrower2).registerBorrower(700, true)
    })

    it("Should return correct borrower loan count", async function () {
      await privacyMicroLending.connect(borrower1).requestLoan(LOAN_AMOUNT, INTEREST_RATE, LOAN_DURATION, false)
      await privacyMicroLending.connect(borrower1).requestLoan(ethers.parseEther("0.5"), INTEREST_RATE, LOAN_DURATION, false)

      expect(await privacyMicroLending.getBorrowerLoanCount(borrower1.address)).to.equal(2)
      expect(await privacyMicroLending.getBorrowerLoanCount(borrower2.address)).to.equal(0)
    })

    it("Should return correct lender loan count", async function () {
      await privacyMicroLending.connect(borrower1).requestLoan(LOAN_AMOUNT, INTEREST_RATE, LOAN_DURATION, false)
      await privacyMicroLending.connect(borrower2).requestLoan(ethers.parseEther("0.5"), INTEREST_RATE, LOAN_DURATION, false)

      await privacyMicroLending.connect(lender1).fundLoan(1, { value: ethers.parseEther("1.0") })
      await privacyMicroLending.connect(lender1).fundLoan(2, { value: ethers.parseEther("0.5") })

      expect(await privacyMicroLending.getLenderLoanCount(lender1.address)).to.equal(2)
      expect(await privacyMicroLending.getLenderLoanCount(lender2.address)).to.equal(0)
    })

    it("Should return correct loan basic info", async function () {
      const currentTime = Math.floor(Date.now() / 1000)
      await privacyMicroLending.connect(borrower1).requestLoan(LOAN_AMOUNT, INTEREST_RATE, LOAN_DURATION, false)

      const loanInfo = await privacyMicroLending.getLoanBasicInfo(1)
      
      expect(loanInfo.borrower).to.equal(borrower1.address)
      expect(loanInfo.lender).to.equal(ethers.ZeroAddress) // Not funded yet
      expect(loanInfo.duration).to.equal(LOAN_DURATION)
      expect(loanInfo.createdAt).to.be.greaterThanOrEqual(currentTime)
      expect(loanInfo.fundedAt).to.equal(0)
      expect(loanInfo.dueDate).to.equal(0)
      expect(loanInfo.status).to.equal(0) // LoanStatus.Requested
      expect(loanInfo.isPrivate).to.be.false
    })

    it("Should return encrypted loan data functions", async function () {
      await privacyMicroLending.connect(borrower1).requestLoan(LOAN_AMOUNT, INTEREST_RATE, LOAN_DURATION, false)

      // These should not revert (actual encrypted values can't be easily tested)
      await expect(privacyMicroLending.getEncryptedLoanAmount(1)).to.not.be.reverted
      await expect(privacyMicroLending.getEncryptedInterestRate(1)).to.not.be.reverted
      await expect(privacyMicroLending.getEncryptedCreditScore(borrower1.address)).to.not.be.reverted
    })
  })

  describe("Admin Functions", function () {
    it("Should allow owner to pause and unpause borrowers", async function () {
      await privacyMicroLending.connect(borrower1).registerBorrower(VALID_CREDIT_SCORE, true)
      
      // Pause borrower
      await privacyMicroLending.connect(owner).pauseBorrower(borrower1.address)
      let profile = await privacyMicroLending.borrowerProfiles(borrower1.address)
      expect(profile.isActive).to.be.false

      // Unpause borrower
      await privacyMicroLending.connect(owner).unpauseBorrower(borrower1.address)
      profile = await privacyMicroLending.borrowerProfiles(borrower1.address)
      expect(profile.isActive).to.be.true
    })

    it("Should prevent non-owner from pausing borrowers", async function () {
      await privacyMicroLending.connect(borrower1).registerBorrower(VALID_CREDIT_SCORE, true)
      
      await expect(
        privacyMicroLending.connect(borrower1).pauseBorrower(borrower1.address)
      ).to.be.revertedWith("Not authorized")
    })

    it("Should allow owner to emergency withdraw", async function () {
      // Fund contract with some ETH
      await owner.sendTransaction({
        to: await privacyMicroLending.getAddress(),
        value: ethers.parseEther("1.0")
      })

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address)
      const contractBalance = await privacyMicroLending.getContractBalance()

      const tx = await privacyMicroLending.connect(owner).emergencyWithdraw()
      const receipt = await tx.wait()
      const gasUsed = receipt!.gasUsed * tx.gasPrice!

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address)
      
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + contractBalance - gasUsed)
    })

    it("Should prevent non-owner from emergency withdraw", async function () {
      await expect(
        privacyMicroLending.connect(borrower1).emergencyWithdraw()
      ).to.be.revertedWith("Not authorized")
    })
  })

  describe("Edge Cases and Error Handling", function () {
    it("Should handle view functions for non-existent loans", async function () {
      await expect(
        privacyMicroLending.getLoanBasicInfo(999)
      ).to.be.revertedWith("Loan does not exist")
    })

    it("Should handle encrypted data access for inactive borrowers", async function () {
      await expect(
        privacyMicroLending.getEncryptedCreditScore(borrower1.address)
      ).to.be.revertedWith("Borrower not active")
    })

    it("Should return zero for loan counts of addresses with no loans", async function () {
      expect(await privacyMicroLending.getBorrowerLoanCount(borrower1.address)).to.equal(0)
      expect(await privacyMicroLending.getLenderLoanCount(lender1.address)).to.equal(0)
    })
  })
})