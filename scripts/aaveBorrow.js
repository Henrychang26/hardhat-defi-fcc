const { getNamedAccounts, ethers } = require("hardhat")
const { getWeth, AMOUNT } = require("../scripts/getWeth")

async function main() {
    //protocol treats everything as ERC20 token
    await getWeth()
    const { deployer } = await getNamedAccounts()
    // Need abi, address

    //lending pool address provider : "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5"
    //lending pool:^ (Need to create a function that will get us lending pool address)
    //compile in order to get abi
    const lendingPool = await getLendingPool(deployer)
    console.log(`LendingPool address ${lendingPool.address}`)

    //deposit need following
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" //contract address
    //approve
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer) //finish approving
    console.log("Depositing...")
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0) //refer to aave docs for all items needed to deposit
    console.log("Deposited!")
    let { availableBorrowsETH, totalDebtETH } = await getBorrowerUserData(lendingPool, deployer)
    const daiPrice = await getDaiPrice() //need to convert amount we can borrow in DAI-see below
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())
    console.log(`you can borrow ${amountDaiToBorrow} DAI`)
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    //availableBorrowETH?? what is the conversion rate on DAI?
    //create functino to call chainlink aggregator
    //borrow assets
    //how much we have borrowed, how much we have in collateral, how much we can borrow using "getUserAccountData()"
    const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer)
    await getBorrowerUserData(lendingPool, deployer) //print user data
    await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer)
    await getBorrowerUserData(lendingPool, deployer)
}

async function repay(amount, daiAddress, lendingPool, account) {
    await approveErc20(daiAddress, lendingPool.address, amount, account) //need to approve first again!
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
    await repayTx.wait(1)
    console.log("Repaid!")
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrowWei, account) {
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrow, 1, 0, account) //check "borrow()" doc
    await borrowTx.wait(1)
    console.log("You've borrowed!")
}

async function getDaiPrice() {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616E4d11A78F511299002da57A0a94577F1f4" //does not need to an account since no transfer being made, only viewing from this contract
    )
    const price = (await daiEthPriceFeed.latestRoundData())[1] //only want the "answer" from first index
    console.log(`the DAI/ETH pirce is ${price.toString()}`)
}

async function getBorrowerUserData(lendingPool, account) {
    const {
        totalCollateralETH,
        totalDebtETH,
        availableBorrowsETH
    } = await lendingPool.getUserAccountData(account)
    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`)
    console.log(`you have ${totalDebtETH} worth of ETH borrowed.`)
    console.log(`you can borrow ${availableBorrowsETH} worth of ETH.`)
    return { availableBorrowsETH, totalCollateralETH }
}

async function getLendingPool(account) {
    const lendingPoolAddressProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        account //this account we pass the deployer from "const { deployer } = await getNamedAccounts()"
    )
    const lendingPoolAddress = await lendingPoolAddressProvider.getLendingPool() //calling function from lendingPoolAddressesProvider contract
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)
    return lendingPool
}
async function approveErc20(erc20Address, spenderAddress, amountToSpend, account) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account) // gets contract abi, address and account (deployer)
    const tx = await erc20Token.approve(spenderAddress, amountToSpend) //wait for erc20Token to approve (with coresponding address and amount)
    await tx.wait(1) //wait 1 blcok confirmation
    console.log("Approved!")
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
