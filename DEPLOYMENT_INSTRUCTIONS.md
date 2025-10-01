# 🚀 Deployment Instructions: Hello FHEVM dApp

This guide provides complete instructions for deploying your FHEVM dApp to production, including smart contract deployment, frontend hosting, and configuration management.

## 📋 Deployment Overview

### Components to Deploy
1. **Smart Contract** → Sepolia Testnet (Ethereum)
2. **Frontend Application** → Vercel/Netlify (Static hosting)
3. **Configuration** → Environment variables and contract addresses

### Prerequisites Checklist
- [ ] MetaMask wallet with Sepolia ETH
- [ ] Infura or Alchemy API key
- [ ] Git repository (GitHub recommended)
- [ ] Vercel or Netlify account

---

## 💻 Part 1: Smart Contract Deployment

### Step 1.1: Setup Environment Variables

Create `.env` file in project root:
```bash
# .env (DO NOT commit this file)
PRIVATE_KEY="your_metamask_private_key_here"
INFURA_API_KEY="your_infura_api_key_here"
ETHERSCAN_API_KEY="your_etherscan_api_key_here"
```

**⚠️ Security Warning**: Never commit private keys to version control!

Add `.env` to `.gitignore`:
```bash
# .gitignore
.env
node_modules/
dist/
.DS_Store
*.log
```

### Step 1.2: Configure Hardhat for Deployment

Update `hardhat.config.ts`:
```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

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
    // Local development network
    hardhat: {
      chainId: 31337
    },

    // Sepolia testnet
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 20000000000, // 20 gwei
      gas: 6000000
    },

    // Ethereum mainnet (for future use)
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 20000000000,
      gas: 6000000
    }
  },

  // Contract verification
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },

  // Path configuration
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

export default config;
```

### Step 1.3: Install Required Dependencies

```bash
# Install deployment dependencies
npm install --save-dev dotenv @nomicfoundation/hardhat-verify

# Install additional utilities
npm install --save-dev @nomicfoundation/hardhat-chai-matchers chai
```

### Step 1.4: Create Deployment Script

Create `scripts/deploy-production.ts`:
```typescript
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Starting deployment to Sepolia...\n");

  // Get deployment account
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await deployer.getBalance();

  console.log("📋 Deployment Details:");
  console.log("Account:", deployerAddress);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("");

  // Check minimum balance
  const minBalance = ethers.parseEther("0.01"); // 0.01 ETH minimum
  if (balance < minBalance) {
    throw new Error(
      `Insufficient balance. Need at least 0.01 ETH, have ${ethers.formatEther(balance)} ETH`
    );
  }

  // Deploy contract
  console.log("📦 Deploying PrivateLending contract...");
  const PrivateLending = await ethers.getContractFactory("PrivateLending");

  // Estimate deployment cost
  const deploymentData = PrivateLending.getDeployTransaction();
  const estimatedGas = await ethers.provider.estimateGas(deploymentData);
  const gasPrice = await ethers.provider.getFeeData();
  const estimatedCost = estimatedGas * (gasPrice.gasPrice || 0n);

  console.log("⛽ Gas Estimation:");
  console.log("Estimated Gas:", estimatedGas.toString());
  console.log("Gas Price:", ethers.formatUnits(gasPrice.gasPrice || 0n, 'gwei'), "gwei");
  console.log("Estimated Cost:", ethers.formatEther(estimatedCost), "ETH");
  console.log("");

  // Deploy with retry logic
  let contract;
  let deploymentAttempts = 0;
  const maxAttempts = 3;

  while (deploymentAttempts < maxAttempts) {
    try {
      deploymentAttempts++;
      console.log(`Deployment attempt ${deploymentAttempts}/${maxAttempts}...`);

      contract = await PrivateLending.deploy({
        gasLimit: estimatedGas + 100000n, // Add buffer
        gasPrice: gasPrice.gasPrice
      });

      console.log("⏳ Waiting for deployment...");
      await contract.waitForDeployment();
      break;

    } catch (error: any) {
      console.error(`Deployment attempt ${deploymentAttempts} failed:`, error.message);

      if (deploymentAttempts === maxAttempts) {
        throw new Error(`Deployment failed after ${maxAttempts} attempts`);
      }

      console.log("Retrying in 10 seconds...");
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  const contractAddress = await contract!.getAddress();
  console.log("✅ Contract deployed successfully!");
  console.log("Contract Address:", contractAddress);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const owner = await contract!.owner();
  const loanCounter = await contract!.loanCounter();

  console.log("Contract Owner:", owner);
  console.log("Initial Loan Counter:", loanCounter.toString());
  console.log("Deployer matches owner:", owner === deployerAddress);

  // Get deployment transaction details
  const deploymentTx = contract!.deploymentTransaction();
  if (deploymentTx) {
    console.log("\n📄 Transaction Details:");
    console.log("Transaction Hash:", deploymentTx.hash);
    console.log("Block Number:", deploymentTx.blockNumber);
    console.log("Gas Used:", deploymentTx.gasLimit?.toString());

    // Wait for a few confirmations
    console.log("\n⏳ Waiting for confirmations...");
    const receipt = await deploymentTx.wait(3); // Wait for 3 confirmations
    console.log("✅ Deployment confirmed with", receipt?.confirmations, "confirmations");
  }

  // Save deployment info
  const deploymentInfo = {
    network: "sepolia",
    contractAddress: contractAddress,
    deployerAddress: deployerAddress,
    deploymentHash: deploymentTx?.hash,
    blockNumber: deploymentTx?.blockNumber,
    timestamp: new Date().toISOString(),
    gasUsed: deploymentTx?.gasLimit?.toString(),
    contractABI: PrivateLending.interface.formatJson()
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment information
  const deploymentPath = path.join(deploymentsDir, 'sepolia.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to:", deploymentPath);

  // Generate frontend config
  const frontendConfig = {
    CONTRACT_ADDRESS: contractAddress,
    NETWORK_NAME: "sepolia",
    CHAIN_ID: "0xaa36a7",
    EXPLORER_URL: `https://sepolia.etherscan.io/address/${contractAddress}`
  };

  const configPath = path.join(__dirname, '..', 'src', 'config.ts');
  const configContent = `// Auto-generated deployment configuration
// Generated on: ${new Date().toISOString()}

export const CONTRACT_CONFIG = {
  ADDRESS: "${contractAddress}",
  NETWORK: "sepolia",
  CHAIN_ID: "0xaa36a7",
  EXPLORER_URL: "https://sepolia.etherscan.io/address/${contractAddress}"
};

export const CONTRACT_ABI = ${PrivateLending.interface.formatJson()};
`;

  fs.writeFileSync(configPath, configContent);
  console.log("📝 Frontend config generated:", configPath);

  // Display next steps
  console.log("\n🎉 Deployment Complete!");
  console.log("\n📋 Next Steps:");
  console.log("1. Update CONTRACT_ADDRESS in your frontend code");
  console.log("2. Verify the contract on Etherscan (optional)");
  console.log("3. Deploy frontend to Vercel/Netlify");
  console.log("4. Test the live application");

  console.log("\n🔗 Useful Links:");
  console.log("Contract on Etherscan:", `https://sepolia.etherscan.io/address/${contractAddress}`);
  console.log("Transaction:", `https://sepolia.etherscan.io/tx/${deploymentTx?.hash}`);

  console.log("\n⚡ Contract Verification Command:");
  console.log(`npx hardhat verify --network sepolia ${contractAddress}`);
}

// Handle errors gracefully
main()
  .then(() => {
    console.log("\n✅ Deployment script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
```

### Step 1.5: Deploy to Sepolia

```bash
# Compile contracts
npm run compile

# Run tests
npm test

# Deploy to Sepolia
npx hardhat run scripts/deploy-production.ts --network sepolia
```

**Expected Output:**
```
🚀 Starting deployment to Sepolia...

📋 Deployment Details:
Account: 0x742d35Cc6631C0532925a3b8D4C1C4f25bDf0eB5
Balance: 0.5 ETH
Network: sepolia
Chain ID: 11155111

📦 Deploying PrivateLending contract...
⛽ Gas Estimation:
Estimated Gas: 2,234,567
Gas Price: 20.0 gwei
Estimated Cost: 0.044691 ETH

Deployment attempt 1/3...
⏳ Waiting for deployment...
✅ Contract deployed successfully!
Contract Address: 0x94aB9f99C2450e8395Ee58EA37990bb24eb456FE

🔍 Verifying deployment...
Contract Owner: 0x742d35Cc6631C0532925a3b8D4C1C4f25bDf0eB5
Initial Loan Counter: 0
Deployer matches owner: true

📄 Transaction Details:
Transaction Hash: 0x123abc...
Block Number: 4567890
⏳ Waiting for confirmations...
✅ Deployment confirmed with 3 confirmations

💾 Deployment info saved to: ./deployments/sepolia.json
📝 Frontend config generated: ./src/config.ts

🎉 Deployment Complete!
```

### Step 1.6: Verify Contract on Etherscan (Optional)

```bash
# Verify contract source code
npx hardhat verify --network sepolia 0x94aB9f99C2450e8395Ee58EA37990bb24eb456FE

# If verification fails, try with constructor arguments
npx hardhat verify --network sepolia 0x94aB9f99C2450e8395Ee58EA37990bb24eb456FE
```

---

## 🌐 Part 2: Frontend Deployment

### Step 2.1: Update Frontend Configuration

Update `src/App.tsx` with deployed contract address:
```typescript
// Replace with your deployed contract address
const CONTRACT_ADDRESS = "0x94aB9f99C2450e8395Ee58EA37990bb24eb456FE"
```

Or use the auto-generated config:
```typescript
// Import auto-generated config
import { CONTRACT_CONFIG, CONTRACT_ABI } from './config'

const CONTRACT_ADDRESS = CONTRACT_CONFIG.ADDRESS
const CONTRACT_ABI = CONTRACT_ABI
```

### Step 2.2: Build and Test Locally

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Test production build locally
npm run preview

# Test in browser at http://localhost:4173
```

### Step 2.3: Deploy to Vercel

#### Option A: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Follow prompts:
# - Link to existing project? N
# - Project name: hello-fhevm-tutorial
# - Deploy settings: accept defaults
```

#### Option B: Deploy via Git Integration

1. **Push to GitHub:**
```bash
git add .
git commit -m "feat: add FHEVM tutorial dApp"
git push origin main
```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure build settings:
     - Framework: Vite
     - Build Command: `npm run build`
     - Output Directory: `dist`
   - Click "Deploy"

### Step 2.4: Configure Custom Domain (Optional)

```bash
# Add custom domain via CLI
vercel domains add your-domain.com

# Or configure in Vercel dashboard
# Settings → Domains → Add Domain
```

### Step 2.5: Environment Variables for Production

In Vercel dashboard, add environment variables:
- `VITE_CONTRACT_ADDRESS`: Your deployed contract address
- `VITE_NETWORK_NAME`: sepolia
- `VITE_CHAIN_ID`: 11155111

Update your code to use these:
```typescript
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "fallback_address"
const NETWORK_NAME = import.meta.env.VITE_NETWORK_NAME || "sepolia"
```

---

## 🔧 Part 3: Configuration Management

### Step 3.1: Environment-Specific Configuration

Create `src/config/index.ts`:
```typescript
export interface NetworkConfig {
  name: string
  chainId: string
  chainIdDecimal: number
  rpcUrl: string
  explorerUrl: string
  contractAddress: string
}

export const NETWORKS: Record<string, NetworkConfig> = {
  sepolia: {
    name: "Sepolia Test Network",
    chainId: "0xaa36a7",
    chainIdDecimal: 11155111,
    rpcUrl: "https://sepolia.infura.io/v3/",
    explorerUrl: "https://sepolia.etherscan.io",
    contractAddress: "0x94aB9f99C2450e8395Ee58EA37990bb24eb456FE"
  },
  mainnet: {
    name: "Ethereum Mainnet",
    chainId: "0x1",
    chainIdDecimal: 1,
    rpcUrl: "https://mainnet.infura.io/v3/",
    explorerUrl: "https://etherscan.io",
    contractAddress: "" // Deploy to mainnet later
  }
}

export const DEFAULT_NETWORK = "sepolia"
export const CURRENT_NETWORK = NETWORKS[DEFAULT_NETWORK]
```

### Step 3.2: Update Package.json Scripts

Add deployment scripts to `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "deploy:contract:sepolia": "npx hardhat run scripts/deploy-production.ts --network sepolia",
    "deploy:frontend": "vercel --prod",
    "deploy:all": "npm run deploy:contract:sepolia && npm run build && npm run deploy:frontend",
    "verify:contract": "npx hardhat verify --network sepolia",
    "test:contract": "npx hardhat test",
    "test:frontend": "npm run build && npm run preview"
  }
}
```

---

## 📊 Part 4: Deployment Monitoring

### Step 4.1: Verify Deployment

#### Smart Contract Verification
```bash
# Check contract on Etherscan
curl "https://api-sepolia.etherscan.io/api?module=contract&action=getabi&address=0x94aB9f99C2450e8395Ee58EA37990bb24eb456FE&apikey=YourApiKey"

# Test contract interaction
npx hardhat console --network sepolia
```

#### Frontend Verification
```bash
# Check production build
curl -I https://your-app.vercel.app

# Test MetaMask connection
# Test transaction flow
# Verify responsive design
```

### Step 4.2: Performance Monitoring

Add analytics to `src/App.tsx`:
```typescript
// Simple error tracking
const trackError = (error: Error, context: string) => {
  console.error(`Error in ${context}:`, error)
  // Send to analytics service
}

// Performance monitoring
const trackTransaction = (txHash: string, type: string) => {
  console.log(`Transaction ${type}: ${txHash}`)
  // Send to analytics
}
```

### Step 4.3: Health Checks

Create monitoring endpoints:
```typescript
// src/utils/health.ts
export const checkContractHealth = async (contract: Contract) => {
  try {
    const owner = await contract.owner()
    const counter = await contract.loanCounter()
    return { status: 'healthy', owner, counter }
  } catch (error) {
    return { status: 'unhealthy', error: error.message }
  }
}

export const checkNetworkHealth = async (provider: Provider) => {
  try {
    const blockNumber = await provider.getBlockNumber()
    const network = await provider.getNetwork()
    return { status: 'healthy', blockNumber, chainId: network.chainId }
  } catch (error) {
    return { status: 'unhealthy', error: error.message }
  }
}
```

---

## 🛡️ Part 5: Security & Best Practices

### Step 5.1: Security Checklist

#### Smart Contract Security
- [ ] Private keys never committed to git
- [ ] Contract verified on Etherscan
- [ ] Owner functions properly protected
- [ ] Gas limits configured appropriately
- [ ] Reentrancy protection in place

#### Frontend Security
- [ ] No sensitive data in client code
- [ ] HTTPS enforced
- [ ] Input validation on all forms
- [ ] Error messages don't leak sensitive info
- [ ] Content Security Policy configured

#### Deployment Security
- [ ] Environment variables properly set
- [ ] API keys secured
- [ ] Access controls in place
- [ ] Backup private keys safely stored

### Step 5.2: Production Checklist

#### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed and audited
- [ ] Gas costs optimized
- [ ] Error handling comprehensive
- [ ] Documentation complete

#### Post-Deployment
- [ ] Contract verified on Etherscan
- [ ] Frontend loads correctly
- [ ] MetaMask integration works
- [ ] Transactions confirm properly
- [ ] Mobile responsiveness tested

#### Monitoring
- [ ] Error tracking configured
- [ ] Performance monitoring active
- [ ] Health checks implemented
- [ ] Alerting system configured
- [ ] Backup plans documented

---

## 🚨 Troubleshooting

### Common Deployment Issues

#### Smart Contract Deployment Fails
```bash
# Check account balance
npx hardhat run scripts/check-balance.ts --network sepolia

# Verify network configuration
npx hardhat console --network sepolia

# Test with lower gas price
# Update hardhat.config.ts with lower gasPrice
```

#### Frontend Build Fails
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run build 2>&1 | grep error

# Test locally first
npm run dev
```

#### MetaMask Connection Issues
```javascript
// Debug MetaMask connection
if (typeof window.ethereum === 'undefined') {
  console.error('MetaMask not installed')
}

// Check network
const chainId = await window.ethereum.request({ method: 'eth_chainId' })
console.log('Current chain ID:', chainId)
```

### Error Resolution

#### "Insufficient funds for gas"
```bash
# Get more Sepolia ETH from faucet
# Check gas price settings
# Reduce gas limit if possible
```

#### "Transaction failed"
```bash
# Check contract exists at address
# Verify ABI matches deployed contract
# Check function parameters
# Increase gas limit
```

#### "Network mismatch"
```bash
# Switch MetaMask to Sepolia
# Verify chain ID in code
# Check RPC URL configuration
```

---

## 🎉 Deployment Complete!

### Final Verification Steps

1. **Contract Verification**
   - [ ] Visit Etherscan and verify contract is deployed
   - [ ] Check contract is verified (green checkmark)
   - [ ] Test contract functions on Etherscan

2. **Frontend Verification**
   - [ ] Visit deployed URL
   - [ ] Connect MetaMask successfully
   - [ ] Register as borrower
   - [ ] Request a loan
   - [ ] Verify transaction on Etherscan

3. **End-to-End Testing**
   - [ ] Complete user journey works
   - [ ] Error handling works properly
   - [ ] Mobile experience is good
   - [ ] Performance is acceptable

### Share Your Success! 🚀

Your FHEVM dApp is now live! Share it with the community:

- **Live Demo**: `https://your-app.vercel.app`
- **Contract**: `https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS`
- **GitHub**: `https://github.com/your-username/hello-fhevm-tutorial`

### Next Steps

1. **Join the Community**
   - [Zama Discord](https://discord.com/invite/zama)
   - [FHEVM GitHub](https://github.com/zama-ai/fhevm)
   - Share your tutorial experience

2. **Build More dApps**
   - Private voting systems
   - Confidential auctions
   - Anonymous donations

3. **Contribute Back**
   - Improve this tutorial
   - Create new examples
   - Help other developers

**Congratulations on deploying your first FHEVM dApp! 🎊**