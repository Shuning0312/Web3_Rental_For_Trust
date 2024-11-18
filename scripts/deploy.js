const { ethers } = require("hardhat");
const fs = require('fs'); // 添加文件系统模块

const tokens = (n) => {
  return ethers.utils.parseEther(n.toString());
}

async function verifyContractState(rentalProperty, rentalEscrow, landlord) {
  console.log("\nVerifying contract state...");
  
  try {
      // 从第一个房产开始验证
      try {
          const [owner, isAvailable, rentPrice, securityDeposit] = await rentalProperty.getPropertyInfo(1);
          console.log("\nProperty #1 Info:");
          console.log("Owner:", owner);
          console.log("Is Available:", isAvailable);
          console.log("Rent Price:", ethers.utils.formatEther(rentPrice), "ETH");
          console.log("Security Deposit:", ethers.utils.formatEther(securityDeposit), "ETH");
          
          const uri = await rentalProperty.tokenURI(1);
          console.log("Token URI:", uri);

          // 验证房东房产数量
          const landlordCount = await rentalProperty.landlordPropertyCount(owner);
          console.log("Landlord property count:", landlordCount.toString());

          // 获取房东的所有房产
          const landlordProperties = await rentalProperty.getLandlordProperties(owner);
          console.log("Landlord properties:", landlordProperties.map(p => p.toString()));

          // 验证租赁状态
          const isRented = await rentalProperty.isRented(1);
          console.log("Is property rented:", isRented);

      } catch (error) {
          console.log("Error getting property info:", error.message);
      }
      
      // 验证 Escrow 合约地址
      const escrowAddress = await rentalProperty.rentalEscrowAddress();
      console.log("\nEscrow address in RentalProperty:", escrowAddress);
      console.log("Expected Escrow address:", rentalEscrow.address);

      // 验证 NFT 信息
      const name = await rentalProperty.name();
      const symbol = await rentalProperty.symbol();
      console.log("\nNFT Info:");
      console.log("Name:", name);
      console.log("Symbol:", symbol);
      
  } catch (error) {
      console.log("Error in contract verification:", error.message);
  }
}

async function main() {
  try {
    console.log("Starting deployment...");

    // Setup accounts
    const [owner, landlord, tenant] = await ethers.getSigners();
    console.log("Deploying with landlord account:", landlord.address);
    
    // 检查账户余额
    const balance = await landlord.getBalance();
    console.log("Landlord balance:", ethers.utils.formatEther(balance), "ETH");

    // Deploy RentalProperty
    const RentalProperty = await ethers.getContractFactory('RentalProperty');
    const rentalProperty = await RentalProperty.deploy();
    await rentalProperty.deployed();
    console.log(`Deployed RentalProperty at: ${rentalProperty.address}`);

    // Deploy RentalEscrow
    const RentalEscrow = await ethers.getContractFactory('RentalEscrow');
    const rentalEscrow = await RentalEscrow.deploy(rentalProperty.address);
    await rentalEscrow.deployed();
    console.log(`Deployed RentalEscrow at: ${rentalEscrow.address}`);

    // Set Escrow address in RentalProperty
    let transaction = await rentalProperty.setRentalEscrowAddress(rentalEscrow.address);
    await transaction.wait();
    console.log("Set Escrow address in RentalProperty");

    // Create property
    const propertyURI = "https://indigo-tiny-aardvark-637.mypinata.cloud/ipfs/QmUnZNzrjsxU4KkeKkEV2qiBNJyZhMXABNcFwL2LiNhuPL";
    transaction = await rentalProperty.connect(landlord).createProperty(
      propertyURI,
      tokens(1), // 月租金 1 ETH
      tokens(2)  // 押金 2 ETH
    );
    await transaction.wait();
    console.log("Property created with URI:", propertyURI);

    // Approve Escrow
    transaction = await rentalProperty.connect(landlord).approve(rentalEscrow.address, 1);
    await transaction.wait();
    console.log("Approved Escrow contract to manage property #1");

    // Set availability
    transaction = await rentalProperty.connect(landlord).setPropertyAvailability(1, true);
    await transaction.wait();
    console.log("Set property #1 availability to true");

    // 验证合约状态
    await verifyContractState(rentalProperty, rentalEscrow, landlord);

    // 创建配置对象
    const config = {
      "31337": {
        "rentalProperty": {
          "address": rentalProperty.address
        },
        "rentalEscrow": {
          "address": rentalEscrow.address
        }
      }
    };

    // 将配置写入文件
    const configPath = './src/config.json';
    fs.writeFileSync(
      configPath,
      JSON.stringify(config, null, 2)
    );
    console.log(`\nConfig written to ${configPath}`);

    // 尝试读取元数据验证
    try {
      const response = await fetch(propertyURI);
      const metadata = await response.json();
      console.log("\nProperty Metadata:");
      console.log(JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.log("\nCould not fetch metadata, please verify manually:", error.message);
    }

  } catch (error) {
    console.error("\nDeployment failed:");
    console.error(error);
    throw error;
  }
}

main()
  .then(() => {
    console.log("\nDeployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });