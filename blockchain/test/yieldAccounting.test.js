const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Architecture 1 Contracts", function () {
  async function fixture() {
    const [owner, processor] = await ethers.getSigners();
    const Oracle = await ethers.getContractFactory("YieldStandardsOracle");
    const oracle = await Oracle.deploy(owner.address);
    await oracle.waitForDeployment();

    const Swap = await ethers.getContractFactory("YieldAccountingSwap");
    const swap = await Swap.deploy(await oracle.getAddress(), owner.address);
    await swap.waitForDeployment();

    await (await oracle.setRange("grain_cleaning", 8200, 9300, "test")).wait();
    await (await swap.registerProcessor(processor.address)).wait();

    return { owner, processor, oracle, swap };
  }

  it("accepts in-range yield", async function () {
    const { owner, processor, swap } = await fixture();
    const inputTokenId = ethers.id("input_1");
    await (await swap.connect(owner).mintInputToken(inputTokenId, processor.address, 1000)).wait();

    const tx = await swap.connect(processor).processSwap(inputTokenId, "grain_cleaning", 1000, 900);
    await tx.wait();
  });

  it("reverts above max yield", async function () {
    const { owner, processor, swap } = await fixture();
    const inputTokenId = ethers.id("input_2");
    await (await swap.connect(owner).mintInputToken(inputTokenId, processor.address, 1000)).wait();

    await expect(
      swap.connect(processor).processSwap(inputTokenId, "grain_cleaning", 1000, 980)
    ).to.be.revertedWithCustomError(swap, "YieldAboveMaximum");
  });
});
