import { ethers } from 'ethers';
import logo from '../assets/logo.svg';

const Navigation = ({ account, setAccount }) => {
   const connectHandler = async () => {
       const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
       const account = ethers.utils.getAddress(accounts[0])
       setAccount(account);
   }

   return (
       <nav>
           <ul className='nav__links'>
               {/* 根据租赁系统的需求修改导航项 */}
               <li><a href="#">Available</a></li>
               <li><a href="#">My Properties</a></li> 
               <li><a href="#">My Rentals</a></li>
           </ul>

           <div className='nav__brand'>
               <img src={logo} alt="Logo" />
               <h1>RentChain</h1> {/* 修改项目名称 */}
           </div>

           {account ? (
               <button
                   type="button"
                   className='nav__connect'
               >
                   {account.slice(0, 6) + '...' + account.slice(38, 42)}
               </button>
           ) : (
               <button
                   type="button"
                   className='nav__connect'
                   onClick={connectHandler}
               >
                   Connect
               </button>
           )}
       </nav>
   );
}

export default Navigation;