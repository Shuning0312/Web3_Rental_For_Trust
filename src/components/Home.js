import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import close from '../assets/close.svg';
import { getAddress } from 'ethers/lib/utils';

const Home = ({ property, provider, account, rentalEscrow, togglePop }) => {
    // 状态变量
    const [isRented, setIsRented] = useState(false)            // 当前用户是否租了
    const [isPropertyRented, setIsPropertyRented] = useState(false)  // 房产是否被租出结束
    const [currentTenant, setCurrentTenant] = useState(null)   // 当前租客地址
    const [currentLandlord, setCurrentLandlord] = useState(null) // 房东地址
    const [owner, setOwner] = useState(null)

    const [showContactModal, setShowContactModal] = useState(false) // 控制联系模态框
    const [loading, setLoading] = useState(true)  // 加载状态
    const [error, setError] = useState(null)      // 错误状态
    const [rentalDetails, setRentalDetails] = useState({      // 租赁详情
        rentPrice: null,
        securityDeposit: null,
        startDate: null,
        endDate: null
    })

    // 检查角色
    const isCurrentUserTenant = currentTenant && account && currentTenant.toLowerCase() === account.toLowerCase()
    const isCurrentUserLandlord = currentLandlord && account && currentLandlord.toLowerCase() === account.toLowerCase()

    // 获取详细信息
    const fetchDetails = async () => {
        try {
            setLoading(true)
            setError(null)
            
            // 获取租客地址和租赁状态
            const tenant = await rentalEscrow.tenant(property.id)
            console.log("当前房屋获取租客地址为：", tenant)
            setCurrentTenant(tenant)

             // 获取房东地址
             const landlord = await rentalEscrow.landlord()
             console.log("获取房东地址为：", landlord)
             setCurrentLandlord(landlord)

             const isPropertyRented = await rentalEscrow.approval(property.id, landlord)
             setIsPropertyRented(isPropertyRented)

        } catch (error) {
            console.error("Error fetching details:", error)
            setError("Error fetching property details")
        } finally {
            setLoading(false)
        }
    }

    const fetchOwner = async () => {
        if (await rentalEscrow.isListed(property.id)) return

        const owner = await rentalEscrow.buyer(property.id)
        setOwner(owner)
    }

    const tenantHandle = async () => {
        console.log("租客处理")

        // 获取当前 provider
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        // 请求用户连接钱包
        await provider.send("eth_requestAccounts", []);
        // 获取当前 signer
        const signer = provider.getSigner()
        console.log("signer OK: ", signer.getAddress())

        // 从属性中找到租金和押金
            const rentAttribute = property.attributes.find(
                attr => attr.trait_type === "Monthly Rent" || 
                       attr.trait_type === "Rental Price" ||
                       attr.trait_type === "Price"
            );
            console.log(rentAttribute)
            
            const depositAttribute = property.attributes.find(
                attr => attr.trait_type === "Security Deposit" || 
                       attr.trait_type === "Deposit"
            );

            // 获取租金和押金
            const rentPriceStr = rentAttribute.value.toString();
            const securityDepositStr = depositAttribute.value.toString();

            const rentPrice = ethers.utils.parseEther(rentPriceStr)
            const securityDeposit = ethers.utils.parseEther(securityDepositStr)
            const totalAmount = rentPrice.add(securityDeposit)
            console.log("获取租金和押金OK: ", rentPrice, securityDeposit,totalAmount)

        const landlord = rentalEscrow.landlord()    
        console.log("交易前记录一下房东地址：", landlord)
        // const signer = provider.getSigner();
        console.log("记录一下当前访客地址 signer: ", signer.getAddress() )
        let transaction = await rentalEscrow.connect(signer).startRental(property.id, 1)
        console.log("发送交易成功")
        await transaction.wait()

        transaction = await rentalEscrow.connect(signer).approve(property.id)
        await transaction.wait()

        setIsRented(true)
    }

    const landlordHandle = async () => {
        console.log("房东处理")
        const signer = await provider.getSigner()

        let transaction = await rentalEscrow.connect(signer).approve(property.id)
        await transaction.wait()

        transaction = await rentalEscrow.connect(signer).endRental(property.id)
        await transaction.wait

        setIsPropertyRented(true)
        
    }



    // // 租赁处理
    // const handleRent = async () => {
    //     try {
    //         const signer = await provider.getSigner()

    //         console.log("开始进行租赁处理：")

    //         // 从属性中找到租金和押金
    //         const rentAttribute = property.attributes.find(
    //             attr => attr.trait_type === "Monthly Rent" || 
    //                    attr.trait_type === "Rental Price" ||
    //                    attr.trait_type === "Price"
    //         );
    //         console.log(rentAttribute)
            
    //         const depositAttribute = property.attributes.find(
    //             attr => attr.trait_type === "Security Deposit" || 
    //                    attr.trait_type === "Deposit"
    //         );

    //         // 获取租金和押金
    //         // const rentalPriceStr = property.attribute[0].value.toString()
    //         // const securityDepositStr = property.attribute[1].value.toString()

    //         const rentPriceStr = rentAttribute.value.toString();
    //         const securityDepositStr = depositAttribute.value.toString();

    //         const rentPrice = ethers.utils.parseEther(rentPriceStr)
    //         const securityDeposit = ethers.utils.parseEther(securityDepositStr)
    //         const totalAmount = rentPrice.add(securityDeposit)
    //         console.log("获取租金和押金OK: ", rentPrice, securityDeposit,totalAmount)
            
    //         // 创建租约
    //         console.log("创建租约")
    //         const transaction = await rentalEscrow.connect(signer).startRental(
    //             property.id,
    //             3,
    //             {
    //                 value: totalAmount,
    //                 gasLimit: 300000
    //             }
    //         )
            
    //         await transaction.wait()
    //         await fetchDetails()

    //         // Buyer approves...
    //         transaction = await rentalEscrow.connect(signer).approve(property.id)
    //         await transaction.wait()

    //         setIsRented(true)
            
    //     } catch (error) {
    //         console.error("Error renting property:", error)
    //         setError("Error renting property")
    //     }
    // }

    // 结束租约
    // const handleEndRental = async () => {
    //     try {
    //         const signer = await provider.getSigner()
    //         const transaction = await rentalEscrow.connect(signer).endRental(property.id)
    //         await transaction.wait()
    //         await fetchDetails()
    //     } catch (error) {
    //         console.error("Error ending rental:", error)
    //         setError("Error ending rental")
    //     }
    // }

    // 联系房东/中介
    const ContactModal = () => {
        return (
            <div className="contact-modal">
                <div className="contact-modal__content">
                    <div className="contact-modal__header">
                        <h2>Contact Information</h2>
                        <button onClick={() => setShowContactModal(false)} className="contact-modal__close">
                            <img src={close} alt="Close" />
                        </button>
                    </div>
                    
                    <div className="contact-modal__body">
                        <div className="contact-modal__info">
                            <h3>Property Details</h3>
                            <p>{property.name}</p>
                            <p>ID: {property.id}</p>
                            <p>Monthly Rent: {property.attributes[2].value} ETH</p>
                        </div>

                        <div className="contact-modal__agent">
                            <h3>Contact Person</h3>
                            <p><strong>Name:</strong> John Doe</p>
                            <p><strong>Phone:</strong> (555) 123-4567</p>
                            <p><strong>Email:</strong> contact@rental.com</p>
                        </div>

                        <div className="contact-modal__buttons">
                            <button onClick={() => window.location.href = 'tel:5551234567'}>
                                Call Now
                            </button>
                            <button onClick={() => window.location.href = 'mailto:contact@rental.com'}>
                                Send Email
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // 加载数据
    useEffect(() => {
        fetchDetails()
        fetchOwner()
    }, [account, property.id, isPropertyRented])

    if (loading) return <div className="home__loading">Loading...</div>
    if (error) return <div className="home__error">Error: {error}</div>

    // return (
    //     <div className="home">
    //         <div className='home__details'>
    //             <div className="home__image">
    //                 <img src={property.image} alt="Property" />
    //             </div>

    //             <div className="home__overview">
    //                 <h1>{property.name}</h1>
                    
    //                 {/* 基本信息 */}
    //                 <p>
    //                     <strong>{property.attributes[6].value}</strong> bds |
    //                     <strong>{property.attributes[7].value}</strong> ba |
    //                     <strong>{property.attributes[4].value}</strong> sqft
    //                 </p>

    //                 {/* 租赁价格信息 */}
    //                 <div className="rental__info">
    //                     <h2>{property.attributes[2].value} ETH/month</h2>
    //                     <p>Security Deposit: {property.attributes[3].value} ETH</p>
                        
    //                     {/* 租赁状态 */}
    //                     <p className={`status ${isPropertyRented ? 'rented' : 'available'}`}>
    //                         Status: {isPropertyRented ? '🔴 Rented' : '🟢 Available'}
    //                     </p>
                        
    //                     {/* 租期信息 */}
    //                     {isPropertyRented && (
    //                         <div className="rental__period">
    //                             <p>Tenant: {currentTenant.slice(0, 6) + '...' + currentTenant.slice(38, 42)}</p>
    //                             <p>Start: {rentalDetails.startDate?.toLocaleDateString()}</p>
    //                             <p>End: {rentalDetails.endDate?.toLocaleDateString()}</p>
    //                         </div>
    //                     )}
    //                 </div>

    //                 {/* 操作按钮 */}
    //                 <div className="rental__actions">
    //                     {!isPropertyRented && !isCurrentUserLandlord && (
    //                         <button 
    //                             className='home__rent'
    //                             onClick={tenantHandle}
    //                         >
    //                             Rent Now
    //                         </button>
    //                     )}

    //                     {isPropertyRented && (isCurrentUserLandlord || isCurrentUserTenant) && (
    //                         <button 
    //                             className='home__end-rental'
    //                             onClick={landlordHandle}
    //                         >
    //                             End Rental
    //                         </button>
    //                     )}

    //                     <button 
    //                         className='home__contact'
    //                         onClick={() => setShowContactModal(true)}
    //                     >
    //                         Contact agent
    //                     </button>
    //                 </div>

    //                 <hr />

    //                 <h2>Overview</h2>
    //                 <p>{property.description}</p>

    //                 <hr />

    //                 <h2>Facts and features</h2>
    //                 <ul>
    //                     {property.attributes.map((attribute, index) => (
    //                         <li key={index}>
    //                             <strong>{attribute.trait_type}</strong> : {attribute.value}
    //                         </li>
    //                     ))}
    //                 </ul>
    //             </div>

    //             <button onClick={togglePop} className="home__close">
    //                 <img src={close} alt="Close" />
    //             </button>
    //         </div>

    //         {/* 联系模态框 */}
    //         {showContactModal && <ContactModal />}
    //     </div>
    // );

    return (
        <div className="home">
            <div className='home__details'>
                <div className="home__image">
                    <img src={property.image} alt="Home" />
                </div>
                <div className="home__overview">
                    <h1>{property.name}</h1>
                    <p>
                        <strong>{property.attributes[6].value}</strong> bds |
                        <strong>{property.attributes[7].value}</strong> ba |
                        <strong>{property.attributes[4].value}</strong> sqft
                    </p>
                    <p>{property.address}</p>

                    <h2>{property.attributes[0].value} ETH</h2>
                    {owner ? (
                        <div className='home__owned'>
                            Owned by {owner.slice(0, 6) + '...' + owner.slice(38, 42)}
                        </div>
                    ) : (
                        <div>
                            {/* {(isCurrentUserLandlord) ? (
                                <button className='home__renting' onClick={landlordHandle} disabled={isPropertyRented}>
                                    Approve & rentalFinish
                                </button>
                            ) (isPropertyRented) : (
                                <button className='home__buy' onClick={tenantHandle} disabled={isRented}>
                                    Rent
                                </button>
                            )} */}

                            
                                <button className='home__renting' onClick={landlordHandle} disabled={isPropertyRented}>
                                    Approve & rentalFinish
                                </button>
                
                                <button className='home__rental' onClick={tenantHandle} disabled={isRented}>
                                    Rent
                                </button>

                                
                            

                            <button className='home__contact' onClick={() => setShowContactModal(true)}>
                                Contact agent
                            </button>
                        </div>
                    )}

                <hr />

                <h2>Overview</h2>

                <p>
                    {property.description}
                </p>

                <hr />

                <h2>Facts and features</h2>

                <ul>
                    {property.attributes.map((attribute, index) => (
                        <li key={index}><strong>{attribute.trait_type}</strong> : {attribute.value}</li>
                    ))}
                </ul>
            </div>


            <button onClick={togglePop} className="home__close">
                <img src={close} alt="Close" />
            </button>
        </div>
    </div >

    );
}

export default Home;