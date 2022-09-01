const { getNamedAccounts, ethers } = require("hardhat")

const AMOUNT = ethers.utils.parseEther("0.02")

async function getWeth() {
    const { deployer } = await getNamedAccounts() //need an account
    //call the "deposite" function on the weth contract
    // need abi, contract address
    //0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
    const iWeth = await ethers.getContractAt(
        //get contract address
        "IWeth",
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        deployer
    )
    const tx = await iWeth.deposit({ value: AMOUNT }) //deposit the amount
    await tx.wait(1) //waits 1 block
    const wethBalance = await iWeth.balanceOf(deployer) //shows balance
    console.log(`Got ${wethBalance.toString()} WETH`) //console shows total amount deposited
}

module.exports = { getWeth, AMOUNT } //export function inside this script
