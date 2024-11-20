import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

// Components
import Navigation from './components/Navigation';
import Search from './components/Search';
import Home from './components/Home';

// ABIs
import RentalProperty from './artifacts/contracts/RentalProperty.sol/RentalProperty.json'
import RentalEscrow from './artifacts/contracts/RentalEscrow.sol/RentalEscrow.json'

// Config
import config from './config.json';

function App() {
  const [provider, setProvider] = useState(null)
  const [rentalProperty, setRentalProperty] = useState(null)
  const [rentalEscrow, setRentalEscrow] = useState(null)
  const [account, setAccount] = useState(null)
  const [properties, setProperties] = useState([])
  const [selectedProperty, setSelectedProperty] = useState({})
  const [toggle, setToggle] = useState(false)

  const [isLandlord, setIsLandlord] = useState(false)
  const [isTenant, setIsTenant] = useState(false)

  const loadBlockchainData = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      setProvider(provider)

      const network = await provider.getNetwork()

      // 获取租房合约实例
      const abi = RentalProperty.abi;
      const rentalProperty = new ethers.Contract(
        config[network.chainId].rentalProperty.address,
        abi,
        provider
      )
      setRentalProperty(rentalProperty)

      const rentalEscrow = new ethers.Contract(
        config[network.chainId].rentalEscrow.address,
        RentalEscrow.abi,
        provider
      )
      setRentalEscrow(rentalEscrow)

      // 加载房产列表
      // const totalSupply = await rentalProperty.tokenCount()
      const totalSupply = 1
      const properties = []

      for (let i = 1; i <= totalSupply; i++) {
        const uri = await rentalProperty.tokenURI(i)
        const response = await fetch(uri)
        const metadata = await response.json()
        
        // 获取房产详细信息
        const [owner, isAvailable, rentPrice, securityDeposit] = await rentalProperty.getPropertyInfo(i)
        
        properties.push({
          id: i,
          owner: owner,
          name: metadata.name,
          description: metadata.description,
          image: metadata.image,
          attributes: metadata.attributes, // 保留原有属性
          isAvailable: isAvailable,
          rentPrice: ethers.utils.formatEther(rentPrice),
          securityDeposit: ethers.utils.formatEther(securityDeposit)
        })
      }

      setProperties(properties)

      // 获取账户
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = ethers.utils.getAddress(accounts[0])
      setAccount(account);

      // 检查用户角色
      // const landlordCount = await rentalProperty.landlordPropertyCount(account)
      // setIsLandlord(landlordCount > 0)

      // const activeTenant = await rentalEscrow.getActiveTenant(1)
      // setIsTenant(activeTenant.toLowerCase() === account.toLowerCase())

      // 监听账户变化
      window.ethereum.on('accountsChanged', async () => {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = ethers.utils.getAddress(accounts[0])
        setAccount(account);
      })

    } catch (error) {
      console.error('Error loading blockchain data:', error)
    }
  }

  const togglePop = (property) => {
    setSelectedProperty(property)
    setToggle(!toggle)
  }

  useEffect(() => {
    loadBlockchainData()
  }, [])

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />
      <Search />

      <div className='cards__section'>
        <h3>Properties For Rent</h3>
        <hr />

        <div className='cards'>
          {properties.map((property, index) => (
            <div className='card' key={index} onClick={() => togglePop(property)}>
              <div className='card__image'>
                <img src={property.image} alt="Property" />
              </div>
              <div className='card__info'>
                <h4>{property.name}</h4>
                <p>
                  <strong>{property.rentPrice}</strong> ETH/month |
                  <strong>{property.securityDeposit}</strong> ETH deposit
                </p>
                {property.attributes && (
                  <p>
                    <strong>{property.attributes[2]?.value}</strong> bds |
                    <strong>{property.attributes[3]?.value}</strong> ba |
                    <strong>{property.attributes[4]?.value}</strong> sqft
                  </p>
                )}
                <p className='availability'>
                  {property.isAvailable ? '🟢 Available' : '🔴 Rented'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {toggle && (
        <Home 
          property={selectedProperty}
          provider={provider}
          account={account}
          rentalEscrow={rentalEscrow}
          togglePop={togglePop}
          isLandlord={isLandlord}
          isTenant={isTenant}
        />
      )}

    </div>
  );
}

export default App;