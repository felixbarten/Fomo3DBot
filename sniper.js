'use_strict';
const config = require('./config');
const Web3 = require('web3');
const PlayerBook = require('./playerbook.js');
const Utils = require('./utils.js');
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.nodeWS));
const infura = new Web3(new Web3.providers.HttpProvider(config.fallbackNode));
const Contract = require('./contract.js');
const fs = require('fs');
//Contract needs correct ABI to handle requests.
contractAbi = config.contractABI;
//Address to contract
var contractAddr = config.contractAddress;
// set default account
//create contract variable
var GameContract = new web3.eth.Contract(contractAbi, contractAddr);

var blocks = [];
var blocksToSave = 20;
// 0,01 ether.
var buyin = web3.utils.toWei('0.025', 'ether');
var transactionNonce = 0;
var accountNonce = 0;
var transactionSent = false;
var transaction = null;
var transactionConfirmed = false;
var transactions = [];
var transactionLog = fs.createWriteStream(config.sniper.logFile, {flags: 'a'});
var accountLog = fs.createWriteStream(config.sniper.accountLog, {flags: 'a'});
var sessionLogged =false;
var startAmount = 0;
var buyTransactions = 0;
var affiliateShare = buyin * 0.1;

function initialize() {

    Contract.getNonce(config.sniper.walletAddr).then(result => {
        accountNonce = result;
    });

    unlockAccountAsync().then(unlockResult => {
        Utils.print(`Unlockresult: ${unlockResult}`);
        web3.eth.defaultAccount = web3.eth.personal[0];
    });
    
    console.log(`default account is: ${web3.eth.defaultAccount}`);
}

function logPlayer(event) {
    let botBalance = web3.utils.toBN(0);
    let winnings = web3.utils.toBN(0);

    Contract.getVaultBalance().then(result => {
        //get winnings from winning, affiliate and dividends.
        Utils.debug(`GetVaultBalance result: ${JSON.stringify(result)}`);
        var exitScammed = web3.utils.toBN(result[4]);
        let badAdvice = web3.utils.toBN(result[3]);
        let vault = web3.utils.toBN(result[5]);

        let winningsWei = exitScammed.add(badAdvice).add(vault);
        winnings =  web3.utils.fromWei(winningsWei, 'ether');

        Contract.getPersonalBalance().then(personal => {
            botBalance = web3.utils.fromWei(web3.utils.toBN(personal), 'ether');
            var total = Number(winnings) + Number(botBalance);
            var totalAffiliateWei = Number(affiliateShare) * Number(buyTransactions);
            var totalAffiliateETH = web3.utils.fromWei(web3.utils.toBN(totalAffiliateWei), 'ether');
            // only trigger on first run.
            if (!sessionLogged) {
                startAmount = Number(botBalance) + Number(winnings);
                accountLog.write(`${Utils.timestamp()} New Session started: Bot has ${botBalance} and ${winnings} in the vault for a total of: ${startAmount} \n`);
                sessionLogged = true;
                return;
            }
            accountLog.write(`${Utils.timestamp()} Report due to ${event}: Bot has ${botBalance} and ${winnings} in the vault for a total of: ${total} ETH \n
            We've sent ${buyTransactions} transactions this session with a total affiliate bonus of ${totalAffiliateETH} \n
            `);

        });

    });
}

function snipeICO(timeleft, roundNum) {
    // unlock acc

    let avgBlockTime = calcAVGBlockTime();
    let gasPriceObj = 0;
    let gasBN = 0;

    Contract.getGasPrice().then(result => {
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
            Utils.print("Checking if account is locked...");
            isUnlocked().then(accResult => {
                if(accResult === false) {
                    Utils.print("Account is locked.");
                    unlockAccountAsync().then(res => {
                        Utils.print("Unlocked account? ${res}");
                        Utils.debug(`Unlocked account? : ${res}`);
                        // this call will waste real money.
                        buyICOKeys(roundNum);
                    });
                }

                if (accResult === true) {
                    Utils.print(`Account was unlocked. `);
                    Utils.debug(`Unlocked account? : ${accResult}`);
                    // this call will waste real money.
                    buyICOKeys(roundNum);
                }
            });

        } else {
            if (!transactionSent) {
                if (!timeCheck) Utils.print(`Transaction aborted due to time on contract: ${timeleft}`);
                if(!blockTimeCheck) Utils.print(`Transaction aborted due to block times being erratic: ${avgBlockTime}`);
                if(!gasCheck) Utils.print(`Transaction aborted due to high network gas price: ${gasGwei} gwei`);
            }
        }

        if (transactionSent && timeleft <= 5 && !transactionConfirmed) {
            initialize();
            cancelTransaction(roundNum);
        }
    });
}

async function unlockAccountAsync() {
    let unlocked = false;
    isUnlocked().then(result => {
        unlocked = result;
    });
    if (!unlocked) { 
        var unlockPromise = web3.eth.personal.unlockAccount(config.sniper.walletAddr, config.sniper.passphrase, 600)
        .then((response) => {
            Utils.print(` Account unlock was successful: ${response}`);
            return true;
        }).catch((error) => {
            Utils.print(`Error during account unlock: ${error}`);
            return false;
        });
        return await unlockPromise;
    }
    return true;
}

async function isWalletUnlocked() {
    var accounts = web3.eth.personal.getAccounts();
    Utils.debug(`Checking if accounts are unlocked`);
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

// all gas calculations done in gwei.
function calculateGasPrice() {
    // get gas price from node.
    let maxGasPrice = config.sniper.ICOGas;
    let gasPrice = 0;
    Contract.getGasPrice().then(result => function (){
        gasPrice = web3.utils.fromWei(result, 'gwei');
        let proposedGas = gasPrice * 2;

        // try multiplying by two. use that if under gas ceiling return value.
        if (proposedGas < maxGasPrice) {
            return proposedGas;
        }
        return maxGasPrice;
    });
}

/**
 * Sends a transaction to the smart contract to buy keys for X.XX ETH.
 * Caution: real money on the line here.
 * @param {Number} roundNum 
 */
function buyICOKeys(roundNum) {
    isUnlocked().then(result => {
        if(result === false) {
            Utils.print(`Wallet is not unlocked....`);
            Utils.debug(`isUnlcoked at buyICOKeys: ${result}`);
            initialize();
        }
    });
    Utils.print(`Attempting to send buy transaction to contract`);
    // sets up transaction with affiliate address and snek lyfe. 
    GameContract.methods.buyXaddr(config.sniper.affiliateAddress, 2).send({
        from: config.sniper.walletAddr,
        gasPrice: web3.utils.toWei(config.sniper.ICOGas, 'gwei'),
        gas: 550000,
        value: buyin
    })
    .on('transactionHash', function(hash){
        Utils.insertDividerLine();
        Utils.print(`Transaction sent: ${hash}`);
        transactionLog.write(`Transaction sent: ${hash}`);
        accountLog.write(`Sent ICO bid of ${buyin} ETH. \n`);
        Utils.insertDividerLine();
        transactionSent = true;
    })
    .on('confirmation', function(confirmationNumber, receipt){
        if(confirmationNumber < 5) {
            Utils.print(`Transaction is confirmed: ${confirmationNumber} times`);
        }
        if (confirmationNumber == 1) {
            buyTransactions++; // increment amount of buys by one as soon as transaction is confirmed.
        }
        if(confirmationNumber > 1) {
            
            // after transaction has been mined at least once no point in sending a cancel after it.
            transactionConfirmed = true;
        }
    })
    .on('receipt', function(receipt){
        Utils.debug(JSON.stringify(receipt));        
        transactionLog.write(`Receipt: ${JSON.stringify(receipt)}`);

        transaction = receipt;
        var ico = checkICO();
        Utils.debug(`ICO status: ${ico}`);
        if(ico.succes) {
            Utils.print(`We GOT IN the ICO! Bough ${ico.keys} for an average of ${ico.paid}`);
        } else {
            Utils.print(`We DID NOT get in ICO!?@#@%@$%@%@#@#!@#^#%@# ${ico.paid} ICO was ${ico.icoPrice} `);
        }
    })
    .on('error', function(error) {
        Utils.print(`Error occurred while sending transaction:" ${error}`);        
        transactionLog.write(`Error: ${error}`);
        Utils.error(error, "CRITICAL");
        Utils.print(error);
    });

    transactions.push({
        roundID: roundNum,
        type: 'buy',
        txhash: ""
    });

    Utils.debug(JSON.stringify(transaction));
    Utils.print(`Transaction sent: ${transaction}.`);
}

function checkICO() {
    let succes = false;
    var keys = 0;
    getBoughtKeys.then(result => {
        keys = result[2] /1000000000000000000;
    });
    let avgPrice = buyin / keys;

    let icoPrice = Contract.getICOPrice();
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
 * Performs a cancelling transaction by sending to own address with a high(er) gas price. 
 * *important* the nonce needs to be the same one as the transaction we're trying to cancel.
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
            gasPrice: web3.utils.toWei(config.sniper.cancelGas, 'gwei'),
            nonce: accountNonce
        })
        .on('transactionHash', function(hash) {
            Utils.insertDividerLine();
            Utils.print(`Sent Cancelling transaction: ${hash}`);
            transactionLog.write(`Sent Cancelling transaction: ${hash}`);

            Utils.insertDividerLine();
            txhash = hash;
        })
        .on("receipt", function(receipt) {
            Utils.print(JSON.stringify(receipt));
            Utils.debug(JSON.stringify(receipt));
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
        Utils.print(`Error with cancel transaction: ${e}`);
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
            transactionLog.write(`Transaction sent: ${hash}`);
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
            transactionLog.write(`Error: ${error}`);
        });
        return await transaction;
    } catch (e) {
        Utils.print(e);
        Utils.error(e, "CRITICAL");
    }
}

async function withdrawCTR(amount, overrideNonce){
    try {
        if (overrideNonce !== undefined) {
            nonce = overrideNonce;
        }
        if (!config.sniper.enableWithdraw) {
            Utils.debug(`withdrawing is disabled.`);
            return;
        }
        //withdraw is cheap 10 gwei.
        GameContract.methods.withdraw().send({
            from: config.sniper.walletAddr,
            gasPrice: web3.utils.toWei('10', 'gwei'),
            gas: 150000,
            value: 0,
        })
        .on('transactionHash', function(hash){
            Utils.insertDividerLine();
            Utils.print(`Withdraw sent: ${hash} for ${amount} ETH`);
            accountLog.write(`Withdrawing ${amount} ETH from Vault. \n`);
            Utils.insertDividerLine();
        })
        .on('confirmation', function(confirmationNumber, receipt){
            if (confirmationNumber <5) {
                Utils.print(`Withdraw is confirmed: ${confirmationNumber} times`);
            }
            
        })
        .on('receipt', function(receipt){
            Utils.print(receipt);
            transaction = receipt;
            transactionConfirmed = true;
        })
        .on('error', function(error) {
            Utils.error(error, "CRITICAL");
            Utils.print(error);
            transactionLog.write(`Error: ${error}`);
        });
    } catch (e) {
        Utils.print(`Error with withdrawing: ${e}`);
        Utils.error(e, "CRITICAL");
    }
}

function listMethods(){
    Utils.print(GameContract.methods);
}

function calcAVGBlockTime() {
    let blockTime = NaN;
    let avgBlockTime = 0;
    if (blocks.length > 2) {
        blockTime = (blocks[blocks.length -1].timestamp - blocks[0].timestamp);
        avgBlockTime = blockTime / blocks.length;
        Utils.debug(`Timestamp of last block: ${blocks[blocks.length - 1].timestamp} Timestamp of newest block: ${blocks[0].timestamp} \n ${blockTime}`);
        Utils.debug(`Average block time over ${blocks.length} blocks: ${avgBlockTime}`);

    }
    return avgBlockTime;
}

function addBlock(block) {
    if (blocks.length > blocksToSave) {
        removeBlocks();
    }
    /*
    if (blocks.length == blocksToSave) {
        Utils.debug(`Blocks: ${JSON.stringify(blocks, null, 2)}`);
    }*/
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
    while(blocks.length > blocksToSave ) {
        removeBlock();
    }
}

function removeBlock() {
    // fifo.
    blocks.splice(0,1);
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
    Contract.getPersonalBalance(web3.eth.defaultAccount).then(result => {
        Utils.insertDividerLine();
        let resultETH = web3.utils.fromWei(web3.utils.toBN(result), 'ether');
        Utils.print(`Current bot wallet holds: ${resultETH} ETH. Can participate in: ${result / buyin} ICO's.`);
        Utils.insertDividerLine();
    });
}

// BN.js....
// https://github.com/indutny/bn.js/
// web3 documentation links 3 different libraries between two versions of documentation.
function displayPotResult(vault) {
    // enforce BN to prevent nasty conversion errors later.
    let winnings = vault;
    let affiliateBonus = 0;
    let buyinAmount = web3.utils.toBN(buyin);
    // 10% aff.
    if (config.sniper.useAffiliate){
        affiliateBonus = buyinAmount * 0.1;
    }
    affiliateBonus = web3.utils.toBN(affiliateBonus);
    console.log(`${winnings}, ${affiliateBonus}, ${winnings + affiliateBonus < buyin}`);
    let JUST =  (winnings.add(affiliateBonus)).lt(buyinAmount); 
    let proceeds = web3.utils.toBN(0);
    /*
    if (JUST) {
        proceeds =  (winnings +  affiliateBonus) - buyin;
    } else {
        proceeds =  buyin - (winnings + affiliateBonus);
    }*/
    //proceeds = winnings + affiliateBonus - buyin;
    proceeds = web3.utils.toBN(buyinAmount.sub(winnings.add(affiliateBonus)));

    //var proceedsString = web3.utils.toBN(proceeds.toString());
   // console.log(proceedsString);
    if (proceeds.isNeg) {
        proceeds = proceeds.neg();
    }
    let profitOrLoss =  web3.utils.fromWei(proceeds, 'ether');

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
    Contract.getVaultBalance().then(result => {
        //get winnings from winning, affiliate and dividends.
        Utils.debug(`GetVaultBalance result: ${JSON.stringify(result)}`);
        var exitScammed = web3.utils.toBN(result[4]);
        let badAdvice = web3.utils.toBN(result[3]);
        let vault = web3.utils.toBN(result[5]);

        let winningsWei = exitScammed.add(badAdvice).add(vault);
        let winnings =  web3.utils.fromWei(winningsWei, 'ether');
        let worthWithdrawing = winnings > 0.003;
        Utils.debug(`Winnings are: ${winnings}, Above threshold? ${worthWithdrawing}`);
        // logic to see if winnings worth withdrawing
        if (worthWithdrawing) {
            Utils.debug(`[withdrawOrPostpone()] Attempting withdraw`);
            withdrawCTR(winnings);
        } 
        displayPotResult(winningsWei);
    });
}

async function isUnlocked (web3, address) {
    Utils.debug(`Attempting signing`);
    try {
        await web3.eth.sign("", address);
    } catch (e) {
        return false;
    }
    return true;
}

function reset() { 
    logPlayer("New Round");
    withdrawOrPostpone();
    Utils.print("Resetting sniper state.");
    transactionConfirmed = false;
    transactionSent = false; 
    transaction = null;
    Utils.debug(`Sniper module is ready?: ${sniperReady()}`);
}

// returns boolean if sniper is able to be used again for next round
function sniperReady(){
    return !transactionConfirmed && !transactionSent && !transactionConfirmed;
}

//#region tests
function transferTest() {
    initialize();
    transfer();
}

function cancelTest() {
    initialize();
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
    Contract.getGasPrice().then(result => {
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
    initialize: initialize,
    reset: reset,
    cancelTransaction: cancelTransaction,
    buyICOKeys: buyICOKeys,
    withdraw: withdrawCTR,
    isReady: sniperReady,
    withdrawOrPostpone: withdrawOrPostpone,
    logPlayer: logPlayer
};