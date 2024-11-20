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
  async function testOnclick11(params) {
    console.log("test!!!!!!!")
  }

  return (
    <div className="home">
       <button onClick={testOnclick11}>test!!!!!!</button>
    </div>
);
}

export default App;