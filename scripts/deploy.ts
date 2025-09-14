import { ethers } from "hardhat"
import fs from "fs"
import path from "path"

async function main() {
  console.log("🚀 Starting Privacy Micro-Lending contract deployment...")

  // Get the contract factory
  const MicroLendingPlatform = await ethers.getContractFactory("MicroLendingPlatform")

  console.log("📝 Deploying MicroLendingPlatform contract...")

  // Deploy the contract
  const microLendingPlatform = await MicroLendingPlatform.deploy()

  // Wait for deployment to complete
  await microLendingPlatform.waitForDeployment()

  const contractAddress = await microLendingPlatform.getAddress()
  console.log("✅ MicroLendingPlatform deployed to:", contractAddress)

  // Get deployment info
  const [deployer] = await ethers.getSigners()
  const network = await ethers.provider.getNetwork()
  const deployerBalance = await ethers.provider.getBalance(deployer.address)

  console.log("\n📊 Deployment Summary:")
  console.log("======================")
  console.log(`📍 Contract Address: ${contractAddress}`)
  console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`)
  console.log(`👤 Deployer: ${deployer.address}`)
  console.log(`💰 Deployer Balance: ${ethers.formatEther(deployerBalance)} ETH`)

  // Verify deployment
  console.log("\n🔍 Verifying deployment...")
  const owner = await microLendingPlatform.owner()
  const loanCounter = await microLendingPlatform.loanCounter()
  const maxLoanAmount = await microLendingPlatform.MAX_LOAN_AMOUNT()
  const minLoanAmount = await microLendingPlatform.MIN_LOAN_AMOUNT()

  console.log("✅ Contract owner:", owner)
  console.log("✅ Initial loan counter:", loanCounter.toString())
  console.log("✅ Max loan amount:", ethers.formatEther(maxLoanAmount), "ETH")
  console.log("✅ Min loan amount:", ethers.formatEther(minLoanAmount), "ETH")

  // Save deployment info to file
  const deploymentInfo = {
    contractAddress: contractAddress,
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    transactionHash: microLendingPlatform.deploymentTransaction()?.hash,
    owner: owner,
    initialLoanCounter: loanCounter.toString(),
    maxLoanAmount: ethers.formatEther(maxLoanAmount),
    minLoanAmount: ethers.formatEther(minLoanAmount),
  }

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments")
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true })
  }

  // Save to network-specific file
  const deploymentFile = path.join(deploymentsDir, `${network.name}.json`)
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2))

  // Also save to generic deployment-info.json for backwards compatibility
  const genericFile = path.join(__dirname, "..", "deployment-info.json")
  fs.writeFileSync(genericFile, JSON.stringify(deploymentInfo, null, 2))

  console.log(`\n💾 Deployment info saved to:`)
  console.log(`   📄 ${deploymentFile}`)
  console.log(`   📄 ${genericFile}`)

  // Update frontend configuration
  try {
    const frontendConfigUpdate = {
      REACT_APP_CONTRACT_ADDRESS: contractAddress,
      REACT_APP_NETWORK: network.name,
      REACT_APP_CHAIN_ID: network.chainId.toString(),
    }

    console.log("\n🔄 Frontend Configuration Update:")
    console.log("Add these to your .env file:")
    Object.entries(frontendConfigUpdate).forEach(([key, value]) => {
      console.log(`${key}=${value}`)
    })

    // Update the App.tsx contract address if in development
    if (process.env.NODE_ENV === "development") {
      const appTsxPath = path.join(__dirname, "..", "src", "App.tsx")
      if (fs.existsSync(appTsxPath)) {
        let appContent = fs.readFileSync(appTsxPath, "utf8")
        
        // Replace the contract address
        const contractAddressRegex = /const CONTRACT_ADDRESS = ["']0x[a-fA-F0-9]{40}["']/
        if (contractAddressRegex.test(appContent)) {
          appContent = appContent.replace(
            contractAddressRegex,
            `const CONTRACT_ADDRESS = "${contractAddress}"`
          )
          fs.writeFileSync(appTsxPath, appContent)
          console.log("✅ Updated contract address in App.tsx")
        }
      }
    }
  } catch (error) {
    console.log("⚠️  Could not update frontend configuration:", error)
  }

  console.log("\n🎉 Deployment completed successfully!")
  console.log("\n📋 Next Steps:")
  console.log("1. Update your frontend .env file with the new contract address")
  console.log("2. Verify the contract on Etherscan (if on mainnet/testnet)")
  console.log("3. Test the contract functionality")
  console.log("4. Deploy frontend to production")

  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n🔗 Useful Links:")
    console.log(`📊 Contract on Etherscan: https://${network.name !== "mainnet" ? network.name + "." : ""}etherscan.io/address/${contractAddress}`)
  }

  return contractAddress
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => {
    console.log("\n✅ Script completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error)
    process.exit(1)
  })