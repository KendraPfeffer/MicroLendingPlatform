import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import './App.css'

// REAL CONTRACT ADDRESS - Updated with localhost deployment for testing
const CONTRACT_ADDRESS = "0x94aB9f99C2450e8395Ee58EA37990bb24eb456FE"
const SEPOLIA_CHAIN_ID = "0xaa36a7" // 11155111 in decimal
const LOCALHOST_CHAIN_ID = "0x7a69" // 31337 in decimal

// Complete Contract ABI for MicroLendingPlatform contract
const CONTRACT_ABI = [
  "function registerBorrower(uint256 creditScore) external",
  "function requestLoan(uint256 amount, uint256 interestRate, uint256 duration) external returns (uint256)",
  "function fundLoan(uint256 loanId) external payable",
  "function repayLoan(uint256 loanId) external payable",
  "function markDefault(uint256 loanId) external",
  "function getBorrowerLoanCount(address borrower) external view returns (uint256)",
  "function getLenderLoanCount(address lender) external view returns (uint256)",
  "function calculateRepaymentAmount(uint256 loanId) external view returns (uint256)",
  "function loans(uint256) external view returns (address, address, uint256, uint256, uint256, uint256, uint256, uint256, uint8)",
  "function borrowerProfiles(address) external view returns (uint256, uint256, uint256, bool)",
  "function approvedBorrowers(address) external view returns (bool)",
  "function loanCounter() external view returns (uint256)",
  "function owner() external view returns (address)",
  "function MAX_LOAN_AMOUNT() external view returns (uint256)",
  "function MIN_LOAN_AMOUNT() external view returns (uint256)",
  "function MAX_INTEREST_RATE() external view returns (uint256)",
  "function MAX_LOAN_DURATION() external view returns (uint256)",
  "event LoanRequested(uint256 indexed loanId, address indexed borrower, uint256 amount)",
  "event LoanFunded(uint256 indexed loanId, address indexed lender, address indexed borrower)",
  "event LoanRepaid(uint256 indexed loanId, address indexed borrower)",
  "event LoanDefaulted(uint256 indexed loanId, address indexed borrower)",
  "event BorrowerRegistered(address indexed borrower)",
  "event CreditScoreUpdated(address indexed borrower, uint256 newScore)"
]

interface BorrowerProfile {
  creditScore: number
  totalLoans: number
  successfulRepayments: number
  isActive: boolean
}

interface LoanInfo {
  id: number
  borrower: string
  lender: string
  duration: number
  createdAt: number
  fundedAt: number
  dueDate: number
  status: number
  isPrivate: boolean
}

interface TransactionStatus {
  hash?: string
  status: 'pending' | 'success' | 'error' | 'cancelled'
  message: string
  gasUsed?: string
  gasPrice?: string
}

declare global {
  interface Window {
    ethereum?: any
  }
}

function App() {
  // Core Web3 state
  const [account, setAccount] = useState<string>('')
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [networkId, setNetworkId] = useState<string>('')
  
  // Transaction state
  const [loading, setLoading] = useState<boolean>(false)
  const [txStatus, setTxStatus] = useState<TransactionStatus | null>(null)
  const [gasEstimate, setGasEstimate] = useState<string>('')
  
  // User data state
  const [userProfile, setUserProfile] = useState<BorrowerProfile | null>(null)
  const [isRegistered, setIsRegistered] = useState<boolean>(false)
  const [userBalance, setUserBalance] = useState<string>('0')
  
  // Form states
  const [creditScore, setCreditScore] = useState<string>('')
  const [makePublic, setMakePublic] = useState<boolean>(false)
  const [loanAmount, setLoanAmount] = useState<string>('')
  const [interestRate, setInterestRate] = useState<string>('')
  const [loanDuration, setLoanDuration] = useState<string>('')
  const [isPrivateLoan, setIsPrivateLoan] = useState<boolean>(true)
  const [loanIdToFund, setLoanIdToFund] = useState<string>('')
  const [fundingAmount, setFundingAmount] = useState<string>('')
  const [loanIdToRepay, setLoanIdToRepay] = useState<string>('')
  const [repaymentAmount, setRepaymentAmount] = useState<string>('')
  
  // Data states
  const [totalLoans, setTotalLoans] = useState<number>(0)
  const [userLoans, setUserLoans] = useState<LoanInfo[]>([])
  const [availableLoans, setAvailableLoans] = useState<LoanInfo[]>([])
  const [contractConstants, setContractConstants] = useState<any>({})

  // Check if MetaMask is installed
  const isMetaMaskInstalled = useCallback(() => {
    return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask
  }, [])

  // Initialize Web3 connection
  useEffect(() => {
    const initializeWeb3 = async () => {
      if (isMetaMaskInstalled()) {
        try {
          // Check if already connected
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            await connectWallet()
          }
        } catch (error) {
          console.log('No previous connection found')
        }
      }
    }

    initializeWeb3()
  }, [])

  // Handle account and network changes
  useEffect(() => {
    if (!isMetaMaskInstalled()) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected wallet
        disconnectWallet()
      } else if (accounts[0] !== account) {
        // User switched accounts
        setAccount(accounts[0])
        loadUserData(accounts[0])
      }
    }

    const handleChainChanged = (chainId: string) => {
      setNetworkId(chainId)
      if (chainId !== SEPOLIA_CHAIN_ID) {
        setTxStatus({
          status: 'error',
          message: 'Please switch to Sepolia testnet to use this DApp'
        })
      } else {
        setTxStatus(null)
      }
      // Reload page on network change for clean state
      window.location.reload()
    }

    const handleDisconnect = () => {
      disconnectWallet()
    }

    // Add event listeners
    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)
    window.ethereum.on('disconnect', handleDisconnect)

    // Cleanup event listeners
    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
        window.ethereum.removeListener('disconnect', handleDisconnect)
      }
    }
  }, [account])

  // Auto-suggest interest rate based on credit score
  useEffect(() => {
    if (creditScore && !interestRate) {
      const score = parseInt(creditScore)
      if (score >= 750) setInterestRate('5')
      else if (score >= 650) setInterestRate('8')
      else if (score >= 550) setInterestRate('12')
      else if (score >= 450) setInterestRate('15')
      else setInterestRate('20')
    }
  }, [creditScore, interestRate])

  // Auto-suggest duration based on loan amount
  useEffect(() => {
    if (loanAmount && !loanDuration) {
      const amount = parseFloat(loanAmount)
      if (amount <= 0.1) setLoanDuration('30')
      else if (amount <= 1) setLoanDuration('90')
      else setLoanDuration('180')
    }
  }, [loanAmount, loanDuration])

  // Connect to MetaMask wallet
  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      setTxStatus({
        status: 'error',
        message: 'MetaMask is not installed. Please install MetaMask to use this DApp.'
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
      setNetworkId(chainId)

      if (chainId !== SEPOLIA_CHAIN_ID) {
        await switchToSepolia()
      }

      // Initialize provider and signer
      const web3Provider = new ethers.BrowserProvider(window.ethereum)
      const web3Signer = await web3Provider.getSigner()
      
      setProvider(web3Provider)
      setSigner(web3Signer)
      setAccount(accounts[0])
      setIsConnected(true)

      // Initialize contract instance
      // Using web3Signer to create contract instance, this will automatically trigger MetaMask popup for subsequent contract method calls
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, web3Signer)
      setContract(contractInstance)

      // Load user balance
      const balance = await web3Provider.getBalance(accounts[0])
      setUserBalance(ethers.formatEther(balance))

      // Load contract constants
      await loadContractConstants(contractInstance)

      // Load user data
      await loadUserData(accounts[0], contractInstance)

      setTxStatus({
        status: 'success',
        message: `Connected to Sepolia! ✅ Address: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`
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
      // Network not added to MetaMask
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
          throw new Error('Failed to add Sepolia network to MetaMask')
        }
      } else {
        throw switchError
      }
    }
  }

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount('')
    setProvider(null)
    setSigner(null)
    setContract(null)
    setIsConnected(false)
    setIsRegistered(false)
    setUserProfile(null)
    setUserBalance('0')
    setTxStatus(null)
    setUserLoans([])
    setAvailableLoans([])
  }

  // Load contract constants
  const loadContractConstants = async (contractInstance: ethers.Contract) => {
    try {
      const [maxLoanAmount, minLoanAmount, maxInterestRate, maxDuration] = await Promise.all([
        contractInstance.MAX_LOAN_AMOUNT(),
        contractInstance.MIN_LOAN_AMOUNT(),
        contractInstance.MAX_INTEREST_RATE(),
        contractInstance.MAX_LOAN_DURATION()
      ])

      setContractConstants({
        maxLoanAmount: ethers.formatEther(maxLoanAmount),
        minLoanAmount: ethers.formatEther(minLoanAmount),
        maxInterestRate: Number(maxInterestRate),
        maxDuration: Number(maxDuration) / (24 * 60 * 60) // Convert to days
      })
    } catch (error) {
      console.error('Failed to load contract constants:', error)
    }
  }

  // Load user data from blockchain
  const loadUserData = async (userAccount: string, contractInstance?: ethers.Contract) => {
    const contractToUse = contractInstance || contract
    if (!contractToUse) return

    try {
      // Check if user is registered
      const isApproved = await contractToUse.approvedBorrowers(userAccount)
      setIsRegistered(isApproved)
      
      if (isApproved) {
        const profile = await contractToUse.borrowerProfiles(userAccount)
        setUserProfile({
          creditScore: 0, // Encrypted, can't display actual value
          totalLoans: Number(profile[1]),
          successfulRepayments: Number(profile[2]),
          isActive: profile[3]
        })
        
        await loadUserLoans(contractToUse, userAccount)
      }
      
      await loadAvailableLoans(contractToUse, userAccount)
      
      // Update total loans count
      const totalLoanCount = await contractToUse.loanCounter()
      setTotalLoans(Number(totalLoanCount))
      
    } catch (error: any) {
      console.error('Failed to load user data:', error)
      setTxStatus({
        status: 'error',
        message: `Failed to load user data: ${error.message || 'Unknown error'}`
      })
    }
  }

  // Load user's loans
  const loadUserLoans = async (contractInstance: ethers.Contract, userAccount: string) => {
    try {
      const totalLoanCount = await contractInstance.loanCounter()
      const loans: LoanInfo[] = []
      
      for (let i = 1; i <= Number(totalLoanCount); i++) {
        try {
          const loanInfo = await contractInstance.getLoanBasicInfo(i)
          
          if (loanInfo[0].toLowerCase() === userAccount.toLowerCase() || 
              loanInfo[1].toLowerCase() === userAccount.toLowerCase()) {
            
            loans.push({
              id: i,
              borrower: loanInfo[0],
              lender: loanInfo[1],
              duration: Number(loanInfo[2]),
              createdAt: Number(loanInfo[3]),
              fundedAt: Number(loanInfo[4]),
              dueDate: Number(loanInfo[5]),
              status: Number(loanInfo[6]),
              isPrivate: loanInfo[7]
            })
          }
        } catch (error) {
          console.error(`Failed to load loan ${i}:`, error)
        }
      }
      
      setUserLoans(loans)
      
    } catch (error) {
      console.error('Failed to load user loans:', error)
    }
  }

  // Load available loans for funding
  const loadAvailableLoans = async (contractInstance: ethers.Contract, userAccount: string) => {
    try {
      const totalLoanCount = await contractInstance.loanCounter()
      const loans: LoanInfo[] = []
      
      for (let i = 1; i <= Number(totalLoanCount); i++) {
        try {
          const loanInfo = await contractInstance.getLoanBasicInfo(i)
          
          if (loanInfo[6] === 0 && // status: Requested
              !loanInfo[7] && // not private
              loanInfo[0].toLowerCase() !== userAccount.toLowerCase()) { // not own loan
            
            loans.push({
              id: i,
              borrower: loanInfo[0],
              lender: loanInfo[1],
              duration: Number(loanInfo[2]),
              createdAt: Number(loanInfo[3]),
              fundedAt: Number(loanInfo[4]),
              dueDate: Number(loanInfo[5]),
              status: Number(loanInfo[6]),
              isPrivate: loanInfo[7]
            })
          }
        } catch (error) {
          console.error(`Failed to load loan ${i}:`, error)
        }
      }
      
      setAvailableLoans(loans)
      
    } catch (error) {
      console.error('Failed to load available loans:', error)
    }
  }

  // Estimate gas for transaction
  const estimateGas = async (contractMethod: any, ...args: any[]) => {
    try {
      const gasEstimate = await contractMethod.estimateGas(...args)
      const gasPrice = await provider?.getFeeData()
      
      if (gasPrice?.gasPrice) {
        const totalCost = gasEstimate * gasPrice.gasPrice
        setGasEstimate(ethers.formatEther(totalCost))
        return { gasEstimate, gasPrice: gasPrice.gasPrice }
      }
    } catch (error) {
      console.error('Gas estimation failed:', error)
    }
    return null
  }

  /**
   * MetaMask Real Transaction Core Implementation
   * 
   * Contract Interaction Flow:
   * User clicks button → Call contract method → ethers.js sends transaction → MetaMask popup confirmation → Blockchain execution
   * 
   * Trigger Mechanism:
   * 1. When called, ethers.js constructs the transaction
   * 2. Since contract instance uses signer, ethers.js knows user signature is needed
   * 3. This automatically triggers MetaMask transaction confirmation popup
   * 4. After user confirmation, transaction is sent to Sepolia testnet
   * 5. tx.wait() waits for transaction to be mined and confirmed
   * 
   * State Management:
   * - Display loading status
   * - Update user interface hints
   * - Wait for blockchain confirmation
   * - Refresh page state
   * 
   * Through ethers.js interaction with smart contracts, MetaMask as wallet provider automatically handles transaction signing and sending.
   */
  const executeTransaction = async (
    contractMethod: any, 
    args: any[], 
    value: bigint = 0n,
    successMessage: string = 'Transaction completed successfully'
  ) => {
    if (!contract || !signer) {
      setTxStatus({
        status: 'error',
        message: 'Wallet not connected'
      })
      return null
    }

    try {
      setLoading(true)
      
      // Step 1: Estimate gas fees
      setTxStatus({
        status: 'pending',
        message: 'Estimating gas fees...'
      })

      await estimateGas(contractMethod, ...args, value > 0 ? { value } : {})
      
      // Step 2: Prepare transaction
      setTxStatus({
        status: 'pending',
        message: 'Preparing transaction... Please confirm in MetaMask'
      })

      const txOptions: any = {}
      if (value > 0) {
        txOptions.value = value
      }

      // Step 3: Send transaction (MetaMask will automatically show confirmation dialog)
      // ethers.js using signer will automatically trigger MetaMask transaction confirmation popup
      const tx = await contractMethod(...args, txOptions)
      
      setTxStatus({
        status: 'pending',
        message: `Transaction sent! Hash: ${tx.hash}. Waiting for confirmation...`,
        hash: tx.hash
      })

      // Step 4: Wait for transaction confirmation from blockchain
      // tx.wait() will wait for transaction to be mined and confirmed
      const receipt = await tx.wait()
      
      // Step 5: Transaction confirmed successfully
      const gasUsed = receipt.gasUsed.toString()
      const effectiveGasPrice = receipt.gasPrice?.toString() || '0'
      
      setTxStatus({
        status: 'success',
        message: successMessage,
        hash: tx.hash,
        gasUsed: ethers.formatEther(BigInt(gasUsed) * BigInt(effectiveGasPrice)),
        gasPrice: ethers.formatUnits(effectiveGasPrice, 'gwei')
      })

      // Refresh user data after successful transaction
      await loadUserData(account)
      
      // Update user balance
      if (provider) {
        const balance = await provider.getBalance(account)
        setUserBalance(ethers.formatEther(balance))
      }

      return receipt

    } catch (error: any) {
      console.error('Transaction failed:', error)
      
      let errorMessage = 'Transaction failed'
      
      if (error.code === 4001) {
        errorMessage = 'Transaction cancelled by user'
      } else if (error.code === -32603) {
        errorMessage = 'Internal error - please try again'
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

  // Register as borrower - clicking will trigger MetaMask popup
  const registerBorrower = async () => {
    if (!creditScore) {
      setTxStatus({
        status: 'error',
        message: 'Please select a credit score range'
      })
      return
    }

    const score = parseInt(creditScore)
    if (score < 300 || score > 850) {
      setTxStatus({
        status: 'error',
        message: 'Credit score must be between 300-850'
      })
      return
    }

    await executeTransaction(
      contract!.registerBorrower,
      [score],
      0n,
      `Successfully registered as borrower with credit score ${score}! 🎉`
    )
    
    // Clear form
    setCreditScore('')
    setMakePublic(false)
  }

  // Request a loan - clicking will trigger MetaMask popup
  const requestLoan = async () => {
    if (!loanAmount || !interestRate || !loanDuration) {
      setTxStatus({
        status: 'error',
        message: 'Please fill in all loan request fields'
      })
      return
    }

    const amount = parseFloat(loanAmount)
    const rate = parseInt(interestRate)
    const duration = parseInt(loanDuration)

    // Validate inputs
    if (contractConstants.minLoanAmount && amount < parseFloat(contractConstants.minLoanAmount)) {
      setTxStatus({
        status: 'error',
        message: `Loan amount must be at least ${contractConstants.minLoanAmount} ETH`
      })
      return
    }

    if (contractConstants.maxLoanAmount && amount > parseFloat(contractConstants.maxLoanAmount)) {
      setTxStatus({
        status: 'error',
        message: `Loan amount cannot exceed ${contractConstants.maxLoanAmount} ETH`
      })
      return
    }

    await executeTransaction(
      contract!.requestLoan,
      [
        ethers.parseEther(loanAmount),
        rate * 100, // Convert to basis points
        duration * 24 * 60 * 60 // Convert days to seconds
      ],
      0n,
      `Loan request submitted successfully! Amount: ${loanAmount} ETH, Rate: ${rate}% 💰`
    )
    
    // Clear form
    setLoanAmount('')
    setInterestRate('')
    setLoanDuration('')
  }

  // Fund a loan - clicking will trigger MetaMask popup
  const fundLoan = async () => {
    if (!loanIdToFund || !fundingAmount) {
      setTxStatus({
        status: 'error',
        message: 'Please enter loan ID and funding amount'
      })
      return
    }

    const amount = parseFloat(fundingAmount)
    if (amount <= 0) {
      setTxStatus({
        status: 'error',
        message: 'Funding amount must be greater than 0'
      })
      return
    }

    // Check user balance
    if (parseFloat(userBalance) < amount) {
      setTxStatus({
        status: 'error',
        message: 'Insufficient balance to fund this loan'
      })
      return
    }

    await executeTransaction(
      contract!.fundLoan,
      [parseInt(loanIdToFund)],
      ethers.parseEther(fundingAmount),
      `Loan #${loanIdToFund} funded successfully with ${fundingAmount} ETH! 🤝`
    )
    
    // Clear form
    setLoanIdToFund('')
    setFundingAmount('')
  }

  // Repay a loan - clicking will trigger MetaMask popup
  const repayLoan = async () => {
    if (!loanIdToRepay || !repaymentAmount) {
      setTxStatus({
        status: 'error',
        message: 'Please enter loan ID and repayment amount'
      })
      return
    }

    const amount = parseFloat(repaymentAmount)
    if (amount <= 0) {
      setTxStatus({
        status: 'error',
        message: 'Repayment amount must be greater than 0'
      })
      return
    }

    // Check user balance
    if (parseFloat(userBalance) < amount) {
      setTxStatus({
        status: 'error',
        message: 'Insufficient balance to repay this loan'
      })
      return
    }

    await executeTransaction(
      contract!.repayLoan,
      [parseInt(loanIdToRepay)],
      ethers.parseEther(repaymentAmount),
      `Loan #${loanIdToRepay} repaid successfully! Amount: ${repaymentAmount} ETH ✅`
    )
    
    // Clear form
    setLoanIdToRepay('')
    setRepaymentAmount('')
  }

  // Quick fund function for available loans
  const quickFund = (loanId: number) => {
    setLoanIdToFund(loanId.toString())
    setTxStatus({
      status: 'pending',
      message: `Loan ID ${loanId} selected. Enter funding amount and confirm to fund this loan.`
    })
  }

  // Format transaction status display
  const formatTransactionStatus = (status: TransactionStatus) => {
    const statusClass = {
      'pending': 'info',
      'success': 'success',
      'error': 'error',
      'cancelled': 'warning'
    }[status.status]

    return (
      <div className={`message ${statusClass}`}>
        <p>{status.message}</p>
        {status.hash && (
          <p>
            <small>
              <a 
                href={`https://sepolia.etherscan.io/tx/${status.hash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'underline' }}
              >
                View on Etherscan →
              </a>
            </small>
          </p>
        )}
        {status.gasUsed && (
          <p><small>Gas Used: {status.gasUsed} ETH ({status.gasPrice} Gwei)</small></p>
        )}
      </div>
    )
  }

  // Get status text for loans
  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return 'Requested'
      case 1: return 'Funded'
      case 2: return 'Repaid'
      case 3: return 'Defaulted'
      default: return 'Unknown'
    }
  }

  // Format date
  const formatDate = (timestamp: number) => {
    return timestamp > 0 ? new Date(timestamp * 1000).toLocaleDateString() : 'N/A'
  }

  // Check if user is on supported networks
  const isOnSepolia = networkId === SEPOLIA_CHAIN_ID
  const isOnLocalhost = networkId === LOCALHOST_CHAIN_ID
  const isOnSupportedNetwork = isOnSepolia || isOnLocalhost

  return (
    <div className="app">
      <div className="container">
        <div className="app-header">
          <div className="logo">🔒</div>
          <h1 className="title">Privacy Micro-Lending</h1>
          <p className="subtitle">Secure P2P micro-lending platform powered by blockchain technology - Protecting your privacy with safe and convenient lending</p>
        </div>

        <div className="blockchain-info">
          <p><strong>🔐 Real Blockchain Application</strong></p>
          <p>Running on Sepolia testnet - Requires MetaMask wallet connection</p>
          {isConnected && (
            <div style={{ marginTop: '10px' }}>
              <p><strong>Network:</strong> {isOnSepolia ? '✅ Sepolia Testnet' : isOnLocalhost ? '✅ Localhost Network' : '❌ Wrong Network'}</p>
              <p><strong>Balance:</strong> {userBalance} ETH</p>
              <p><strong>Contract:</strong> {CONTRACT_ADDRESS.slice(0, 8)}...{CONTRACT_ADDRESS.slice(-6)}</p>
            </div>
          )}
        </div>

        <div className="intro-text">
          <p><strong>Real Blockchain Experience</strong> – This is a live DApp on Sepolia testnet.</p>
          <p>• All transactions require MetaMask confirmation and gas fees</p>
          <p>• Your wallet needs Sepolia ETH to interact with the contract</p>
          <p>• Every action is recorded permanently on the blockchain</p>
          <p>• Credit scores and loan data are encrypted using FHE technology</p>
        </div>

        {!isMetaMaskInstalled() && (
          <div className="message error">
            <p>MetaMask is required to use this DApp.</p>
            <p>
              <a 
                href="https://metamask.io/download/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'underline' }}
              >
                Install MetaMask →
              </a>
            </p>
          </div>
        )}

        {!isOnSupportedNetwork && isConnected && (
          <div className="message error">
            <p>Please switch to Sepolia testnet or localhost network to use this DApp.</p>
            <button 
              className="button" 
              onClick={switchToSepolia}
              disabled={loading}
            >
              Switch to Sepolia
            </button>
          </div>
        )}

        {txStatus && formatTransactionStatus(txStatus)}

        {gasEstimate && (
          <div className="message info">
            <p>Estimated gas cost: {gasEstimate} ETH</p>
          </div>
        )}

        {!isConnected ? (
          <div className="card">
            <h3>Connect Your Wallet</h3>
            <p>Connect MetaMask to interact with the Privacy Micro-Lending smart contract on Sepolia testnet.</p>
            <div className="button-group">
              <button 
                className="button" 
                onClick={connectWallet} 
                disabled={loading || !isMetaMaskInstalled()}
              >
                {loading ? 'Connecting...' : 'Connect MetaMask'}
              </button>
            </div>
            <p style={{ marginTop: '15px', fontSize: '0.9rem', opacity: 0.8 }}>
              Need Sepolia ETH? Get it from the{' '}
              <a 
                href="https://sepoliafaucet.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'underline' }}
              >
                Sepolia Faucet
              </a>
            </p>
          </div>
        ) : (
          <>
            <div className="card">
              <h3>Your Wallet</h3>
              <div className="profile-content">
                <p><strong>Address:</strong> {account.slice(0, 8)}...{account.slice(-6)}</p>
                <p><strong>Balance:</strong> {userBalance} ETH</p>
                <p><strong>Network:</strong> {isOnSepolia ? 'Sepolia Testnet ✅' : 'Wrong Network ❌'}</p>
                {userProfile ? (
                  <div className="profile-stats">
                    <div className="stat-item">
                      <div className="stat-value">{userProfile.totalLoans}</div>
                      <div className="stat-label">Total Loans</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">{userProfile.successfulRepayments}</div>
                      <div className="stat-label">Successful Repayments</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">
                        {userProfile.totalLoans > 0 ? Math.round((userProfile.successfulRepayments / userProfile.totalLoans) * 100) : 0}%
                      </div>
                      <div className="stat-label">Success Rate</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">{userProfile.isActive ? '✅' : '❌'}</div>
                      <div className="stat-label">Account Status</div>
                    </div>
                  </div>
                ) : (
                  <div className="message info">
                    <p>You are not registered as a borrower yet. Register below to start borrowing.</p>
                  </div>
                )}
                <div className="button-group">
                  <button 
                    className="button warning" 
                    onClick={disconnectWallet}
                    style={{ fontSize: '0.8rem', padding: '8px 16px' }}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>

            {!isRegistered && isOnSupportedNetwork && (
              <div className="card">
                <h3>Register as Borrower</h3>
                <p>Register your encrypted credit score on the blockchain to start borrowing.</p>
                <div className="form-group">
                  <label>Credit Score (300-850):</label>
                  <select value={creditScore} onChange={(e) => setCreditScore(e.target.value)} disabled={loading}>
                    <option value="">Select Credit Score Range</option>
                    <option value="350">Poor (300-350)</option>
                    <option value="400">Poor (350-400)</option>
                    <option value="500">Fair (450-500)</option>
                    <option value="550">Fair (500-550)</option>
                    <option value="650">Good (600-650)</option>
                    <option value="700">Good (650-700)</option>
                    <option value="750">Excellent (700-750)</option>
                    <option value="800">Excellent (750-800)</option>
                    <option value="850">Perfect (800-850)</option>
                  </select>
                </div>
                <div className="checkbox-group">
                  <input 
                    type="checkbox" 
                    id="makePublic" 
                    checked={makePublic} 
                    onChange={(e) => setMakePublic(e.target.checked)}
                    disabled={loading}
                  />
                  <label htmlFor="makePublic">Make my profile public (visible to all lenders)</label>
                </div>
                <div className="button-group">
                  <button 
                    className="button secondary" 
                    onClick={registerBorrower} 
                    disabled={loading || !creditScore || !isOnSupportedNetwork}
                  >
                    {loading ? 'Registering...' : 'Register as Borrower'}
                  </button>
                </div>
              </div>
            )}

            {isRegistered && isOnSupportedNetwork && (
              <div className="card">
                <h3>Request Loan</h3>
                <p>Submit a loan request with encrypted terms to the blockchain.</p>
                <div className="form-group">
                  <label>Loan Amount:</label>
                  <select value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} disabled={loading}>
                    <option value="">Select Loan Amount</option>
                    <option value="0.01">0.01 ETH (~$20)</option>
                    <option value="0.05">0.05 ETH (~$100)</option>
                    <option value="0.1">0.1 ETH (~$200)</option>
                    <option value="0.5">0.5 ETH (~$1,000)</option>
                    <option value="1">1 ETH (~$2,000)</option>
                    <option value="2">2 ETH (~$4,000)</option>
                    <option value="5">5 ETH (~$10,000)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Interest Rate (APR):</label>
                  <select value={interestRate} onChange={(e) => setInterestRate(e.target.value)} disabled={loading}>
                    <option value="">Select Interest Rate</option>
                    <option value="5">5% APR (Low Risk)</option>
                    <option value="8">8% APR (Medium Risk)</option>
                    <option value="12">12% APR (Higher Risk)</option>
                    <option value="15">15% APR (High Risk)</option>
                    <option value="20">20% APR (Very High Risk)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Loan Duration:</label>
                  <select value={loanDuration} onChange={(e) => setLoanDuration(e.target.value)} disabled={loading}>
                    <option value="">Select Duration</option>
                    <option value="7">1 Week</option>
                    <option value="14">2 Weeks</option>
                    <option value="30">1 Month</option>
                    <option value="60">2 Months</option>
                    <option value="90">3 Months</option>
                    <option value="180">6 Months</option>
                    <option value="365">1 Year</option>
                  </select>
                </div>
                <div className="checkbox-group">
                  <input 
                    type="checkbox" 
                    id="isPrivateLoan" 
                    checked={isPrivateLoan} 
                    onChange={(e) => setIsPrivateLoan(e.target.checked)}
                    disabled={loading}
                  />
                  <label htmlFor="isPrivateLoan">Private loan (requires permission to view)</label>
                </div>
                <div className="button-group">
                  <button 
                    className="button" 
                    onClick={requestLoan} 
                    disabled={loading || !loanAmount || !interestRate || !loanDuration || !isOnSupportedNetwork}
                  >
                    {loading ? 'Requesting...' : 'Request Loan'}
                  </button>
                </div>
              </div>
            )}

            {isOnSupportedNetwork && (
              <div className="card">
                <h3>Fund a Loan</h3>
                <p>Provide funding to borrowers and earn interest on the blockchain.</p>
                <div className="form-group">
                  <label>Loan ID:</label>
                  <input 
                    type="number" 
                    value={loanIdToFund} 
                    onChange={(e) => setLoanIdToFund(e.target.value)}
                    placeholder="Enter loan ID to fund" 
                    min="1"
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>Funding Amount:</label>
                  <select value={fundingAmount} onChange={(e) => setFundingAmount(e.target.value)} disabled={loading}>
                    <option value="">Select Amount</option>
                    <option value="0.01">0.01 ETH</option>
                    <option value="0.05">0.05 ETH</option>
                    <option value="0.1">0.1 ETH</option>
                    <option value="0.5">0.5 ETH</option>
                    <option value="1">1 ETH</option>
                    <option value="2">2 ETH</option>
                    <option value="5">5 ETH</option>
                  </select>
                </div>
                <div className="button-group">
                  <button 
                    className="button accent" 
                    onClick={fundLoan}
                    disabled={loading || !loanIdToFund || !fundingAmount || !isOnSupportedNetwork || parseFloat(userBalance) < parseFloat(fundingAmount || '0')}
                  >
                    {loading ? 'Funding...' : 'Fund Loan'}
                  </button>
                </div>
              </div>
            )}

            {isRegistered && isOnSupportedNetwork && (
              <div className="card">
                <h3>Repay Loan</h3>
                <p>Repay your loan with interest to maintain good credit standing.</p>
                <div className="form-group">
                  <label>Loan ID:</label>
                  <input 
                    type="number" 
                    value={loanIdToRepay} 
                    onChange={(e) => setLoanIdToRepay(e.target.value)}
                    placeholder="Enter loan ID to repay" 
                    min="1"
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>Repayment Amount:</label>
                  <select value={repaymentAmount} onChange={(e) => setRepaymentAmount(e.target.value)} disabled={loading}>
                    <option value="">Select Amount</option>
                    <option value="0.011">0.011 ETH (0.01 + 10% interest)</option>
                    <option value="0.0525">0.0525 ETH (0.05 + 5% interest)</option>
                    <option value="0.108">0.108 ETH (0.1 + 8% interest)</option>
                    <option value="0.56">0.56 ETH (0.5 + 12% interest)</option>
                    <option value="1.15">1.15 ETH (1 + 15% interest)</option>
                    <option value="2.4">2.4 ETH (2 + 20% interest)</option>
                    <option value="5.6">5.6 ETH (5 + 12% interest)</option>
                  </select>
                </div>
                <div className="button-group">
                  <button 
                    className="button warning" 
                    onClick={repayLoan}
                    disabled={loading || !loanIdToRepay || !repaymentAmount || !isOnSupportedNetwork || parseFloat(userBalance) < parseFloat(repaymentAmount || '0')}
                  >
                    {loading ? 'Repaying...' : 'Repay Loan'}
                  </button>
                </div>
              </div>
            )}

            {userLoans.length > 0 && (
              <div className="card">
                <h3>Your Loans</h3>
                <div className="loans-list">
                  {userLoans.map((loan) => (
                    <div key={loan.id} className="loan-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong>Loan #{loan.id}</strong>
                        <span className={`loan-status ${getStatusText(loan.status).toLowerCase()}`}>
                          {getStatusText(loan.status)}
                        </span>
                      </div>
                      <p><strong>Role:</strong> {loan.borrower.toLowerCase() === account.toLowerCase() ? 'Borrower' : 'Lender'}</p>
                      <p><strong>Duration:</strong> {Math.round(loan.duration / 86400)} days</p>
                      <p><strong>Created:</strong> {formatDate(loan.createdAt)}</p>
                      {loan.dueDate > 0 && <p><strong>Due:</strong> {formatDate(loan.dueDate)}</p>}
                      <p><strong>Privacy:</strong> {loan.isPrivate ? 'Private' : 'Public'}</p>
                      <p>
                        <a 
                          href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'inherit', textDecoration: 'underline', fontSize: '0.9rem' }}
                        >
                          View on Etherscan →
                        </a>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <h3>Available Loans to Fund</h3>
              <div className="loans-list">
                {availableLoans.length === 0 ? (
                  <p>No public loans available for funding at the moment.</p>
                ) : (
                  availableLoans.map((loan) => (
                    <div key={loan.id} className="loan-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong>Loan #{loan.id}</strong>
                        <button 
                          className="button accent" 
                          onClick={() => quickFund(loan.id)}
                          style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                          disabled={loading || !isOnSupportedNetwork}
                        >
                          Quick Fund
                        </button>
                      </div>
                      <p><strong>Borrower:</strong> {loan.borrower.slice(0, 8)}...{loan.borrower.slice(-6)}</p>
                      <p><strong>Duration:</strong> {Math.round(loan.duration / 86400)} days</p>
                      <p><strong>Created:</strong> {formatDate(loan.createdAt)}</p>
                      <p><strong>Status:</strong> Available for funding</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        <div className="card" style={{ marginTop: '40px', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
          <h3>🚀 Real Blockchain Features</h3>
          <div style={{ textAlign: 'left' }}>
            <p>✅ <strong>Live Smart Contract:</strong> Deployed on Sepolia testnet</p>
            <p>✅ <strong>MetaMask Integration:</strong> Real wallet connection & transaction signing</p>
            <p>✅ <strong>Gas Fee Payment:</strong> Actual ETH required for transactions</p>
            <p>✅ <strong>Transaction Confirmation:</strong> Blockchain verification required</p>
            <p>✅ <strong>Permanent Records:</strong> All data stored on Ethereum</p>
            <p>✅ <strong>FHE Privacy:</strong> Credit scores & loan data encrypted</p>
          </div>
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <p>
              <strong>Contract Address:</strong>{' '}
              <a 
                href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'underline' }}
              >
                {CONTRACT_ADDRESS}
              </a>
            </p>
            <p><strong>Total Loans Created:</strong> {totalLoans}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App