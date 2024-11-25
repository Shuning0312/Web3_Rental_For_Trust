const { ethers } = require("hardhat");
const RentalProperty= require( "../src/artifacts/contracts/RentalProperty.sol/RentalProperty.json");
const RentalEscrow =require( "../src/artifacts/contracts/RentalEscrow.sol/RentalEscrow.json");
const fs = require('fs'); // 添加文件系统模块



const tokens = (n) => {
  return ethers.utils.parseEther(n.toString());
}

async function verifyContractState(rentalProperty, rentalEscrow, landlord) {
  console.log("\nVerifying contract state...\n");

      // 从第一个房产开始验证
      console.log("\n--------------------Property #1 Info:----------------------");
      const [owner1, isAvailable, rentPrice, securityDeposit] = await rentalProperty.getPropertyInfo(1);
      console.log("Owner1:", owner1);
      console.log("Is Available:", isAvailable);
      console.log("Rent Price:", ethers.utils.formatEther(rentPrice), "ETH");
      console.log("Security Deposit:", ethers.utils.formatEther(securityDeposit), "ETH");
          
      const uri = await rentalProperty.tokenURI(1);
      console.log("Token URI:", uri);

      // 验证房东房产数量
      const landlordCount = await rentalProperty.landlordPropertyCount(owner1);
      console.log("Landlord property count:", landlordCount.toString());

      // 获取房东的所有房产
      const landlordProperties = await rentalProperty.getLandlordProperties(owner1);
      console.log("Landlord properties:", landlordProperties.map(p => p.toString()));

      // 验证租赁状态
      const isRented = await rentalProperty.isRented(1);
      console.log("Is property rented:", isRented);

      // 验证 Escrow 合约地址
      const escrowAddress = await rentalProperty.rentalEscrowAddress();
      console.log("\nEscrow address in RentalProperty:", escrowAddress);
      console.log("Expected Escrow address:", rentalEscrow.address);

      // 验证 NFT 信息
      const name = await rentalProperty.name();
      const symbol = await rentalProperty.symbol();
      // console.log("\nNFT Info:");
      // console.log("Name:", name);
      // console.log("Symbol:", symbol);

}

console.log("\n--------------------------------Main-----------------------------------------\n");

async function main() {
    console.log("Starting deployment...");

    // Setup accounts
    const [owner, landlord, tenant] = await ethers.getSigners();
    console.log("\nDeploying with landlord account:", landlord.address);
    
    // 检查账户余额
    const balance = await landlord.getBalance();
    // console.log("\nLandlord balance:", ethers.utils.formatEther(balance), "ETH");


    // 创建合约实例
    const abi = RentalProperty.abi
    const bytecode = RentalProperty.bytecode
    const rentalFactory = new ethers.ContractFactory(abi,bytecode,owner)
    const rentalProperty = await rentalFactory.deploy()
    console.log("rentalProperty ",rentalProperty.address)

    const abi2 = RentalEscrow.abi
    const bytecode2 = RentalEscrow.bytecode
    const escrowFactory = new ethers.ContractFactory(abi2,bytecode2,owner)
    const rentalEscrow =await escrowFactory.deploy(
      rentalProperty.address,
      landlord.address
    )
    // console.log("rentalEscrow ",rentalEscrow.address)


    for (let i = 0; i < 3; i++) {
      const transaction = await rentalProperty.connect(landlord).mint(`https://indigo-tiny-aardvark-637.mypinata.cloud/ipfs/QmWDh7VU9rE3AD54PnmJCZBVCsBxNqZsELMhDU9rAHexMP/${i + 1}.json`)
      console.log("房产的地址：", landlord.address)
      await transaction.wait()

      // const uri = await rentalProperty.tokenURI(i);
      const response = await fetch(`https://indigo-tiny-aardvark-637.mypinata.cloud/ipfs/QmWDh7VU9rE3AD54PnmJCZBVCsBxNqZsELMhDU9rAHexMP/${i + 1}.json`);
      const metadata = await response.json();
      // console.log(`Metadata for NFT ${i}:`, metadata);

      const rentPrice = metadata.attributes.find(attr => attr.trait_type === "Monthly Rent").value;
      const securityDeposit = metadata.attributes.find(attr => attr.trait_type === "Security Deposit").value;


      // Approve 托管合约
      console.log(`Approving NFT ${i} for escrow`);
      const approveTx = await rentalProperty.connect(landlord).approve(rentalEscrow.address, i+1);
      await approveTx.wait();

      // 创建房产 (使用JSON中的信息)
      const listTx = await rentalEscrow.connect(landlord).listForRent(
        i+1,
        tokens(rentPrice),
        tokens(securityDeposit)
      );
      await listTx.wait();
    }

    // console.log("--------------------------------Main-----------------------------------------");
    // 验证合约状态
    // await verifyContractState(rentalProperty, rentalEscrow, landlord);

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