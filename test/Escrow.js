// test/RentalSystem.test.js

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Rental System", function () {
   let RentalProperty;
   let RentalEscrow;
   let rentalProperty;
   let rentalEscrow;
   let owner;
   let landlord;
   let tenant1;
   let tenant2;
   let addresses;

   const MONTH = 30 * 24 * 60 * 60; // 30 days in seconds
   const RENT_PRICE = ethers.utils.parseEther("1"); // 1 ETH
   const SECURITY_DEPOSIT = ethers.utils.parseEther("2"); // 2 ETH

   beforeEach(async function () {
       // 获取合约工厂
       RentalProperty = await ethers.getContractFactory("RentalProperty");
       RentalEscrow = await ethers.getContractFactory("RentalEscrow");

       // 获取测试账户
       [owner, landlord, tenant1, tenant2, ...addresses] = await ethers.getSigners();

       // 部署合约
       rentalProperty = await RentalProperty.deploy();
       await rentalProperty.deployed();

       rentalEscrow = await RentalEscrow.deploy(rentalProperty.address);
       await rentalEscrow.deployed();

       // 设置托管合约地址
       await rentalProperty.setRentalEscrowAddress(rentalEscrow.address);
   });

   describe("RentalProperty", function () {
       it("Should create a new property", async function () {
           const tokenURI = "https://example.com/property/1";
           await expect(
               rentalProperty.connect(landlord).createProperty(
                   tokenURI,
                   RENT_PRICE,
                   SECURITY_DEPOSIT
               )
           )
               .to.emit(rentalProperty, "PropertyCreated")
               .to.emit(rentalProperty, "PropertyListed");

           const propertyCount = await rentalProperty.landlordPropertyCount(landlord.address);
           expect(propertyCount).to.equal(1);

           const [actualLandlord, isAvailable, rentPrice, securityDeposit] = 
               await rentalProperty.getPropertyInfo(1);
           
           expect(actualLandlord).to.equal(landlord.address);
           expect(isAvailable).to.be.true;
           expect(rentPrice).to.equal(RENT_PRICE);
           expect(securityDeposit).to.equal(SECURITY_DEPOSIT);
       });

       it("Should update property price", async function () {
           await rentalProperty.connect(landlord).createProperty(
               "https://example.com/property/1",
               RENT_PRICE,
               SECURITY_DEPOSIT
           );

           const newRentPrice = ethers.utils.parseEther("1.5");
           const newSecurityDeposit = ethers.utils.parseEther("3");

           await expect(
               rentalProperty.connect(landlord).updatePropertyPrice(1, newRentPrice, newSecurityDeposit)
           ).to.emit(rentalProperty, "PropertyListed");

           const [, , rentPrice, securityDeposit] = await rentalProperty.getPropertyInfo(1);
           expect(rentPrice).to.equal(newRentPrice);
           expect(securityDeposit).to.equal(newSecurityDeposit);
       });

       it("Should get landlord properties", async function () {
           // 创建两个房产
           await rentalProperty.connect(landlord).createProperty(
               "https://example.com/property/1",
               RENT_PRICE,
               SECURITY_DEPOSIT
           );

           await rentalProperty.connect(landlord).createProperty(
               "https://example.com/property/2",
               RENT_PRICE,
               SECURITY_DEPOSIT
           );

           const properties = await rentalProperty.getLandlordProperties(landlord.address);
           expect(properties.length).to.equal(2);
           expect(properties[0]).to.equal(1);
           expect(properties[1]).to.equal(2);
       });
   });

   describe("RentalEscrow", function () {
       let propertyId;

       beforeEach(async function () {
           // 创建一个房产用于测试
           await rentalProperty.connect(landlord).createProperty(
               "https://example.com/property/1",
               RENT_PRICE,
               SECURITY_DEPOSIT
           );
           propertyId = 1;
       });

       it("Should create a rental agreement", async function () {
           const duration = 6; // 6 months
           const totalAmount = RENT_PRICE.add(SECURITY_DEPOSIT);

           await expect(
               rentalEscrow.connect(tenant1).createRental(propertyId, duration, {
                   value: totalAmount
               })
           ).to.emit(rentalEscrow, "RentalCreated");

           const rental = await rentalEscrow.rentals(propertyId);
           expect(rental.tenant).to.equal(tenant1.address);
           expect(rental.active).to.be.true;

           // 验证房产状态
           const [, isAvailable] = await rentalProperty.getPropertyInfo(propertyId);
           expect(isAvailable).to.be.false;
       });

       it("Should pay monthly rent", async function () {
           // 首先创建租赁
           const duration = 6;
           const totalAmount = RENT_PRICE.add(SECURITY_DEPOSIT);
           await rentalEscrow.connect(tenant1).createRental(propertyId, duration, {
               value: totalAmount
           });

           // 获取房东初始余额
           const initialLandlordBalance = await ethers.provider.getBalance(landlord.address);

           // 支付月租
           await expect(
               rentalEscrow.connect(tenant1).payRent(propertyId, {
                   value: RENT_PRICE
               })
           ).to.emit(rentalEscrow, "RentPaid");

           // 验证房东收到租金
           const finalLandlordBalance = await ethers.provider.getBalance(landlord.address);
           expect(finalLandlordBalance.sub(initialLandlordBalance)).to.equal(RENT_PRICE);
       });

       it("Should end rental and return deposit", async function () {
           // 创建租赁
           const duration = 1; // 1 month
           const totalAmount = RENT_PRICE.add(SECURITY_DEPOSIT);
           await rentalEscrow.connect(tenant1).createRental(propertyId, duration, {
               value: totalAmount
           });

           // 获取租客初始余额
           const initialTenantBalance = await ethers.provider.getBalance(tenant1.address);

           // 快进时间
           await ethers.provider.send("evm_increaseTime", [MONTH + 1]);
           await ethers.provider.send("evm_mine");

           // 结束租赁
           await expect(
               rentalEscrow.connect(landlord).endRental(propertyId)
           )
               .to.emit(rentalEscrow, "RentalEnded")
               .to.emit(rentalEscrow, "SecurityDepositReturned");

           // 验证租约状态
           const rental = await rentalEscrow.rentals(propertyId);
           expect(rental.active).to.be.false;
           expect(rental.depositReturned).to.be.true;

           // 验证房产状态恢复可用
           const [, isAvailable] = await rentalProperty.getPropertyInfo(propertyId);
           expect(isAvailable).to.be.true;
       });

       it("Should check rental status", async function () {
           const duration = 6;
           const totalAmount = RENT_PRICE.add(SECURITY_DEPOSIT);
           await rentalEscrow.connect(tenant1).createRental(propertyId, duration, {
               value: totalAmount
           });

           const [isActive, startTime, endTime, remainingTime] = 
               await rentalEscrow.checkRentalStatus(propertyId);
           
           expect(isActive).to.be.true;
           expect(endTime.sub(startTime)).to.equal(duration * MONTH);
           expect(remainingTime).to.be.gt(0);
       });

       it("Should get tenant rentals", async function () {
           // 创建第二个房产
           await rentalProperty.connect(landlord).createProperty(
               "https://example.com/property/2",
               RENT_PRICE,
               SECURITY_DEPOSIT
           );

           const duration = 6;
           const totalAmount = RENT_PRICE.add(SECURITY_DEPOSIT);

           // 租两个房产
           await rentalEscrow.connect(tenant1).createRental(1, duration, {
               value: totalAmount
           });
           await rentalEscrow.connect(tenant1).createRental(2, duration, {
               value: totalAmount
           });

           const tenantRentals = await rentalEscrow.getTenantRentals(tenant1.address);
           expect(tenantRentals.length).to.equal(2);
           expect(tenantRentals[0]).to.equal(1);
           expect(tenantRentals[1]).to.equal(2);
       });

       it("Should fail when renting unavailable property", async function () {
           const duration = 6;
           const totalAmount = RENT_PRICE.add(SECURITY_DEPOSIT);

           // 第一个租客租房
           await rentalEscrow.connect(tenant1).createRental(propertyId, duration, {
               value: totalAmount
           });

           // 第二个租客尝试租同一个房产
           await expect(
               rentalEscrow.connect(tenant2).createRental(propertyId, duration, {
                   value: totalAmount
               })
           ).to.be.revertedWith("Property not available");
       });

       it("Should fail with insufficient payment", async function () {
           const duration = 6;
           const insufficientAmount = RENT_PRICE; // 没有包含押金

           await expect(
               rentalEscrow.connect(tenant1).createRental(propertyId, duration, {
                   value: insufficientAmount
               })
           ).to.be.revertedWith("Insufficient payment");
       });
   });
});