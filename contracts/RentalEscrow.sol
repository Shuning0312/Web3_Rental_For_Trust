// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

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
    IRentalProperty public immutable rentalProperty;
    
    // 租赁信息结构
    struct Rental {
        address tenant;         // 租客地址
        uint256 startTime;      // 租期开始时间
        uint256 endTime;        // 租期结束时间
        uint256 rentAmount;     // 月租金
        uint256 securityDeposit;// 押金
        bool active;            // 是否处于激活状态
        bool depositReturned;   // 押金是否已退还
    }

    // tokenId => Rental
    mapping(uint256 => Rental) public rentals;
    
    // 租客地址 => 租赁的房产列表
    mapping(address => uint256[]) public tenantRentals;
    
    // 事件
    event RentalCreated(
        uint256 indexed tokenId,
        address indexed landlord,
        address indexed tenant,
        uint256 startTime,
        uint256 endTime
    );
    event RentPaid(uint256 indexed tokenId, address indexed tenant, uint256 amount);
    event RentalEnded(uint256 indexed tokenId, address indexed tenant);
    event SecurityDepositReturned(uint256 indexed tokenId, address indexed tenant);

    constructor(address _rentalProperty) {
        rentalProperty = IRentalProperty(_rentalProperty);
    }

    // 创建租赁合约
    function createRental(uint256 tokenId, uint256 duration) public payable {
        (
            address landlord,
            bool isAvailable,
            uint256 rentPrice,
            uint256 securityDeposit
        ) = rentalProperty.getPropertyInfo(tokenId);

        require(isAvailable, "Property not available");
        require(msg.value >= rentPrice + securityDeposit, "Insufficient payment");

        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + (duration * 30 days);

        rentals[tokenId] = Rental({
            tenant: msg.sender,
            startTime: startTime,
            endTime: endTime,
            rentAmount: rentPrice,
            securityDeposit: securityDeposit,
            active: true,
            depositReturned: false
        });

        tenantRentals[msg.sender].push(tokenId);
        
        // 更新租赁状态
        rentalProperty.setRentalStatus(tokenId, true);

        // 转移首月租金给房东
        payable(landlord).transfer(rentPrice);

        emit RentalCreated(tokenId, landlord, msg.sender, startTime, endTime);
    }

    // 支付月租
    function payRent(uint256 tokenId) public payable {
        Rental storage rental = rentals[tokenId];
        require(rental.active, "Rental not active");
        require(msg.sender == rental.tenant, "Not the tenant");
        require(msg.value >= rental.rentAmount, "Insufficient rent payment");

        (address landlord,,,) = rentalProperty.getPropertyInfo(tokenId);
        payable(landlord).transfer(msg.value);

        emit RentPaid(tokenId, msg.sender, msg.value);
    }

    // 结束租约并退还押金
    function endRental(uint256 tokenId) public {
        Rental storage rental = rentals[tokenId];
        (address landlord,,,) = rentalProperty.getPropertyInfo(tokenId);
        
        require(msg.sender == landlord || msg.sender == rental.tenant, "Unauthorized");
        require(rental.active, "Rental not active");
        require(block.timestamp >= rental.endTime, "Rental period not ended");

        rental.active = false;
        payable(rental.tenant).transfer(rental.securityDeposit);
        rental.depositReturned = true;

        // 更新租赁状态
        rentalProperty.setRentalStatus(tokenId, false);

        emit RentalEnded(tokenId, rental.tenant);
        emit SecurityDepositReturned(tokenId, rental.tenant);
    }

    // 获取租客的所有租赁
    function getTenantRentals(address tenant) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return tenantRentals[tenant];
    }

    // 检查租约状态
    function checkRentalStatus(uint256 tokenId) 
        public 
        view 
        returns (
            bool isActive,
            uint256 startTime,
            uint256 endTime,
            uint256 remainingTime
        ) 
    {
        Rental memory rental = rentals[tokenId];
        return (
            rental.active,
            rental.startTime,
            rental.endTime,
            rental.endTime > block.timestamp ? 
                rental.endTime - block.timestamp : 0
        );
    }

    // 接收ETH
    receive() external payable {}
}