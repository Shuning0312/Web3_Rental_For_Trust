// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract RentalProperty is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // 房产信息结构
    struct Property {
        address landlord;       // 房东地址
        bool isAvailable;       // 是否可租
        uint256 rentPrice;      // 月租金
        uint256 securityDeposit;// 押金
    }
    
    // 租赁状态追踪
    mapping(uint256 => bool) public isRented;
    address public rentalEscrowAddress;
    
    // tokenId => Property
    mapping(uint256 => Property) public properties;
    
    // 房东地址 => 拥有的房产数量
    mapping(address => uint256) public landlordPropertyCount;
    
    // 事件
    event PropertyCreated(uint256 indexed tokenId, address indexed landlord);
    event PropertyListed(uint256 indexed tokenId, uint256 rentPrice, uint256 securityDeposit);
    event PropertyUnlisted(uint256 indexed tokenId);

    constructor() ERC721("Rental Property", "RENT") {}

    // 设置托管合约地址
    function setRentalEscrowAddress(address _escrowAddress) public {
        require(rentalEscrowAddress == address(0), "Escrow address already set");
        rentalEscrowAddress = _escrowAddress;
    }

    // 创建新房产NFT
    function createProperty(
        string memory tokenURI,
        uint256 rentPrice,
        uint256 securityDeposit
    ) public returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        properties[newTokenId] = Property({
            landlord: msg.sender,
            isAvailable: true,
            rentPrice: rentPrice,
            securityDeposit: securityDeposit
        });

        landlordPropertyCount[msg.sender]++;

        emit PropertyCreated(newTokenId, msg.sender);
        emit PropertyListed(newTokenId, rentPrice, securityDeposit);

        return newTokenId;
    }

    // 更新房产租金信息
    function updatePropertyPrice(
        uint256 tokenId,
        uint256 newRentPrice,
        uint256 newSecurityDeposit
    ) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        properties[tokenId].rentPrice = newRentPrice;
        properties[tokenId].securityDeposit = newSecurityDeposit;
        emit PropertyListed(tokenId, newRentPrice, newSecurityDeposit);
    }

    // 设置房产可租状态
    function setPropertyAvailability(uint256 tokenId, bool isAvailable) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        properties[tokenId].isAvailable = isAvailable;
        if (!isAvailable) {
            emit PropertyUnlisted(tokenId);
        } else {
            emit PropertyListed(
                tokenId,
                properties[tokenId].rentPrice,
                properties[tokenId].securityDeposit
            );
        }
    }

    // 设置租赁状态
    function setRentalStatus(uint256 tokenId, bool rented) public {
        require(msg.sender == rentalEscrowAddress, "Only rental escrow can call");
        isRented[tokenId] = rented;
    }

    // 查询房产信息（返回实际可用状态）
    function getPropertyInfo(uint256 tokenId) public view returns (
        address landlord,
        bool isAvailable,
        uint256 rentPrice,
        uint256 securityDeposit
    ) {
        Property storage prop = properties[tokenId];
        return (
            prop.landlord,
            prop.isAvailable && !isRented[tokenId],
            prop.rentPrice,
            prop.securityDeposit
        );
    }

    // 查询房东的所有房产
    function getLandlordProperties(address landlord) 
        public 
        view 
        returns (uint256[] memory) 
    {
        uint256 count = landlordPropertyCount[landlord];
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= _tokenIds.current(); i++) {
            if (properties[i].landlord == landlord) {
                result[index] = i;
                index++;
            }
        }
        return result;
    }
}