const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  const Oracle = await hre.ethers.getContractFactory("YieldStandardsOracle");
  const oracle = await Oracle.deploy(deployer.address);
  await oracle.waitForDeployment();

  const Swap = await hre.ethers.getContractFactory("YieldAccountingSwap");
  const swap = await Swap.deploy(await oracle.getAddress(), deployer.address);
  await swap.waitForDeployment();

  await (await oracle.setRange("grain_cleaning", 8200, 9300, "Initial baseline")).wait();
  await (await oracle.setRange("fruit_sorting", 7000, 8800, "Initial baseline")).wait();

  console.log("YieldStandardsOracle:", await oracle.getAddress());
  console.log("YieldAccountingSwap:", await swap.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
