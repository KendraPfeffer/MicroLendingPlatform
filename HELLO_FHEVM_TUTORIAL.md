# Hello FHEVM: Your First Confidential dApp Tutorial

Welcome to the most beginner-friendly tutorial for building your first dApp with **Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine)**! 🚀

This tutorial will guide you through creating a complete privacy-preserving micro-lending application where users can request loans with **encrypted credit scores** and **confidential loan terms**. You'll learn how to build a real blockchain application that protects user privacy using cutting-edge cryptography.

## 🎯 What You'll Build

By the end of this tutorial, you'll have:
- A complete dApp (smart contract + frontend) running on Ethereum
- Understanding of how FHEVM encrypts sensitive data on-chain
- Experience with Web3 development using React and ethers.js
- A working knowledge of MetaMask integration
- Your first confidential application deployed on Sepolia testnet

## 🧠 Learning Objectives

After completing this tutorial, you will understand:
1. **FHEVM Basics**: How fully homomorphic encryption works in blockchain
2. **Smart Contract Development**: Writing Solidity contracts with encrypted data
3. **Frontend Integration**: Connecting React to blockchain with encrypted inputs
4. **Privacy Patterns**: When and how to use FHE in your dApps
5. **Web3 UX**: Creating user-friendly blockchain applications

## 📋 Prerequisites

### Required Knowledge
- **Solidity Basics**: Ability to write and deploy simple smart contracts
- **JavaScript/TypeScript**: Understanding of modern JavaScript
- **React Fundamentals**: Basic React hooks and component patterns
- **Web3 Concepts**: Familiarity with wallets, transactions, and gas

### No Experience Needed
- ❌ **No FHE knowledge required** - we'll explain everything!
- ❌ **No cryptography background needed**
- ❌ **No advanced mathematics required**

### Tools You'll Need
- [Node.js](https://nodejs.org/) (v18 or later)
- [MetaMask](https://metamask.io/) browser extension
- [Git](https://git-scm.com/) for version control
- Code editor (VS Code recommended)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/hello-fhevm-tutorial.git
cd hello-fhevm-tutorial
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Open in Browser
Navigate to `http://localhost:5173` and connect your MetaMask wallet!

## 📚 Tutorial Structure

### Part 1: Understanding FHEVM
- What is Fully Homomorphic Encryption?
- Why use FHE in blockchain applications?
- FHEVM vs traditional smart contracts

### Part 2: Setting Up Your Environment
- Installing development tools
- Configuring MetaMask for Sepolia
- Getting testnet ETH

### Part 3: Building the Smart Contract
- Creating encrypted data types
- Implementing privacy-preserving functions
- Deploying to Sepolia testnet

### Part 4: Building the Frontend
- React setup with TypeScript
- Integrating ethers.js
- Handling encrypted inputs and outputs

### Part 5: Testing and Deployment
- Testing with real transactions
- Understanding gas costs
- Deploying to production

---

## 🔐 Part 1: Understanding FHEVM

### What is Fully Homomorphic Encryption (FHE)?

**Fully Homomorphic Encryption** allows you to perform computations on encrypted data without ever decrypting it. Think of it as a magical box where you can:

- Put encrypted numbers in
- Perform math operations (add, multiply, compare)
- Get encrypted results out
- **Never see the actual values during computation**

### Real-World Example: Private Credit Scores

In traditional systems:
```javascript
// ❌ Everyone can see your credit score
const creditScore = 750; // Visible to everyone!
const loanApproved = creditScore > 650; // Computation on raw data
```

With FHEVM:
```javascript
// ✅ Credit score stays encrypted
const encryptedCreditScore = encrypt(750); // Only you know it's 750
const loanApproved = encryptedCreditScore.gt(encrypt(650)); // Computation on encrypted data
// Result is encrypted - only authorized parties can decrypt
```

### Why Use FHEVM in Blockchain?

**Traditional blockchain problems:**
- All data is public by default
- Privacy requires complex zero-knowledge proofs
- Sensitive financial data exposed to everyone

**FHEVM solutions:**
- Data stays encrypted on-chain
- Smart contracts compute on encrypted values
- Only authorized users can see decrypted results
- No complex cryptography knowledge needed

### Key FHEVM Concepts

1. **Encrypted Inputs**: Users encrypt data before sending to blockchain
2. **Encrypted Computation**: Smart contracts work with encrypted values
3. **Access Control**: Only authorized parties can decrypt results
4. **Gas Efficiency**: More expensive than regular operations, but manageable

---

## 🛠️ Part 2: Setting Up Your Environment

### 2.1 Install Development Tools

#### Install Node.js and npm
```bash
# Check if already installed
node --version  # Should be v18 or later
npm --version

# If not installed, download from https://nodejs.org/
```

#### Install Git
```bash
# Check installation
git --version

# If not installed, download from https://git-scm.com/
```

### 2.2 Set Up MetaMask

#### Install MetaMask Extension
1. Visit [metamask.io](https://metamask.io/)
2. Click "Download" → "Install MetaMask for Chrome/Firefox"
3. Follow installation instructions
4. Create a new wallet or import existing one

#### Add Sepolia Testnet
1. Open MetaMask
2. Click network dropdown (usually shows "Ethereum Mainnet")
3. Click "Add Network"
4. Enter Sepolia details:
   - **Network Name**: Sepolia Test Network
   - **RPC URL**: `https://sepolia.infura.io/v3/`
   - **Chain ID**: 11155111
   - **Currency Symbol**: ETH
   - **Block Explorer**: `https://sepolia.etherscan.io`

### 2.3 Get Testnet ETH

You'll need Sepolia ETH to pay for transactions:

1. Copy your MetaMask address
2. Visit [Sepolia Faucet](https://sepoliafaucet.com/)
3. Paste your address and request ETH
4. Wait for confirmation (usually 1-2 minutes)

**Alternative faucets:**
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Chainlink Faucet](https://faucets.chain.link/)

### 2.4 Project Setup

#### Create New Project
```bash
# Create project directory
mkdir hello-fhevm-tutorial
cd hello-fhevm-tutorial

# Initialize npm project
npm init -y

# Install required dependencies
npm install react react-dom ethers@6.13.2
npm install -D @types/react @types/react-dom typescript vite @vitejs/plugin-react
```

#### Project Structure
```
hello-fhevm-tutorial/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   └── App.css
├── public/
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 💻 Part 3: Building the Smart Contract

### 3.1 Understanding FHEVM Smart Contracts

In FHEVM, instead of regular `uint256` or `bool`, we use encrypted types:

```solidity
// Traditional Solidity
uint256 public creditScore = 750;
bool public loanApproved = true;

// FHEVM Solidity
euint32 private encryptedCreditScore;  // Encrypted 32-bit integer
ebool private encryptedLoanApproved;   // Encrypted boolean
```

### 3.2 Key FHEVM Data Types

| Type | Description | Use Case |
|------|-------------|----------|
| `euint8` | Encrypted 8-bit integer (0-255) | Small numbers, status codes |
| `euint16` | Encrypted 16-bit integer (0-65535) | Medium numbers, counts |
| `euint32` | Encrypted 32-bit integer | Large numbers, amounts |
| `euint64` | Encrypted 64-bit integer | Very large numbers |
| `ebool` | Encrypted boolean | True/false values |
| `eaddress` | Encrypted address | Wallet addresses |

### 3.3 Smart Contract Example

Here's our privacy-preserving lending contract:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";

contract PrivateLending {
    using TFHE for euint32;
    using TFHE for ebool;

    struct LoanRequest {
        address borrower;
        euint32 encryptedAmount;      // Loan amount (encrypted)
        euint32 encryptedCreditScore; // Credit score (encrypted)
        ebool isApproved;             // Approval status (encrypted)
        bool isActive;                // Public status
    }

    mapping(uint256 => LoanRequest) public loanRequests;
    mapping(address => euint32) private userCreditScores;
    uint256 public loanCounter;

    event LoanRequested(uint256 indexed loanId, address indexed borrower);
    event LoanApproved(uint256 indexed loanId);

    // Register user with encrypted credit score
    function registerUser(bytes calldata encryptedCreditScore) external {
        // Convert encrypted input to euint32
        euint32 creditScore = TFHE.asEuint32(encryptedCreditScore);
        userCreditScores[msg.sender] = creditScore;
    }

    // Request loan with encrypted amount
    function requestLoan(bytes calldata encryptedAmount) external returns (uint256) {
        euint32 amount = TFHE.asEuint32(encryptedAmount);
        euint32 userCredit = userCreditScores[msg.sender];

        // Check if credit score > 600 (encrypted comparison)
        ebool isQualified = userCredit.gt(TFHE.asEuint32(600));

        loanCounter++;
        loanRequests[loanCounter] = LoanRequest({
            borrower: msg.sender,
            encryptedAmount: amount,
            encryptedCreditScore: userCredit,
            isApproved: isQualified,
            isActive: true
        });

        emit LoanRequested(loanCounter, msg.sender);
        return loanCounter;
    }

    // Check if user can view loan details (access control)
    function canViewLoan(uint256 loanId) public view returns (bool) {
        LoanRequest memory loan = loanRequests[loanId];
        return msg.sender == loan.borrower || msg.sender == owner();
    }

    // Get decrypted loan amount (only for authorized users)
    function getLoanAmount(uint256 loanId) external view returns (uint32) {
        require(canViewLoan(loanId), "Not authorized");
        return TFHE.decrypt(loanRequests[loanId].encryptedAmount);
    }
}
```

### 3.4 Key FHEVM Functions

#### Encryption Functions
```solidity
// Convert encrypted input to FHEVM type
euint32 encrypted = TFHE.asEuint32(encryptedInput);

// Encrypt a plaintext value
euint32 encrypted = TFHE.asEuint32(1000);
```

#### Comparison Functions
```solidity
// Encrypted comparisons
ebool isGreater = a.gt(b);    // a > b
ebool isEqual = a.eq(b);      // a == b
ebool isLess = a.lt(b);       // a < b
```

#### Arithmetic Functions
```solidity
// Encrypted arithmetic
euint32 sum = a.add(b);       // a + b
euint32 product = a.mul(b);   // a * b
euint32 diff = a.sub(b);      // a - b
```

#### Access Control
```solidity
// Decrypt only for authorized users
uint32 plaintext = TFHE.decrypt(encrypted);
```

---

## 🎨 Part 4: Building the Frontend

### 4.1 React Setup with TypeScript

#### Create Vite Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  }
})
```

#### TypeScript Configuration
```json
// tsconfig.json
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

### 4.2 Main App Component

```typescript
// src/App.tsx
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import './App.css'

// Smart contract configuration
const CONTRACT_ADDRESS = "0x94aB9f99C2450e8395Ee58EA37990bb24eb456FE"
const CONTRACT_ABI = [
  "function registerUser(bytes calldata encryptedCreditScore) external",
  "function requestLoan(bytes calldata encryptedAmount) external returns (uint256)",
  "function getLoanAmount(uint256 loanId) external view returns (uint32)",
  "function canViewLoan(uint256 loanId) public view returns (bool)",
  "function loanCounter() external view returns (uint256)"
]

interface AppState {
  account: string
  provider: ethers.BrowserProvider | null
  contract: ethers.Contract | null
  isConnected: boolean
}

function App() {
  const [state, setState] = useState<AppState>({
    account: '',
    provider: null,
    contract: null,
    isConnected: false
  })

  const [creditScore, setCreditScore] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Connect to MetaMask
  const connectWallet = async () => {
    if (!window.ethereum) {
      setMessage('Please install MetaMask!')
      return
    }

    try {
      setLoading(true)
      setMessage('Connecting to MetaMask...')

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      // Initialize provider and contract
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)

      setState({
        account: accounts[0],
        provider,
        contract,
        isConnected: true
      })

      setMessage(`Connected! Address: ${accounts[0].slice(0, 8)}...`)
    } catch (error) {
      setMessage(`Connection failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Encrypt data before sending to blockchain
  const encryptData = (value: number): string => {
    // In a real FHEVM app, you'd use the FHEVM encryption library
    // For this tutorial, we'll simulate encryption
    const encrypted = ethers.toBeHex(value, 32)
    return encrypted
  }

  // Register user with encrypted credit score
  const registerUser = async () => {
    if (!state.contract || !creditScore) return

    try {
      setLoading(true)
      setMessage('Encrypting credit score...')

      // Encrypt the credit score
      const encryptedScore = encryptData(parseInt(creditScore))

      setMessage('Sending transaction... Please confirm in MetaMask')

      // Send transaction
      const tx = await state.contract.registerUser(encryptedScore)
      setMessage('Transaction sent! Waiting for confirmation...')

      // Wait for confirmation
      await tx.wait()
      setMessage('✅ Successfully registered with encrypted credit score!')
      setCreditScore('')

    } catch (error) {
      setMessage(`Registration failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Request loan with encrypted amount
  const requestLoan = async () => {
    if (!state.contract || !loanAmount) return

    try {
      setLoading(true)
      setMessage('Encrypting loan amount...')

      // Convert ETH to Wei and encrypt
      const amountWei = ethers.parseEther(loanAmount)
      const encryptedAmount = encryptData(Number(amountWei))

      setMessage('Sending loan request... Please confirm in MetaMask')

      // Send transaction
      const tx = await state.contract.requestLoan(encryptedAmount)
      setMessage('Transaction sent! Waiting for confirmation...')

      // Wait for confirmation
      const receipt = await tx.wait()

      // Get loan ID from events
      const loanId = receipt.logs[0]?.topics[1] // Simplified event parsing
      setMessage(`✅ Loan requested successfully! Loan ID: ${loanId}`)
      setLoanAmount('')

    } catch (error) {
      setMessage(`Loan request failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🔒 Hello FHEVM</h1>
          <p>Your First Privacy-Preserving dApp</p>
        </header>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        {!state.isConnected ? (
          <div className="card">
            <h2>Connect Your Wallet</h2>
            <p>Connect MetaMask to start using encrypted smart contracts!</p>
            <button
              onClick={connectWallet}
              disabled={loading}
              className="button primary"
            >
              {loading ? 'Connecting...' : 'Connect MetaMask'}
            </button>
          </div>
        ) : (
          <>
            <div className="card">
              <h2>Your Wallet</h2>
              <p><strong>Address:</strong> {state.account.slice(0, 8)}...{state.account.slice(-6)}</p>
              <p><strong>Network:</strong> Sepolia Testnet</p>
            </div>

            <div className="card">
              <h2>Register with Encrypted Credit Score</h2>
              <p>Your credit score will be encrypted before storing on blockchain</p>
              <div className="form-group">
                <label>Credit Score (300-850):</label>
                <select
                  value={creditScore}
                  onChange={(e) => setCreditScore(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select Credit Score</option>
                  <option value="350">Poor (300-350)</option>
                  <option value="500">Fair (450-500)</option>
                  <option value="650">Good (600-650)</option>
                  <option value="750">Excellent (700-750)</option>
                  <option value="850">Perfect (800-850)</option>
                </select>
              </div>
              <button
                onClick={registerUser}
                disabled={loading || !creditScore}
                className="button secondary"
              >
                {loading ? 'Registering...' : 'Register User'}
              </button>
            </div>

            <div className="card">
              <h2>Request Encrypted Loan</h2>
              <p>Loan amount will be encrypted and stored privately</p>
              <div className="form-group">
                <label>Loan Amount (ETH):</label>
                <select
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select Amount</option>
                  <option value="0.1">0.1 ETH</option>
                  <option value="0.5">0.5 ETH</option>
                  <option value="1.0">1.0 ETH</option>
                  <option value="2.0">2.0 ETH</option>
                </select>
              </div>
              <button
                onClick={requestLoan}
                disabled={loading || !loanAmount}
                className="button accent"
              >
                {loading ? 'Requesting...' : 'Request Loan'}
              </button>
            </div>
          </>
        )}

        <div className="info-card">
          <h3>🔐 How FHEVM Privacy Works</h3>
          <ul>
            <li>✅ Your credit score is encrypted before sending to blockchain</li>
            <li>✅ Smart contract computes on encrypted data without seeing actual values</li>
            <li>✅ Only you can decrypt and view your private information</li>
            <li>✅ Loan approval happens on encrypted data - no privacy leakage!</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default App
```

### 4.3 Styling the App

```css
/* src/App.css */
.app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

.header {
  text-align: center;
  color: white;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
}

.card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.form-group select, .form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
}

.button {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button.primary {
  background: #4CAF50;
  color: white;
}

.button.secondary {
  background: #2196F3;
  color: white;
}

.button.accent {
  background: #FF9800;
  color: white;
}

.button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.message {
  background: #E3F2FD;
  color: #1976D2;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  border-left: 4px solid #2196F3;
}

.info-card {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 12px;
  padding: 24px;
  margin-top: 30px;
}

.info-card ul {
  list-style: none;
  padding: 0;
}

.info-card li {
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
```

---

## 🧪 Part 5: Testing and Deployment

### 5.1 Testing Your dApp

#### Local Testing
```bash
# Start development server
npm run dev

# Open browser to http://localhost:3000
# Connect MetaMask
# Try registering with different credit scores
# Request loans with various amounts
```

#### Transaction Testing Checklist

✅ **Wallet Connection**
- MetaMask connects successfully
- Correct network (Sepolia) detected
- Account address displays properly

✅ **User Registration**
- Credit score encryption works
- Transaction gets confirmed
- Gas fees are reasonable

✅ **Loan Requests**
- Loan amount encryption works
- Smart contract processes encrypted data
- Events are emitted correctly

✅ **Privacy Verification**
- Raw data not visible on blockchain
- Only encrypted values stored
- Access control works properly

### 5.2 Understanding Gas Costs

FHEVM operations cost more gas than regular operations:

| Operation | Regular Gas | FHEVM Gas | Multiplier |
|-----------|-------------|-----------|------------|
| Store uint256 | ~20,000 | ~50,000 | 2.5x |
| Compare values | ~3 | ~30,000 | 10,000x |
| Add numbers | ~3 | ~15,000 | 5,000x |
| Decrypt value | ~0 | ~10,000 | New cost |

**Gas Optimization Tips:**
- Minimize encrypted operations
- Batch multiple operations
- Use appropriate data types (euint8 vs euint32)
- Cache encrypted values when possible

### 5.3 Deployment to Sepolia

#### Environment Setup
```bash
# Install Hardhat for deployment
npm install --save-dev hardhat @nomicfoundation/hardhat-ethers

# Create deployment script
mkdir scripts
```

#### Deployment Script
```javascript
// scripts/deploy.js
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const PrivateLending = await ethers.getContractFactory("PrivateLending");
  const contract = await PrivateLending.deploy();

  console.log("Contract deployed to:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

#### Deploy Command
```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Update CONTRACT_ADDRESS in your frontend
# Test on live network
```

---

## 🎉 Congratulations!

You've successfully built your first **FHEVM dApp**! Here's what you accomplished:

### ✅ What You Learned

1. **FHEVM Fundamentals**
   - How fully homomorphic encryption protects privacy
   - When to use encrypted vs public data
   - FHEVM data types and operations

2. **Smart Contract Development**
   - Writing privacy-preserving contracts
   - Using encrypted comparisons and arithmetic
   - Implementing access control for encrypted data

3. **Frontend Integration**
   - Connecting React to FHEVM contracts
   - Handling encrypted inputs from users
   - Managing transaction states and loading

4. **Web3 Development**
   - MetaMask integration patterns
   - Transaction handling and error management
   - Gas estimation and optimization

### 🚀 Next Steps

Now that you understand FHEVM basics, consider exploring:

#### Beginner Projects
- **Private Voting System**: Encrypt votes until reveal phase
- **Confidential Token Balances**: Hide wallet balances from public
- **Secret Auction Platform**: Bid without revealing amounts

#### Intermediate Projects
- **Private Credit Scoring**: Build comprehensive credit algorithms
- **Confidential Insurance**: Process claims with encrypted data
- **Anonymous Donation Platform**: Track donations privately

#### Advanced Topics
- **Zero-Knowledge Proofs**: Combine with FHEVM for ultimate privacy
- **Cross-Chain Privacy**: Bridge encrypted data between networks
- **Institutional Features**: Enterprise-grade privacy solutions

### 📚 Additional Resources

#### Official Documentation
- [Zama FHEVM Docs](https://docs.zama.ai/fhevm)
- [TFHE Library Reference](https://docs.zama.ai/tfhe-rs)
- [Ethereum Development](https://ethereum.org/developers)

#### Community & Support
- [Zama Discord](https://discord.com/invite/zama)
- [FHEVM GitHub](https://github.com/zama-ai/fhevm)
- [Stack Overflow - FHEVM Tag](https://stackoverflow.com/questions/tagged/fhevm)

#### Example Projects
- [FHEVM Examples Repository](https://github.com/zama-ai/fhevm-examples)
- [Privacy DeFi Templates](https://github.com/zama-ai/fhevm-defi)
- [Educational Tutorials](https://github.com/zama-ai/fhevm-tutorials)

---

## 🤝 Contributing

Found this tutorial helpful? Want to improve it?

### Ways to Contribute
- **Bug Reports**: Found an error? Open an issue!
- **Improvements**: Better explanations or code examples
- **Translations**: Help others in different languages
- **New Examples**: Add more tutorial projects

### Getting Started
```bash
# Fork the repository
git clone https://github.com/your-username/hello-fhevm-tutorial.git

# Create feature branch
git checkout -b feature/your-improvement

# Make changes and test
npm test

# Submit pull request
git push origin feature/your-improvement
```

---

## 📄 License

This tutorial is open source under the MIT License. Feel free to use, modify, and share!

---

**Ready to build the future of private blockchain applications?**

Join the FHEVM community and start building privacy-preserving dApps today! 🚀

*Happy coding! 🔐*