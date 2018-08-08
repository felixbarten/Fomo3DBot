'use_strict';
const config = require('./config');
const Web3 = require('web3');
const PlayerBook = require('./playerbook.js');
const Utils = require('./utils.js');
const web3 = new Web3(new Web3.providers.HttpProvider(config.node));
const infura = new Web3(new Web3.providers.HttpProvider(config.fallbackNode));

//Contract needs correct ABI to handle requests.
contractAbi = JSON.parse(config.contractABI);
//Address to contract
var contractAddr = config.contractAddress;
// set default account
web3.eth.defaultAccount = web3.eth.accounts[0];
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
    accountNonce = getNonce(config.sniper.walletAddr);

}

function snipeICO(timeleft, roundNum) {
    let avgBlockTime = calcAVGBlockTime();
    let gasPrice = web3.utils.fromWei(getGasPrice(), 'gwei');
    Utils.debug("About to check ICO constraints");
    Utils.debug(`block time: ${avgBlockTime} gas price: ${gasPrice} time on ICO phase: ${timeleft}`);
    
    if (timeleft >= 30 && avgBlockTime < 20 && gasPrice <= 15 && !transactionSent) {
        // this call will waste real money.
        buyICO(roundNum);
        transactionSent = true;
    }

    if (transactionSent && timeleft <= 5 && !transactionConfirmed) {
        cancelTransaction(roundNum);
    }

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

async function buyICO(roundNum) {
    // sets up transaction with affiliate address and snek lyfe. 
    var transactionPromise = GameContract.methods.buyXAddr(config.sniper.affiliate, 2).send({
        from: config.sniper.walletAddr,
        gasPrice: web3.utils.fromWei(3, 'gwei'),
        gas: 350000,
        value: buyin
    })
    .on('transactionHash', function(hash){
        Utils.print(`Transaction sent: ${hash}`);

    })
    .on('confirmation', function(confirmationNumber, receipt){
        Utils.print(`Transaction is confirmed: ${confirmationNumber} times`);
    })
    .on('receipt', function(receipt){
        Utils.print(receipt);
        transaction = receipt;
        transactionConfirmed = true;
        var ico = checkICO();
        if(ico.succes) {
            Utils.print(`We GOT IN the ICO! Bough ${ico.keys} for an average of ${ico.paid}`);
        } else {
            Utils.print(`We DID NOT get in ICO!?@#@%@$%@%@#@#!@#^#%@# ${ico.paid} ICO was ${ico.icoPrice} `);
        }
    })
    .on('error', function(error) {
        Utils.error(error, "CRITICAL");
        Utils.print(error);
    });
    transactions.push({
        roundID: roundNum,
        type: 'buy',
        txhash: ""
    });
    Utils.debug(transaction);
    Utils.print("Transaction sent: ${transaction.");
}

async function transfer(addr) {
    web3.eth.sendTransaction({
        from: config.sniper.walletAddr,
        to: config.sniper.debugging.transferAddr,
        value: buyin,
        gas: 21000,
        gasPrice: web3.utils.fromWei(4, 'gwei')
    })
    .on('transactionHash', function(hash){
        Utils.print(`Transaction sent: ${hash}`);

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
}

function checkICO() {
    let succes = false;
    let keys = getBoughtKeys() / 1000000000000000000;
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
/**
 * Performs a cancelling transaction by sending to own address with a high gas price. 
 * *important* the nonce needs to be the same one as the transaction we're trying to get rid off. 
 * Otherwise both transactions will succeed 
 */
async function cancelTransaction(roundNum){
    let txhash = '';
    var transaction = web3.eth.sendTransaction({
        from: config.sniper.walletAddr,
        to: config.sniper.walletAddr,
        value: 0,
        gas: 22000,
        gasPrice: web3.utils.fromWei(200, 'gwei'),
        nonce: accountNonce
    })
    .on('transactionHash', function(hash) {
        Utils.print(`Submitted Cancelling transaction: ${hash}`);
        txhash = hash;
    })
    .on("receipt", function(receipt) {
        Utils.print(receipt);
        Utils.debug(receipt);
    })
    .on("confirm", function(confirm){
        Utils.print("CONFIRMED CANCEL TRANSACTION");
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
}

async function getNonce(addr) {
    try{
        return await web3.eth.getTransactionCount(addr);
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
    try {
        return await web3.eth.getGasPrice();
    } catch(e) {
        Utils.error("Couldn't retrieve gas price.", "ERR");
    }
}

async function getCurrentBlockNum() {
    try {
        return await web3.eth.getBlockNumber();
    } catch(e) {
        Utils.error("Couldn't retrieve block number.", "ERR");
    } 
}

function listMethods(){
    Utils.print(GameContract.methods);
}

function updateBlockInformation(block) {
    addBlock(block);
}

async function withdrawCTR(){
    var withdrawTransaction =  GameContract.methods.withdraw().send({
        from: config.sniper.walletAddr,
        gasPrice: web3.utils.fromWei(3, 'gwei'),
        gas: 150000,
        value: 0
    });
    return await withdrawTransaction();
}

function displayBlockTime() {
    Utils.print(`Current average block time over last 20 blocks is: ${calcAVGBlockTime()} seconds`);
}

/**
 * Displays information about our current wallet.
 */
function displayWallet() {
    let balance = getBalance(web3.eth.defaultAccount);
    Utils.clearSpace();
    Utils.print(`Current bot wallet holds: ${balance} ETH. Can participate in: ${balance/buyin} ICO's.`);
    Utils.clearSpace();

}

function reset() { 
    transactionConfirmed = false;
    transactionSent = false; 
    transaction = null;
}


function transferTest() {
    init();
    transfer();
}

function cancelTransactionTest() {
    init();
    transfer();
    cancelTransaction();
}

function() { 
    cancelTransaction();
}

function startTests() {
    if (config.testnet) {
    console.log("Testing transfer");
    transferTest();

    console.log("testing cancel");
    cancelTest();
    } else {
        Utils.print("not running real transactions out of testnet");
    }
}

module.exports = {
    updateBlockInformation: updateBlockInformation,
    displayBlockTime: displayBlockTime,
    displayWallet: displayWallet,
    snipeICO: snipeICO
};