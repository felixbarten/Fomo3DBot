'use_strict';
const config = require('./config');
const Web3 = require('web3');
const PlayerBook = require('./playerbook.js');
const Utils = require('./utils.js');
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.nodeWS));
const infura = new Web3(new Web3.providers.HttpProvider(config.fallbackNode));

//Contract needs correct ABI to handle requests.
contractAbi = config.contractABI;
//Address to contract
var contractAddr = config.contractAddress;
// set default account
//web3.eth.defaultAccount = web3.eth.accounts[2];
//create contract variable
var GameContract = new web3.eth.Contract(contractAbi, contractAddr);

var blocks = [];
var blocksToSave = 20;
// 0,01 ether.
var buyin = 10000000000000000;
var transactionNonce = 0;
var accountNonce = 0;
var transactionSent = false;
var transaction = null;
var transactionConfirmed = false;
var transactions = [];

function init() {

    getNonce(config.sniper.walletAddr).then(result => {
        accountNonce = result;
    });
    /*
    * have to manually create GETH accounts from private key. Then set to default.
    */
    web3.eth.personal.unlockAccount(config.sniper.walletAddr, config.sniper.passphrase, 600)
	.then((response) => {
		Utils.print(` Account unlock was successful: ${response}`);
	}).catch((error) => {
		Utils.print(`Error during account unlock: ${error}`);
    });
    web3.eth.defaultAccount = web3.eth.personal[0];
    console.log(`default account is: ${web3.eth.defaultAccount}`)

}

function snipeICO(timeleft, roundNum) {
    // unlock acc

    let avgBlockTime = calcAVGBlockTime();
    let gasPriceObj = 0;
    let gasBN = 0;

    getGasPrice().then(result => {
        gasPriceObj = result;
        gasBN = web3.utils.toBN(result);

        // wrap into gasPrice result block to enforce syncronous.
        Utils.debug(`Result obj: ${gasPriceObj} toBN: ${gasBN}`);

        let gasGwei = web3.utils.fromWei(gasBN, 'gwei');

        Utils.debug("About to check ICO constraints");
        Utils.debug(`Block time: ${avgBlockTime} gas price: ${gasGwei} time on ICO phase: ${timeleft}`);

        // have to do some conversion magic or comparisons will fail.
        let gasCheck = Number(gasGwei) <= Number(config.sniper.highGas);
        let blockTimeCheck = Number(avgBlockTime) <  Number(config.sniper.highBlockTime);
        let timeCheck = timeleft >= 30;
        Utils.debug(`Time Check: ${timeCheck}, Gas check: ${gasCheck}, Block time check: ${blockTimeCheck}`);

        if (timeCheck && blockTimeCheck && gasCheck && !transactionSent) {
            init();
            // this call will waste real money.
            buyICO(roundNum);
        } else {
            if (!transactionSent) {
                if (!timeCheck) Utils.print(`Transaction aborted due to time on contract: ${timeleft}`);
                if(!blockTimeCheck) Utils.print(`Transaction aborted due to block times being erratic: ${avgBlockTime}`);
                if(!gasCheck) Utils.print(`Transaction aborted due to high network gas price: ${gasGwei} gwei`);
            }
        }

        if (transactionSent && timeleft <= 5 && !transactionConfirmed) {
            init();
            cancelTransaction(roundNum);
        }
    });
}

function calcAVGBlockTime() {
    let blockTime = NaN;
    let avgBlockTime = 0;
    if (blocks.length > 2) {
         blockTime = (blocks[blocks.length -1].timestamp - blocks[0].timestamp);
         avgBlockTime = blockTime / blocks.length;
    }
    return avgBlockTime;
}

function addBlock(block) {

    if (blocks.length > blocksToSave) {
        removeBlocks();
    }
    if (block === undefined) {
        getLastBlock().then(result => {
            blocks.push(result);
        });
    } else {
        blocks.push(block);
    }
}

function removeBlocks() {
    // prune blocks until blocks back to normal size. 
    for (let block of blocks) {
        if (blocks.length > blocksToSave) {
            removeBlock();
        }
    }
}

function removeBlock() {
    // fifo.
    blocks.splice(0,1);
}

async function isWalletUnlocked() {
    var accounts = web3.eth.personal.getAccounts();

    accounts = await accounts; 
    if (accounts.length === 0) {
        return false;
    } else if(accounts.length >= 1) {
        return true;
    }
    Utils.print("Could not determine state of accounts");
    Utils.debug(accounts);
    return false;
}

function buyICO(roundNum) {
    isWalletUnlocked().then(result => {
        if(result === false) {
            Utils.print(`Wallet is not unlocked....`);
            init();
        }
    });
    Utils.print(`Attempting to send buy transaction to contract`);
    // sets up transaction with affiliate address and snek lyfe. 
    var transactionPromise = GameContract.methods.buyXaddr(config.sniper.affiliateAddress, 2).send({
        from: config.sniper.walletAddr,
        gasPrice: web3.utils.toWei('20', 'gwei'),
        gas: 360000,
        value: buyin
    })
    .on('transactionHash', function(hash){
        Utils.print(`Transaction sent: ${hash}`);
        transactionSent = true;
    })
    .on('confirmation', function(confirmationNumber, receipt){
        Utils.print(`Transaction is confirmed: ${confirmationNumber} times`);
        if(confirmationNumber > 1) {
            // after transaction has been mined at least once no point in sending a cancel after it.
            transactionConfirmed = true;
        }
    })
    .on('receipt', function(receipt){
        Console.log(receipt);
        transaction = receipt;
        var ico = checkICO();
        if(ico.succes) {
            Utils.print(`We GOT IN the ICO! Bough ${ico.keys} for an average of ${ico.paid}`);
        } else {
            Utils.print(`We DID NOT get in ICO!?@#@%@$%@%@#@#!@#^#%@# ${ico.paid} ICO was ${ico.icoPrice} `);
        }
    })
    .on('error', function(error) {
        Utils.print(`Error occurred while sending transaction:" ${error}`);
        Utils.error(error, "CRITICAL");
        Utils.print(error);
    });

    transactions.push({
        roundID: roundNum,
        type: 'buy',
        txhash: ""
    });

    Utils.debug(transaction);
    Utils.print(`Transaction sent: ${transaction}.`);
}

function checkICO() {
    let succes = false;
    var keys = 0;
    getBoughtKeys.then(result => {
        keys = result[2] /1000000000000000000;
    });
    let avgPrice = buyin / keys;

    let icoPrice = getICOPrice();
    if ( (icoPrice * 1.1) > avgPrice){
        succes = true;
    }

    return {
        succes: succes,
        icoPrice:  Utils.weiToETH(icoPrice),
        paid: Utils.weiToETH(avgPrice),
        keys: keys  
    };
}

/**
 * Performs a cancelling transaction by sending to own address with a high gas price. 
 * *important* the nonce needs to be the same one as the transaction we're trying to get rid off. 
 * Otherwise both transactions will succeed 
 */
async function cancelTransaction(roundNum){
    try { 
        let txhash = '';
        Utils.print(`Nonce is:  ${accountNonce}`);
        var transaction = web3.eth.sendTransaction({
            from: config.sniper.walletAddr,
            to: config.sniper.walletAddr,
            value: 0,
            gas: 22000,
            gasPrice: web3.utils.toWei('50', 'gwei'),
            nonce: accountNonce
        })
        .on('transactionHash', function(hash) {
            Utils.insertDividerLine();
            Utils.print(`Sent Cancelling transaction: ${hash}`);
            Utils.insertDividerLine();
            txhash = hash;
        })
        .on("receipt", function(receipt) {
            Utils.print(receipt);
            Utils.debug(receipt);
        })
        .on("confirm", function(confirm){
            Utils.print(`CONFIRMED CANCEL TRANSACTION ${confirm}`);
        })
        .on("error", function(error) {
            Utils.error(error);
            Utils.print("error while trying to send cancel transaction");
        });

        transactions.push({
            roundID: roundNum,
            type: 'cancel',
            txhash: txhash
        });
        return await transaction;

    } catch (e) {
        Utils.print(e);
        Utils.error(e, "CRITICAL");
    }

}

async function transfer(addr) {
    try {
        var transaction = web3.eth.sendTransaction({
            from: config.sniper.walletAddr,
            to: config.sniper.debugging.transferAddr,
            value: buyin,
            gas: 21000,
            gasPrice: web3.utils.toWei('3', 'gwei')
        })
        .on('transactionHash', function(hash){
            Utils.insertDividerLine();
            Utils.print(`Transaction sent: ${hash}`);
            Utils.insertDividerLine();
        })
        .on('confirmation', function(confirmationNumber, receipt){
            Utils.print(`Transaction is confirmed: ${confirmationNumber} times`);
        })
        .on('receipt', function(receipt){
            Utils.print(receipt);
            transaction = receipt;
            transactionConfirmed = true;
        })
        .on('error', function(error) {
            Utils.error(error, "CRITICAL");
            Utils.print(error);
        });
        return await transaction;
    } catch (e) {
        Utils.print(e);
        Utils.error(e, "CRITICAL");
    }
}

async function withdrawCTR(amount){
    try {
        var withdrawTransaction =  GameContract.methods.withdraw().send({
            from: config.sniper.walletAddr,
            gasPrice: web3.utils.toWei('3', 'gwei'),
            gas: 150000,
            value: 0
        })
        .on('transactionHash', function(hash){
            Utils.insertDividerLine();
            Utils.print(`Withdraw sent: ${hash} for ${amount} ETH`);
            Utils.insertDividerLine();
        })
        .on('confirmation', function(confirmationNumber, receipt){
            Utils.print(`Withdraw is confirmed: ${confirmationNumber} times`);
        })
        .on('receipt', function(receipt){
            Utils.print(receipt);
            transaction = receipt;
            transactionConfirmed = true;
        })
        .on('error', function(error) {
            Utils.error(error, "CRITICAL");
            Utils.print(error);
        });
        return await withdrawTransaction();
    } catch (e) {
        Utils.print(e);
        Utils.error(e, "CRITICAL");
    }
}

//#region getters
async function getNonce() {
    try{
        return await web3.eth.getTransactionCount(config.sniper.walletAddr);
    } catch(e) {
        Utils.error("Couldn't retrieve block.", "ERR");
    } 
}


// TODO
async function getVaultBalance() {
    try{
        playerInfo = await  web3.eth.getPlayerInfoByAddress(config.sniper.walletAddr);
        return (playerInfo[3] + playerInfo[4] + playerInfo[5]);
    } catch(e) {
        Utils.error("Couldn't retrieve block.", "ERR");
    } 
}

async function getBalance() {
    try{
        return await web3.eth.getBalance(config.sniper.walletAddr);
    } catch(e) {
        Utils.error("Couldn't retrieve block.", "ERR");
    } 
}

async function getLastBlock() {
    try {
        var blockPromise = null;
        getCurrentBlockNum().then(result => {
            blockPromise = web3.eth.getBlock(result, false);
        });
        return await blockPromise;
    } catch(e) {
        Utils.error("Couldn't retrieve block.", "ERR");
    } 
}

async function getGasPrice(){ 
    var result = null;
    var gasResult = 0;
    try {
        Utils.debug("Gas price debug");
        gasResult = await web3.eth.getGasPrice();
        Utils.debug(gasResult);
        result = gasResult;

    } catch(e) {
        Utils.error("Couldn't retrieve gas price.", "ERR");
    }

    try {
        gasPrice =  web3.utils.toBN(result);
        Utils.debug(`Converted to BigNum: ${gasPrice}`);
    } catch(e) {
        Utils.error(`Big number conversion failed ${e}`);
    }
    return gasPrice;
}

async function getCurrentBlockNum() {
    try {
        return await web3.eth.getBlockNumber();
    } catch(e) {
        Utils.error("Couldn't retrieve block number.", "ERR");
    } 
}

// TODO
async function getBoughtKeys() {
    try {
        return await web3.eth.getPlayerInfoByAddress(config.sniper.walletAddr);
    } catch(e) {
        Utils.error("Couldn't retrieve ICO key price.", "ERR");
    }
}

async function getICOPrice(round) {
    try {
        return await web3.eth.calcAverageICOPhaseKeyPrice(round);
    } catch(e) {
        Utils.error("Couldn't retrieve ICO key price.", "ERR");
    }
}
//#endregion


function listMethods(){
    Utils.print(GameContract.methods);
}

function updateBlockInformation(block) {
    addBlock(block);
}

function displayBlockTime() {
    Utils.print(`Current average block time over last 20 blocks is: ${calcAVGBlockTime()} seconds`);
}

/**
 * Displays information about our current wallet.
 */
function displayWallet() {
    let balance = getBalance(web3.eth.defaultAccount);
    Utils.insertDividerLine();
    Utils.print(`Current bot wallet holds: ${balance} ETH. Can participate in: ${balance/buyin} ICO's.`);
    Utils.insertDividerLine();

}

function displayPotResult(vault) {
    let winnings = vault;
    let affiliateBonus = 0;
    // 10% aff.
    if (config.sniper.useAffiliate){
        affiliateBonus = +buyin * +0.1;
    }
    let JUST =  winnings + affiliateBonus  < buyin; 
    let profitOrLoss =  web3.utils.fromWei(winnings + affiliateBonus - buyin, 'ether');

    if (JUST) {
        Utils.insertDividerLine();
        Utils.print(`We just got MOTHERF#%king JUSTed! \n Buyin was: ${buyin} available winnings are ${winnings} with affiliate bonus losses are ${profitOrLoss} ETH without gas.`);
        Utils.insertDividerLine();
    } else {
        Utils.insertDividerLine();
        Utils.print(`Buyin was: ${buyin} available winnings are ${winnings} with affiliate bonus winnings are ${profitOrLoss} ETH without gas.`);
        Utils.insertDividerLine();  
    }
    // register round maybe write to file idk.
}

function withdrawOrPostpone() {
    // get winnings from contract
    let winningsWei = getVaultBalance();
    let winnings =  web3.utils.fromWei(winningsWei, 'ether');
    let worthWithdrawing = winnings > 0.003;

    // logic to see if winnings worth withdrawing
    if (worthWithdrawing) {
        withdrawCTR();
    } 
    displayPotResult(winningsWei);
}

function reset() { 
    withdrawOrPostpone();

    transactionConfirmed = false;
    transactionSent = false; 
    transaction = null;
}

//#region tests
function transferTest() {
    init();
    transfer();
}

function cancelTest() {
    init();
    transfer();
    setTimeout(cancelTransaction, 3000);
}

function main() {
    console.log("Testing transfer");
    transferTest();

    console.log("testing cancel");
    cancelTest();
}

function gasPriceTest(){
    getGasPrice().then(result => {
        Utils.debug(`[gasPriceTest] ${result}`);
    });
}

function startTests() {
    if (config.testnet) {
        console.log("Testing transfer");
        //transferTest();
        console.log("testing cancel");
        cancelTest();
    } else {
        Utils.print("not running real transactions out of testnet");
    }
}
//#endregion

module.exports = {
    updateBlockInformation: updateBlockInformation,
    displayBlockTime: displayBlockTime,
    displayWallet: displayWallet,
    snipeICO: snipeICO,
    sniperTests: startTests,
    gasPriceTest: gasPriceTest,
    init: init,
    reset: reset
};