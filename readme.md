

1.  安装依赖 `npm install`

2. 合约测试 `npx hardhat test  `

3. 一个终端页面启动测试node；另一个终端部署合约。

合约部署成功后，要更新abi配置文件 ➕ config文件中的合约地址）

```bash
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

4. 渲染前端页面 `npm run start`
5. 用测试节点的私钥，连接MetaMask测试网（根据端口情况新建测试链）