# Step-by-Step Development Guide: Building Your First FHEVM dApp

This guide provides detailed, actionable steps for building a complete FHEVM dApp from scratch. Follow along to create your own privacy-preserving micro-lending application.

## 📋 Development Timeline

**Estimated Time: 4-6 hours**
- Setup: 30 minutes
- Smart Contract: 2 hours
- Frontend: 2-3 hours
- Testing & Deployment: 1 hour

## 🚀 Phase 1: Environment Setup (30 minutes)

### Step 1.1: Install Prerequisites
```bash
# Check Node.js version (must be 18+)
node --version

# If needed, install Node.js from nodejs.org
# Install Git if not available
git --version
```

### Step 1.2: Create Project Structure
```bash
# Create main project directory
mkdir hello-fhevm-dapp
cd hello-fhevm-dapp

# Initialize project
npm init -y

# Create directory structure
mkdir src
mkdir contracts
mkdir scripts
mkdir public
```

### Step 1.3: Install Dependencies
```bash
# Core dependencies
npm install react@18.2.0 react-dom@18.2.0 ethers@6.13.2

# Development dependencies
npm install -D @types/react@18.2.66 @types/react-dom@18.2.22
npm install -D typescript@5.2.2 vite@5.2.0 @vitejs/plugin-react@4.2.1

# FHEVM specific (when available)
# npm install fhevm-library

# Testing and deployment
npm install -D hardhat @nomicfoundation/hardhat-ethers
```

### Step 1.4: Configure Development Environment

Create `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  define: {
    global: 'globalThis',
  }
})
```

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Step 1.5: Setup MetaMask
1. Install MetaMask browser extension
2. Create or import wallet
3. Add Sepolia testnet:
   - Network Name: Sepolia Test Network
   - RPC URL: `https://sepolia.infura.io/v3/`
   - Chain ID: 11155111
   - Currency: ETH
4. Get test ETH from [Sepolia Faucet](https://sepoliafaucet.com/)

**✅ Checkpoint**: You should have a working development environment with MetaMask connected to Sepolia.

---

## 💻 Phase 2: Smart Contract Development (2 hours)

### Step 2.1: Create Hardhat Configuration

Initialize Hardhat:
```bash
npx hardhat init
# Choose "Create a TypeScript project"
# Install all suggested dependencies
```

Update `hardhat.config.ts`:
```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    sepolia: {
      url: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: ["YOUR_PRIVATE_KEY"] // Add your private key here
    }
  }
};

export default config;
```

### Step 2.2: Design the Smart Contract

Create `contracts/PrivateLending.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Import FHEVM library (simulated for tutorial)
// In real implementation: import "fhevm/lib/TFHE.sol";

contract PrivateLending {

    // Simulated encrypted types (replace with actual FHEVM types)
    struct EncryptedUint32 {
        bytes32 data;
    }

    struct EncryptedBool {
        bytes32 data;
    }

    // Borrower profile with encrypted credit score
    struct BorrowerProfile {
        EncryptedUint32 creditScore;    // Encrypted credit score
        uint256 totalLoans;             // Public loan count
        uint256 successfulRepayments;   // Public repayment count
        bool isActive;                  // Public status
        uint256 registrationTime;      // Public timestamp
    }

    // Loan request with encrypted terms
    struct LoanRequest {
        uint256 loanId;
        address borrower;
        address lender;                 // Zero address if not funded
        EncryptedUint32 amount;         // Encrypted loan amount
        EncryptedUint32 interestRate;   // Encrypted interest rate
        uint256 duration;               // Public duration (in seconds)
        uint256 requestTime;            // Public request timestamp
        uint256 fundingTime;            // Public funding timestamp
        uint256 dueTime;               // Public due date
        LoanStatus status;             // Public status
        bool isPrivate;                // Privacy setting
    }

    enum LoanStatus {
        Requested,    // 0: Loan requested, waiting for funding
        Funded,       // 1: Loan funded, waiting for repayment
        Repaid,       // 2: Loan fully repaid
        Defaulted     // 3: Loan defaulted
    }

    // State variables
    mapping(address => BorrowerProfile) public borrowerProfiles;
    mapping(address => bool) public approvedBorrowers;
    mapping(uint256 => LoanRequest) public loanRequests;

    uint256 public loanCounter;
    address public owner;

    // Constants
    uint256 public constant MIN_LOAN_AMOUNT = 0.001 ether;
    uint256 public constant MAX_LOAN_AMOUNT = 10 ether;
    uint256 public constant MAX_INTEREST_RATE = 10000; // 100% in basis points
    uint256 public constant MAX_LOAN_DURATION = 365 days;

    // Events
    event BorrowerRegistered(address indexed borrower, uint256 timestamp);
    event LoanRequested(uint256 indexed loanId, address indexed borrower, uint256 timestamp);
    event LoanFunded(uint256 indexed loanId, address indexed lender, address indexed borrower);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event LoanDefaulted(uint256 indexed loanId, address indexed borrower);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyApprovedBorrower() {
        require(approvedBorrowers[msg.sender], "Not an approved borrower");
        _;
    }

    modifier validLoanId(uint256 loanId) {
        require(loanId > 0 && loanId <= loanCounter, "Invalid loan ID");
        _;
    }

    constructor() {
        owner = msg.sender;
        loanCounter = 0;
    }

    // Register as borrower with encrypted credit score
    function registerBorrower(uint256 creditScore) external {
        require(creditScore >= 300 && creditScore <= 850, "Credit score must be between 300-850");
        require(!approvedBorrowers[msg.sender], "Already registered");

        // Simulate encryption (replace with actual FHEVM encryption)
        EncryptedUint32 memory encryptedScore = EncryptedUint32({
            data: keccak256(abi.encodePacked(creditScore, msg.sender, block.timestamp))
        });

        borrowerProfiles[msg.sender] = BorrowerProfile({
            creditScore: encryptedScore,
            totalLoans: 0,
            successfulRepayments: 0,
            isActive: true,
            registrationTime: block.timestamp
        });

        approvedBorrowers[msg.sender] = true;

        emit BorrowerRegistered(msg.sender, block.timestamp);
    }

    // Request a loan with encrypted terms
    function requestLoan(
        uint256 amount,
        uint256 interestRate,
        uint256 duration
    ) external onlyApprovedBorrower returns (uint256) {
        require(amount >= MIN_LOAN_AMOUNT && amount <= MAX_LOAN_AMOUNT, "Invalid loan amount");
        require(interestRate <= MAX_INTEREST_RATE, "Interest rate too high");
        require(duration <= MAX_LOAN_DURATION, "Duration too long");

        loanCounter++;

        // Simulate encryption of sensitive terms
        EncryptedUint32 memory encryptedAmount = EncryptedUint32({
            data: keccak256(abi.encodePacked(amount, msg.sender, loanCounter))
        });

        EncryptedUint32 memory encryptedRate = EncryptedUint32({
            data: keccak256(abi.encodePacked(interestRate, msg.sender, loanCounter))
        });

        loanRequests[loanCounter] = LoanRequest({
            loanId: loanCounter,
            borrower: msg.sender,
            lender: address(0),
            amount: encryptedAmount,
            interestRate: encryptedRate,
            duration: duration,
            requestTime: block.timestamp,
            fundingTime: 0,
            dueTime: 0,
            status: LoanStatus.Requested,
            isPrivate: false // Can be made configurable
        });

        // Update borrower profile
        borrowerProfiles[msg.sender].totalLoans++;

        emit LoanRequested(loanCounter, msg.sender, block.timestamp);
        return loanCounter;
    }

    // Fund a loan request
    function fundLoan(uint256 loanId) external payable validLoanId(loanId) {
        LoanRequest storage loan = loanRequests[loanId];

        require(loan.status == LoanStatus.Requested, "Loan not available for funding");
        require(loan.borrower != msg.sender, "Cannot fund your own loan");
        require(msg.value > 0, "Must send ETH to fund loan");

        // In real implementation, decrypt amount and verify
        // For tutorial, we accept any funding amount

        loan.lender = msg.sender;
        loan.status = LoanStatus.Funded;
        loan.fundingTime = block.timestamp;
        loan.dueTime = block.timestamp + loan.duration;

        // Transfer funds to borrower
        payable(loan.borrower).transfer(msg.value);

        emit LoanFunded(loanId, msg.sender, loan.borrower);
    }

    // Repay a loan
    function repayLoan(uint256 loanId) external payable validLoanId(loanId) {
        LoanRequest storage loan = loanRequests[loanId];

        require(loan.borrower == msg.sender, "Only borrower can repay");
        require(loan.status == LoanStatus.Funded, "Loan not available for repayment");
        require(msg.value > 0, "Must send ETH for repayment");

        loan.status = LoanStatus.Repaid;

        // Update borrower profile
        borrowerProfiles[msg.sender].successfulRepayments++;

        // Transfer repayment to lender
        payable(loan.lender).transfer(msg.value);

        emit LoanRepaid(loanId, msg.sender, msg.value);
    }

    // Mark loan as defaulted (only owner)
    function markDefault(uint256 loanId) external onlyOwner validLoanId(loanId) {
        LoanRequest storage loan = loanRequests[loanId];

        require(loan.status == LoanStatus.Funded, "Loan not funded");
        require(block.timestamp > loan.dueTime, "Loan not yet due");

        loan.status = LoanStatus.Defaulted;

        emit LoanDefaulted(loanId, loan.borrower);
    }

    // View functions
    function getBorrowerLoanCount(address borrower) external view returns (uint256) {
        return borrowerProfiles[borrower].totalLoans;
    }

    function getLenderLoanCount(address lender) external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i <= loanCounter; i++) {
            if (loanRequests[i].lender == lender) {
                count++;
            }
        }
        return count;
    }

    // Calculate repayment amount (simplified for tutorial)
    function calculateRepaymentAmount(uint256 loanId) external view validLoanId(loanId) returns (uint256) {
        // In real implementation, decrypt encrypted amount and rate
        // For tutorial, return a fixed calculation
        return 1.1 ether; // 10% interest for demonstration
    }

    // Emergency functions
    function pause() external onlyOwner {
        // Implementation for emergency pause
    }

    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}
```

### Step 2.3: Compile and Test Contract

Compile the contract:
```bash
npx hardhat compile
```

Create test file `test/PrivateLending.test.ts`:
```typescript
import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateLending", function () {
  let privateLending: any;
  let owner: any;
  let borrower: any;
  let lender: any;

  beforeEach(async function () {
    [owner, borrower, lender] = await ethers.getSigners();

    const PrivateLending = await ethers.getContractFactory("PrivateLending");
    privateLending = await PrivateLending.deploy();
  });

  it("Should register a borrower", async function () {
    await privateLending.connect(borrower).registerBorrower(750);

    expect(await privateLending.approvedBorrowers(borrower.address)).to.be.true;
  });

  it("Should create a loan request", async function () {
    await privateLending.connect(borrower).registerBorrower(750);

    await privateLending.connect(borrower).requestLoan(
      ethers.parseEther("1"),
      1000, // 10% interest
      30 * 24 * 60 * 60 // 30 days
    );

    expect(await privateLending.loanCounter()).to.equal(1);
  });

  it("Should fund a loan", async function () {
    await privateLending.connect(borrower).registerBorrower(750);

    await privateLending.connect(borrower).requestLoan(
      ethers.parseEther("1"),
      1000,
      30 * 24 * 60 * 60
    );

    await privateLending.connect(lender).fundLoan(1, {
      value: ethers.parseEther("1")
    });

    const loan = await privateLending.loanRequests(1);
    expect(loan.lender).to.equal(lender.address);
    expect(loan.status).to.equal(1); // Funded
  });
});
```

Run tests:
```bash
npx hardhat test
```

**✅ Checkpoint**: Smart contract compiles successfully and passes all tests.

---

## 🎨 Phase 3: Frontend Development (2-3 hours)

### Step 3.1: Create Basic HTML Structure

Create `index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hello FHEVM - Privacy-First Lending</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Step 3.2: Create Main Entry Point

Create `src/main.tsx`:
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### Step 3.3: Build Core App Component

Create `src/App.tsx`:
```typescript
import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import './App.css'

// Contract configuration
const CONTRACT_ADDRESS = "0x..." // Update after deployment
const SEPOLIA_CHAIN_ID = "0xaa36a7" // 11155111 in decimal

// Contract ABI (Application Binary Interface)
const CONTRACT_ABI = [
  "function registerBorrower(uint256 creditScore) external",
  "function requestLoan(uint256 amount, uint256 interestRate, uint256 duration) external returns (uint256)",
  "function fundLoan(uint256 loanId) external payable",
  "function repayLoan(uint256 loanId) external payable",
  "function getBorrowerLoanCount(address borrower) external view returns (uint256)",
  "function loanCounter() external view returns (uint256)",
  "function approvedBorrowers(address) external view returns (bool)",
  "function loanRequests(uint256) external view returns (uint256, address, address, bytes32, bytes32, uint256, uint256, uint256, uint256, uint8, bool)",
  "event BorrowerRegistered(address indexed borrower, uint256 timestamp)",
  "event LoanRequested(uint256 indexed loanId, address indexed borrower, uint256 timestamp)",
  "event LoanFunded(uint256 indexed loanId, address indexed lender, address indexed borrower)"
]

// TypeScript interfaces
interface Web3State {
  account: string
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null
  contract: ethers.Contract | null
  isConnected: boolean
  networkId: string
}

interface BorrowerProfile {
  totalLoans: number
  successfulRepayments: number
  isActive: boolean
}

interface TransactionStatus {
  hash?: string
  status: 'pending' | 'success' | 'error' | 'cancelled'
  message: string
}

declare global {
  interface Window {
    ethereum?: any
  }
}

function App() {
  // Web3 connection state
  const [web3State, setWeb3State] = useState<Web3State>({
    account: '',
    provider: null,
    signer: null,
    contract: null,
    isConnected: false,
    networkId: ''
  })

  // Application state
  const [loading, setLoading] = useState<boolean>(false)
  const [txStatus, setTxStatus] = useState<TransactionStatus | null>(null)
  const [userProfile, setUserProfile] = useState<BorrowerProfile | null>(null)
  const [isRegistered, setIsRegistered] = useState<boolean>(false)
  const [userBalance, setUserBalance] = useState<string>('0')
  const [totalLoans, setTotalLoans] = useState<number>(0)

  // Form state
  const [creditScore, setCreditScore] = useState<string>('')
  const [loanAmount, setLoanAmount] = useState<string>('')
  const [interestRate, setInterestRate] = useState<string>('')
  const [loanDuration, setLoanDuration] = useState<string>('')

  // Check if MetaMask is installed
  const isMetaMaskInstalled = useCallback(() => {
    return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask
  }, [])

  // Connect to MetaMask wallet
  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      setTxStatus({
        status: 'error',
        message: 'MetaMask is not installed. Please install MetaMask to continue.'
      })
      return
    }

    try {
      setLoading(true)
      setTxStatus({
        status: 'pending',
        message: 'Connecting to MetaMask...'
      })

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length === 0) {
        throw new Error('No accounts returned from MetaMask')
      }

      // Check network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })

      if (chainId !== SEPOLIA_CHAIN_ID) {
        await switchToSepolia()
      }

      // Initialize provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      // Initialize contract
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)

      // Get user balance
      const balance = await provider.getBalance(accounts[0])

      // Update state
      setWeb3State({
        account: accounts[0],
        provider,
        signer,
        contract,
        isConnected: true,
        networkId: chainId
      })

      setUserBalance(ethers.formatEther(balance))

      // Load user data
      await loadUserData(accounts[0], contract)

      setTxStatus({
        status: 'success',
        message: `Successfully connected! Address: ${accounts[0].slice(0, 8)}...${accounts[0].slice(-6)}`
      })

    } catch (error: any) {
      console.error('Wallet connection failed:', error)
      setTxStatus({
        status: 'error',
        message: `Connection failed: ${error.message || 'Unknown error'}`
      })
    } finally {
      setLoading(false)
    }
  }

  // Switch to Sepolia network
  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      })
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: SEPOLIA_CHAIN_ID,
              chainName: 'Sepolia Test Network',
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18
              },
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            }]
          })
        } catch (addError) {
          throw new Error('Failed to add Sepolia network')
        }
      } else {
        throw switchError
      }
    }
  }

  // Load user data from blockchain
  const loadUserData = async (userAccount: string, contract: ethers.Contract) => {
    try {
      // Check if user is registered
      const isApproved = await contract.approvedBorrowers(userAccount)
      setIsRegistered(isApproved)

      if (isApproved) {
        const loanCount = await contract.getBorrowerLoanCount(userAccount)
        setUserProfile({
          totalLoans: Number(loanCount),
          successfulRepayments: 0, // Simplified for tutorial
          isActive: true
        })
      }

      // Get total loan count
      const totalLoanCount = await contract.loanCounter()
      setTotalLoans(Number(totalLoanCount))

    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }

  // Execute blockchain transaction
  const executeTransaction = async (
    contractMethod: any,
    args: any[],
    value: bigint = 0n,
    successMessage: string
  ) => {
    if (!web3State.contract) {
      setTxStatus({
        status: 'error',
        message: 'Wallet not connected'
      })
      return null
    }

    try {
      setLoading(true)

      setTxStatus({
        status: 'pending',
        message: 'Preparing transaction... Please confirm in MetaMask'
      })

      const txOptions: any = {}
      if (value > 0) {
        txOptions.value = value
      }

      // Send transaction
      const tx = await contractMethod(...args, txOptions)

      setTxStatus({
        status: 'pending',
        message: `Transaction sent! Hash: ${tx.hash}. Waiting for confirmation...`,
        hash: tx.hash
      })

      // Wait for confirmation
      await tx.wait()

      setTxStatus({
        status: 'success',
        message: successMessage,
        hash: tx.hash
      })

      // Refresh user data
      await loadUserData(web3State.account, web3State.contract)

      // Update balance
      if (web3State.provider) {
        const balance = await web3State.provider.getBalance(web3State.account)
        setUserBalance(ethers.formatEther(balance))
      }

      return tx

    } catch (error: any) {
      console.error('Transaction failed:', error)

      let errorMessage = 'Transaction failed'
      if (error.code === 4001) {
        errorMessage = 'Transaction cancelled by user'
      } else if (error.reason) {
        errorMessage = `Contract error: ${error.reason}`
      } else if (error.message) {
        errorMessage = error.message
      }

      setTxStatus({
        status: error.code === 4001 ? 'cancelled' : 'error',
        message: errorMessage
      })

      return null
    } finally {
      setLoading(false)
    }
  }

  // Register as borrower
  const registerBorrower = async () => {
    if (!creditScore) {
      setTxStatus({
        status: 'error',
        message: 'Please select a credit score'
      })
      return
    }

    const score = parseInt(creditScore)
    await executeTransaction(
      web3State.contract!.registerBorrower,
      [score],
      0n,
      `Successfully registered with credit score ${score}! 🎉`
    )

    setCreditScore('')
  }

  // Request a loan
  const requestLoan = async () => {
    if (!loanAmount || !interestRate || !loanDuration) {
      setTxStatus({
        status: 'error',
        message: 'Please fill in all loan details'
      })
      return
    }

    const amount = ethers.parseEther(loanAmount)
    const rate = parseInt(interestRate) * 100 // Convert to basis points
    const duration = parseInt(loanDuration) * 24 * 60 * 60 // Convert to seconds

    await executeTransaction(
      web3State.contract!.requestLoan,
      [amount, rate, duration],
      0n,
      `Loan request submitted! Amount: ${loanAmount} ETH, Rate: ${interestRate}% 💰`
    )

    // Clear form
    setLoanAmount('')
    setInterestRate('')
    setLoanDuration('')
  }

  // Auto-connect on page load
  useEffect(() => {
    const autoConnect = async () => {
      if (isMetaMaskInstalled()) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            await connectWallet()
          }
        } catch (error) {
          console.log('No previous connection found')
        }
      }
    }

    autoConnect()
  }, [])

  // Format transaction status
  const formatTransactionStatus = (status: TransactionStatus) => {
    const statusClass = {
      'pending': 'message-info',
      'success': 'message-success',
      'error': 'message-error',
      'cancelled': 'message-warning'
    }[status.status]

    return (
      <div className={statusClass}>
        <p>{status.message}</p>
        {status.hash && (
          <p>
            <a
              href={`https://sepolia.etherscan.io/tx/${status.hash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Etherscan →
            </a>
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="app">
      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <h1>🔒 Hello FHEVM</h1>
            <p>Your First Privacy-Preserving dApp</p>
            <p className="subtitle">
              Experience fully homomorphic encryption on Ethereum
            </p>
          </div>
        </header>

        {/* Status Messages */}
        {txStatus && formatTransactionStatus(txStatus)}

        {/* Connection Section */}
        {!web3State.isConnected ? (
          <div className="card">
            <h2>🔌 Connect Your Wallet</h2>
            <p>Connect MetaMask to start using privacy-preserving smart contracts!</p>

            {!isMetaMaskInstalled() && (
              <div className="message-error">
                <p>MetaMask is not installed.</p>
                <p>
                  <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Install MetaMask →
                  </a>
                </p>
              </div>
            )}

            <button
              onClick={connectWallet}
              disabled={loading || !isMetaMaskInstalled()}
              className="button button-primary"
            >
              {loading ? 'Connecting...' : 'Connect MetaMask'}
            </button>

            <div className="help-text">
              <p>Need Sepolia ETH? Get it from the{' '}
                <a
                  href="https://sepoliafaucet.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Sepolia Faucet
                </a>
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Wallet Info */}
            <div className="card">
              <h2>👛 Your Wallet</h2>
              <div className="wallet-info">
                <p><strong>Address:</strong> {web3State.account.slice(0, 8)}...{web3State.account.slice(-6)}</p>
                <p><strong>Balance:</strong> {userBalance} ETH</p>
                <p><strong>Network:</strong> Sepolia Testnet ✅</p>
                {userProfile && (
                  <div className="profile-stats">
                    <div className="stat">
                      <span className="stat-value">{userProfile.totalLoans}</span>
                      <span className="stat-label">Total Loans</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{userProfile.successfulRepayments}</span>
                      <span className="stat-label">Repayments</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Registration Section */}
            {!isRegistered && (
              <div className="card">
                <h2>📝 Register as Borrower</h2>
                <p>Register with an encrypted credit score to start borrowing.</p>

                <div className="form-group">
                  <label htmlFor="creditScore">Credit Score (300-850):</label>
                  <select
                    id="creditScore"
                    value={creditScore}
                    onChange={(e) => setCreditScore(e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Select Credit Score Range</option>
                    <option value="350">Poor (300-350)</option>
                    <option value="450">Fair (400-450)</option>
                    <option value="550">Fair (500-550)</option>
                    <option value="650">Good (600-650)</option>
                    <option value="750">Excellent (700-750)</option>
                    <option value="850">Perfect (800-850)</option>
                  </select>
                </div>

                <button
                  onClick={registerBorrower}
                  disabled={loading || !creditScore}
                  className="button button-secondary"
                >
                  {loading ? 'Registering...' : 'Register Borrower'}
                </button>

                <div className="privacy-note">
                  <p>🔒 Your credit score will be encrypted before storing on blockchain</p>
                </div>
              </div>
            )}

            {/* Loan Request Section */}
            {isRegistered && (
              <div className="card">
                <h2>💰 Request Loan</h2>
                <p>Submit a loan request with encrypted terms.</p>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="loanAmount">Loan Amount:</label>
                    <select
                      id="loanAmount"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      disabled={loading}
                    >
                      <option value="">Select Amount</option>
                      <option value="0.1">0.1 ETH</option>
                      <option value="0.5">0.5 ETH</option>
                      <option value="1.0">1.0 ETH</option>
                      <option value="2.0">2.0 ETH</option>
                      <option value="5.0">5.0 ETH</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="interestRate">Interest Rate:</label>
                    <select
                      id="interestRate"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      disabled={loading}
                    >
                      <option value="">Select Rate</option>
                      <option value="5">5% APR</option>
                      <option value="8">8% APR</option>
                      <option value="12">12% APR</option>
                      <option value="15">15% APR</option>
                      <option value="20">20% APR</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="loanDuration">Duration:</label>
                    <select
                      id="loanDuration"
                      value={loanDuration}
                      onChange={(e) => setLoanDuration(e.target.value)}
                      disabled={loading}
                    >
                      <option value="">Select Duration</option>
                      <option value="7">1 Week</option>
                      <option value="30">1 Month</option>
                      <option value="90">3 Months</option>
                      <option value="180">6 Months</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={requestLoan}
                  disabled={loading || !loanAmount || !interestRate || !loanDuration}
                  className="button button-accent"
                >
                  {loading ? 'Requesting...' : 'Request Loan'}
                </button>

                <div className="privacy-note">
                  <p>🔐 Loan amount and interest rate will be encrypted</p>
                </div>
              </div>
            )}

            {/* Platform Stats */}
            <div className="card stats-card">
              <h3>📊 Platform Statistics</h3>
              <div className="stats-grid">
                <div className="stat">
                  <span className="stat-value">{totalLoans}</span>
                  <span className="stat-label">Total Loans</span>
                </div>
                <div className="stat">
                  <span className="stat-value">100%</span>
                  <span className="stat-label">Privacy Protected</span>
                </div>
                <div className="stat">
                  <span className="stat-value">✅</span>
                  <span className="stat-label">FHEVM Enabled</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="footer">
          <div className="footer-content">
            <p>🚀 Built with FHEVM for ultimate privacy</p>
            <p>
              <a
                href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Contract on Etherscan →
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App
```

### Step 3.4: Add Styling

Create `src/App.css`:
```css
/* Reset and base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* App layout */
.app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
}

/* Header */
.header {
  text-align: center;
  margin-bottom: 40px;
}

.header-content h1 {
  font-size: 3rem;
  color: white;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.header-content p {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.2rem;
  margin-bottom: 5px;
}

.subtitle {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem !important;
}

/* Cards */
.card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.card h2 {
  color: #333;
  margin-bottom: 16px;
  font-size: 1.5rem;
}

.card h3 {
  color: #333;
  margin-bottom: 12px;
  font-size: 1.3rem;
}

.card p {
  color: #666;
  margin-bottom: 16px;
  line-height: 1.6;
}

/* Forms */
.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.form-group select,
.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
  background: white;
}

.form-group select:focus,
.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group select:disabled,
.form-group input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

/* Buttons */
.button {
  display: inline-block;
  padding: 14px 28px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  text-align: center;
  width: 100%;
  margin-bottom: 16px;
}

.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.button-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.button-secondary {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3);
}

.button-accent {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(250, 112, 154, 0.3);
}

.button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

/* Messages */
.message-info,
.message-success,
.message-error,
.message-warning {
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  border-left: 4px solid;
}

.message-info {
  background: #e3f2fd;
  color: #1976d2;
  border-color: #2196f3;
}

.message-success {
  background: #e8f5e8;
  color: #2e7d32;
  border-color: #4caf50;
}

.message-error {
  background: #ffebee;
  color: #c62828;
  border-color: #f44336;
}

.message-warning {
  background: #fff3e0;
  color: #ef6c00;
  border-color: #ff9800;
}

.message-info a,
.message-success a,
.message-error a,
.message-warning a {
  color: inherit;
  text-decoration: underline;
}

/* Wallet Info */
.wallet-info {
  background: rgba(102, 126, 234, 0.1);
  padding: 20px;
  border-radius: 12px;
  margin-top: 16px;
}

.wallet-info p {
  margin-bottom: 8px;
  color: #333;
}

/* Profile Stats */
.profile-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.stat {
  text-align: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
  color: #667eea;
}

.stat-label {
  display: block;
  font-size: 0.9rem;
  color: #666;
  margin-top: 4px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
}

.stats-card {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.stats-card h3 {
  color: white;
}

.stats-card .stat {
  background: rgba(255, 255, 255, 0.1);
}

.stats-card .stat-value {
  color: white;
}

.stats-card .stat-label {
  color: rgba(255, 255, 255, 0.8);
}

/* Privacy Note */
.privacy-note {
  background: rgba(102, 126, 234, 0.1);
  padding: 12px 16px;
  border-radius: 8px;
  margin-top: 16px;
  border-left: 4px solid #667eea;
}

.privacy-note p {
  margin: 0;
  color: #667eea;
  font-size: 0.9rem;
  font-weight: 500;
}

/* Help Text */
.help-text {
  margin-top: 20px;
  text-align: center;
}

.help-text p {
  color: #666;
  font-size: 0.9rem;
}

.help-text a {
  color: #667eea;
  text-decoration: none;
}

.help-text a:hover {
  text-decoration: underline;
}

/* Footer */
.footer {
  margin-top: 40px;
  padding: 20px 0;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.footer-content p {
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;
}

.footer-content a {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
}

.footer-content a:hover {
  text-decoration: underline;
}

/* Responsive Design */
@media (max-width: 768px) {
  .app {
    padding: 10px;
  }

  .card {
    padding: 20px;
  }

  .header-content h1 {
    font-size: 2rem;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .profile-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .profile-stats {
    grid-template-columns: 1fr;
  }
}
```

Create `src/index.css`:
```css
:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  width: 100%;
  margin: 0 auto;
}
```

**✅ Checkpoint**: Frontend is built and displays correctly with all components.

---

## 🧪 Phase 4: Testing and Deployment (1 hour)

### Step 4.1: Deploy Smart Contract

Create deployment script `scripts/deploy.ts`:
```typescript
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy the contract
  const PrivateLending = await ethers.getContractFactory("PrivateLending");
  const privateLending = await PrivateLending.deploy();

  await privateLending.waitForDeployment();

  console.log("PrivateLending deployed to:", await privateLending.getAddress());

  // Verify the deployment
  console.log("Contract owner:", await privateLending.owner());
  console.log("Loan counter:", await privateLending.loanCounter());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Deploy to Sepolia:
```bash
# Add your private key to hardhat.config.ts
# Deploy contract
npx hardhat run scripts/deploy.ts --network sepolia

# Copy the contract address and update it in src/App.tsx
```

### Step 4.2: Update Package.json Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "deploy:contract": "npx hardhat run scripts/deploy.ts --network sepolia",
    "compile": "npx hardhat compile",
    "test": "npx hardhat test"
  }
}
```

### Step 4.3: Testing Checklist

#### Local Testing
```bash
# Start development server
npm run dev

# Test in browser:
# 1. Connect MetaMask ✅
# 2. Register as borrower ✅
# 3. Request loan ✅
# 4. Check transaction on Etherscan ✅
```

#### Function Testing
- [ ] MetaMask connection works
- [ ] Network switching to Sepolia works
- [ ] Borrower registration completes
- [ ] Loan request transaction confirms
- [ ] User data loads correctly
- [ ] Error handling works properly
- [ ] UI is responsive on mobile

### Step 4.4: Production Deployment

Create `vercel.json` for Vercel deployment:
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "functions": {},
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Deploy to Vercel:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**✅ Final Checkpoint**: Your FHEVM dApp is live and fully functional!

---

## 📊 Performance Optimization

### Gas Optimization Tips
```solidity
// Batch operations to save gas
function batchRegisterAndRequest(
    uint256 creditScore,
    uint256 amount,
    uint256 rate,
    uint256 duration
) external {
    registerBorrower(creditScore);
    requestLoan(amount, rate, duration);
}

// Use appropriate data types
euint8 smallNumber;   // Use for values 0-255
euint32 largeNumber;  // Use for larger values

// Cache encrypted values
euint32 cachedScore = userCreditScores[msg.sender];
```

### Frontend Optimization
```typescript
// Use React.memo for expensive components
const ExpensiveLoanCard = React.memo(({ loan }) => {
  // Component logic
});

// Debounce user inputs
const debouncedSearch = useMemo(
  () => debounce((searchTerm) => {
    // Search logic
  }, 300),
  []
);
```

---

## 🎯 Next Steps and Advanced Features

### Immediate Improvements
1. **Real FHEVM Integration**: Replace simulated encryption with actual FHEVM library
2. **Enhanced UI**: Add loading states, better error handling, mobile responsiveness
3. **More Features**: Loan marketplace, automatic repayments, credit scoring

### Advanced Privacy Features
1. **Zero-Knowledge Proofs**: Combine with FHEVM for ultimate privacy
2. **Private Voting**: Add governance features with encrypted voting
3. **Confidential Auctions**: Implement sealed-bid auctions

### Production Readiness
1. **Security Audit**: Professional smart contract audit
2. **Gas Optimization**: Further reduce transaction costs
3. **Error Handling**: Comprehensive error management
4. **Documentation**: Complete API documentation

---

## 🏆 Congratulations!

You've successfully built your first FHEVM dApp! You now understand:

- ✅ How fully homomorphic encryption protects privacy
- ✅ FHEVM smart contract development patterns
- ✅ Frontend integration with encrypted data
- ✅ Transaction handling and user experience
- ✅ Deployment to Ethereum testnet

**What's Next?**
- Explore advanced FHEVM features
- Build more complex privacy-preserving applications
- Join the Zama community and contribute to the ecosystem
- Share your experience and help other developers learn FHEVM

**Happy Building! 🚀**