import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

// Components
import Navigation from './components/Navigation';
import Search from './components/Search';
import Home from './components/Home';

// ABIs
import RentalProperty from './abis/RentalProperty.json'
import RentalEscrow from './abis/RentalEscrow.json'

// Config
import config from './config.json';



function App() {
  const [provider, setProvider] = useState(null)
  const [rentalEscrow, setRentalEscrow] = useState(null)
  const [account, setAccount] = useState(null)
  const [rentals, setRentals] = useState([])
  const [rental, setRental] = useState({})
  const [toggle, setToggle] = useState(false);

  const loadBlockchainData = async () => {
    try {
      // 1. 检查 provider 和网络连接
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      setProvider(provider)
      console.log("Provider connected");
  
      const network = await provider.getNetwork()
      console.log("Network:", network);
  
      // 2. 检查配置
      console.log("Config:", config);
      console.log("Current network config:", config[network.chainId]);
  
      // 3. 创建合约实例
      const rentalProperty = new ethers.Contract(
        config[network.chainId].rentalProperty.address,
        RentalProperty.abi,
        provider
      );
      console.log("RentalProperty contract instance created");
  
      // 4. 获取第一个房产的信息（因为我们知道至少有一个房产）
      try {
        const [landlord, isAvailable, rentPrice, securityDeposit] = await rentalProperty.getPropertyInfo(1);
        console.log("Property #1 info:", {
          landlord,
          isAvailable,
          rentPrice: ethers.utils.formatEther(rentPrice),
          securityDeposit: ethers.utils.formatEther(securityDeposit)
        });
  
        // 5. 获取房产URI
        const uri = await rentalProperty.tokenURI(1);
        console.log("Property #1 URI:", uri);
  
        // 6. 获取元数据
        const response = await fetch(uri);
        const metadata = await response.json();
        console.log("Property #1 metadata:", metadata);
  
        // 7. 创建房产对象
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
  
        setRentals([rental]);
        console.log("Rental state updated:", rental);
  
      } catch (error) {
        console.error("Error loading property info:", error);
      }
  
      // 8. 设置Escrow合约
      const rentalEscrow = new ethers.Contract(
        config[network.chainId].rentalEscrow.address,
        RentalEscrow.abi,
        provider
      );
      setRentalEscrow(rentalEscrow);
      console.log("RentalEscrow contract instance created");
  
    } catch (error) {
      console.error("Error loading blockchain data:", error);
    }
  };
  

  useEffect(() => {
    loadBlockchainData()
  }, [])

  const togglePop = (rental) => {
    setRental(rental)
    toggle ? setToggle(false) : setToggle(true);
  }

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />
      <Search />

      <div className='cards__section'>
        <h3>Home for you ~</h3>
        <hr />

        {rentals.length > 0 ? (
          <div className='cards'>
            {rentals.map((rental, index) => {
              console.log("Rendering rental:", rental); // 调试日志
              
              // 查找具体的属性值
              const bedrooms = rental.attributes.find(attr => attr.trait_type === "Bedrooms")?.value;
              const bathrooms = rental.attributes.find(attr => attr.trait_type === "Bathrooms")?.value;
              const squareFeet = rental.attributes.find(attr => attr.trait_type === "Square Feet")?.value;
              
              return (
                <div className='card' key={index} onClick={() => togglePop(rental)}>
                  <div className='card__image'>
                    <img 
                      src={rental.image} 
                      alt="Property"
                      onError={(e) => {
                        console.error("Image load error:", e);
                        e.target.src = 'placeholder.jpg'; // 添加一个默认图片
                      }}
                    />
                  </div>
                  <div className='card__info'>
                    <h4>{ethers.utils.formatEther(rental.rentPrice)} ETH/month</h4>
                    <p>Security Deposit: {ethers.utils.formatEther(rental.securityDeposit)} ETH</p>
                    <p>
                      <strong>{bedrooms}</strong> bds |
                      <strong>{bathrooms}</strong> ba |
                      <strong>{squareFeet}</strong> sqft
                    </p>
                    <p>{rental.address}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="loading">
            <p>Loading properties...</p>
            <p>Make sure you are connected to the correct network</p>
          </div>
        )}
      </div>

      {toggle && (
        <Home 
          rental={rental} 
          provider={provider} 
          account={account} 
          rentalEscrow={rentalEscrow} 
          togglePop={togglePop} 
        />
      )}
    </div>
  );
}

export default App;