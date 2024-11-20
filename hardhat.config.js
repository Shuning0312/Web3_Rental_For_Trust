// require("@nomicfoundation/hardhat-toolbox");

// const { artifacts } = require("hardhat");

// /** @type import('hardhat/config').HardhatUserConfig */
// module.exports = {
//   solidity: "0.8.17",
// };

require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.17",
  paths: {
    artifacts: "./src/artifacts", // 默认 artifacts 路径
  }
}
;