// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

interface IERC721 {
    function transferFrom(
        address _from,
        address _to,
        uint256 _id
    ) external;
}

interface IRentalProperty {
    function getPropertyInfo(uint256 tokenId) external view returns (
        address landlord,
        bool isAvailable,
        uint256 rentPrice,
        uint256 securityDeposit
    );

    function setRentalStatus(uint256 tokenId, bool rented) external;
}

contract RentalEscrow {
    address public nftAddress;
    address public landlord;

    // 新增状态变量
    enum RentalStatus { 
        NotListed,  // 未挂牌
        Available,      // 可租
        Rented,         // 已出租
        Ended           // 租约结束
    }
    
    // 修饰符
    modifier onlyTenant(uint256 _nftID) {
        require(msg.sender == tenant[_nftID], "Only tenant can call this method");
        _;
    }

    modifier onlyLandlord() {
        require(msg.sender == landlord, "Only landlord can call this method");
        _;
    }

    modifier onlyLandlordOrTenant(uint256 _nftID) {
        require(msg.sender == landlord || msg.sender == tenant[_nftID], 
                "Only landlord or tenant can call this method");
        _;
    }
    
    // 状态映射
    mapping(uint256 => RentalStatus) public propertyStatus;  // 房产当前状态
    mapping(uint256 => uint256) public rentalDuration;       // 租期(月)
    mapping(uint256 => uint256) public rentalPrice;     // 月租金
    mapping(uint256 => uint256) public securityDeposit; // 押金
    mapping(uint256 => address) public tenant;          // 租客
    mapping(uint256 => uint256) public rentalStartDate; // 租期开始时间
    mapping(uint256 => uint256) public rentalEndDate;   // 租期结束时间
    mapping(uint256 => uint256) public lastRentPayment; // 上次租金支付时间

    mapping(uint256 => mapping(address => bool)) public approval;


    // 事件
    event PropertyListed(
        uint256 indexed nftID, 
        uint256 rentalPrice, 
        uint256 securityDeposit
    );
    event RentalStarted(
        uint256 indexed nftID,
        address indexed tenant,
        uint256 startDate,
        uint256 endDate
    );
    event RentalPaid(
        uint256 indexed nftID,
        address indexed tenant,
        uint256 amount
    );
    event RentalEnded(
        uint256 indexed nftID,
        address indexed tenant,
        bool depositReturned
    );

    constructor(address _nftAddress, address _landlord) {
        nftAddress = _nftAddress;
        landlord = _landlord;
    }

    // 房东挂牌出租
    function listForRent(
        uint256 _nftID,
        uint256 _rentalPrice,
        uint256 _securityDeposit
    ) public onlyLandlord {
        // 将NFT转移到合约
        IERC721(nftAddress).transferFrom(msg.sender, address(this), _nftID);

        rentalPrice[_nftID] = _rentalPrice;
        securityDeposit[_nftID] = _securityDeposit;
        propertyStatus[_nftID] = RentalStatus.Available;

        emit PropertyListed(_nftID, _rentalPrice, _securityDeposit);
    }

    // 租客直接支付押金和首月租金开始租赁
    function startRental(uint256 _nftID, uint256 _durationInMonths) public payable {
        require(propertyStatus[_nftID] == RentalStatus.Available, "Property not available");
        require(_durationInMonths > 0, "Invalid rental duration");
        
        uint256 totalAmount = rentalPrice[_nftID] + securityDeposit[_nftID];
        require(msg.value == totalAmount, "Incorrect payment amount");
        
        tenant[_nftID] = msg.sender;
        rentalDuration[_nftID] = _durationInMonths;
        rentalStartDate[_nftID] = block.timestamp;
        rentalEndDate[_nftID] = block.timestamp + (_durationInMonths * 30 days);
        lastRentPayment[_nftID] = block.timestamp;
        propertyStatus[_nftID] = RentalStatus.Rented;
        
        // 转移首月租金给房东
        payable(landlord).transfer(rentalPrice[_nftID]);
        
        emit RentalStarted(
            _nftID, 
            msg.sender, 
            rentalStartDate[_nftID], 
            rentalEndDate[_nftID]
        );
    }
    
    // 支付月租
    function payRent(uint256 _nftID) public payable onlyTenant(_nftID) {
        require(propertyStatus[_nftID] == RentalStatus.Rented, "Property not rented");
        require(msg.value == rentalPrice[_nftID], "Incorrect rent amount");
        
        lastRentPayment[_nftID] = block.timestamp;
        payable(landlord).transfer(msg.value);

        emit RentalPaid(_nftID, msg.sender, msg.value);
    }
    
    // 结束租赁
    function endRental(uint256 _nftID) public {
        require(propertyStatus[_nftID] == RentalStatus.Rented, "Property not rented");
        require(msg.sender == landlord || msg.sender == tenant[_nftID], 
                "Only landlord or tenant can end rental");
        require(block.timestamp >= rentalEndDate[_nftID] || msg.sender == landlord,
                "Rental period not ended");

        bool isClean = true; // 在实际应用中可以添加房屋状况检查逻辑
        
        if (isClean) {
            // 退还押金给租客
            payable(tenant[_nftID]).transfer(securityDeposit[_nftID]);
        } else {
            // 如果房屋有损坏，押金转给房东
            payable(landlord).transfer(securityDeposit[_nftID]);
        }

        // 将NFT归还给房东
        IERC721(nftAddress).transferFrom(address(this), landlord, _nftID);
        
        propertyStatus[_nftID] = RentalStatus.Ended;
        
        emit RentalEnded(_nftID, tenant[_nftID], isClean);
    }
    
    // 获取房产信息
    function getPropertyInfo(uint256 _nftID) public view returns (
        uint256 rent,
        uint256 deposit,
        RentalStatus status
    ) {
        return (
            rentalPrice[_nftID],
            securityDeposit[_nftID],
            propertyStatus[_nftID]
        );
    }
    
    receive() external payable {}

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // // Put Under Contract (only buyer - payable escrow)
    // function depositEarnest(uint256 _nftID) public payable onlyTenant(_nftID) {
    //     console.log("has gone depositEarnest ");
    //     require(msg.value >= securityDeposit[_nftID]);
    // }

    // function approve(uint256 _nftID) public {
    //     approval[_nftID][msg.sender] = true;
    // }
}