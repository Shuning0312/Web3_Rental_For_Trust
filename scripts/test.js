 const { ethers } = require('hardhat');
 const HARDHAT_RPC_URL  = require( "../accountSetting.js");
 const PRIVATE_KEY0  = require( "../accountSetting.js");
 const RentalProperty= require( "../src/artifacts/contracts/RentalProperty.sol/RentalProperty.json");
 const RentalEscrow =require( "../src/artifacts/contracts/RentalEscrow.sol/RentalEscrow.json");

 const tokens = (n) => {
    return ethers.utils.parseEther(n.toString());
  }


 async function test01() {
    // 1. 检查 provider 和网络连接
    //  const provider = new ethers.providers.JsonRpcBatchProvider(HARDHAT_RPC_URL)
    // //  console.log("Provider connected",provider);
    // const signer = new ethers.Wallet(PRIVATE_KEY0,provider)
    // //  const signer = provider.getSigner();
    //  const signerAddress = signer.address;


    //const [signer]= await ethers.getSigners();
    //console.log("signerAddress:", signer.address);

    const [owner, landlord, tenant] = await ethers.getSigners();

    // const signer = new ethers.Wallet(PRIVATE_KEY0,provider)
    // setProvider(provider)
    //  console.log("Provider connected 2",signer);
 
    //  const network = await provider.getNetwork()
    //  console.log("Network:", network);
 
     // 2. 检查配置
    //  console.log("Config:", config);
    //  console.log("Current network config:", config[network.chainId]);
 
    // 3. 创建合约实例
    console.log("创建合约实例： ",)
    const abi = RentalProperty.abi;
    const bytecode = RentalProperty.bytecode;
 
    const rentalFactory = new ethers.ContractFactory(abi,bytecode,owner);
    const rentalProperty =await rentalFactory.deploy();
    console.log("rentalProperty ",rentalProperty.address)
    // console.log("-------OK----------------OK------------OK------------------------ ")




    console.log("创建合约实例： ",)
    const abi2 = RentalProperty.abi;
    const bytecode2 = RentalProperty.bytecode;
 
    const rentalEscrowFactory = new ethers.ContractFactory(abi2,bytecode2,owner);
    const rentalEscrow =await rentalEscrowFactory.deploy();
    console.log("rentalEscrow ",rentalEscrow.address)
    console.log("-------创建合约实例OK----------------创建合约实例OK------------创建合约实例OK------------------------ ")


    // Set Escrow address in RentalProperty
    let transaction = await rentalProperty.setRentalEscrowAddress(rentalEscrow.address);
    await transaction.wait();
    console.log("Set Escrow address in RentalProperty");


    // 4. 初始化一个房产
    // const [landlord, isAvailable, rentPrice, securityDeposit] = await rentalProperty.getPropertyInfo(1);
    
    // console.log("Property #1 info:", {
    //     landlord,
    //     isAvailable,
    //     rentPrice: ethers.utils.formatEther(rentPrice),
    //     securityDeposit: ethers.utils.formatEther(securityDeposit)
    // });
    // console.log("-----------------------OK------------------------------------- ")


     // 5. Mint一个房产 URI
     const propertyURI = "https://indigo-tiny-aardvark-637.mypinata.cloud/ipfs/QmUnZNzrjsxU4KkeKkEV2qiBNJyZhMXABNcFwL2LiNhuPL";
     await rentalProperty.mintProperty(landlord.address, 1, propertyURI);
     console.log("-----------------------Mint一个房产OK------------------------------------- ")


    // Create property
    // const propertyURI = "https://indigo-tiny-aardvark-637.mypinata.cloud/ipfs/QmUnZNzrjsxU4KkeKkEV2qiBNJyZhMXABNcFwL2LiNhuPL";
    transaction = await rentalProperty.connect(landlord).createProperty(
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


    // 6. 获取元数据
    const response = await fetch(propertyURI);
    const metadata = await response.json();
    // console.log("Property #1 metadata:", metadata);

    // 6. 创建房产对象
    const rental = {
      id: 1,
      image: metadata.image,
      name: metadata.name,
      address: metadata.address,
      rentPrice,
      securityDeposit,
      attributes: metadata.attributes,
      landlord,
      isAvailable
    };

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

       
 


  }
  test01()
 
//   test01()
//   .then(() => {
//     console.log("\nDeployment completed successfully!");
//     process.exit(0);
//   })
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });