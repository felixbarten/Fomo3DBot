'use_strict';
const config = require('./config');
const Web3 = require('web3');
const Utils = require('./utils.js');
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.nodeWS));
const infura = new Web3(new Web3.providers.HttpProvider(config.fallbackNode));

/*
This file contains most of the methods required to successfully poll the game smart contract. These methods are mostly boilerplate that was cluttering the other files.
*/
//Contract needs correct ABI to handle requests.
var contractAbi = config.contractABI;
//Address to contract
var contractAddr = config.contractAddress;
// set default account
//create contract variable
var GameContract = new web3.eth.Contract(contractAbi, contractAddr);

//#region getters
async function getNonce() {
    try{
        return await web3.eth.getTransactionCount(config.sniper.walletAddr);
    } catch(e) {
        Utils.error(`Couldn't retrieve block. ${e}`, "ERR");
    } 
}

// Returns the balance of the player 
async function getVaultBalance() {
    try{
        return await  GameContract.methods.getPlayerInfoByAddress(config.sniper.walletAddr).call();
    } catch(e) {
        Utils.error(`Couldn't retrieve vault balance. ${e}`, "ERR");
    } 
}

async function getPersonalBalance() {
    try {
        return await web3.eth.getBalance(config.sniper.walletAddr);
    }   
     catch (e) {
        Utils.print("Couldn't retrieve Account Balance.");
        Utils.error(e);
    }
}

async function getBalance() {
    try {
        if (currentPlayerAddr == undefined) {
            Utils.print("Address not set");
            return NaN;
        }
        var balancePromise = web3.eth.getBalance(currentPlayerAddr)
        .then(function(res) {
            var eth = res / 1000000000000000000;
            currentPlayerBalance = res;
            return eth;
            // Why doesn't this work? ^^
        }, function(fail) {
            Utils.print(fail);
            return NaN;
        });
        return balancePromise;
    } catch (e) {
        Utils.print(`Couldn't retrieve Account Balance for: ${currentPlayerAddr}`);
        Utils.error(e);
    }
}

// same as getBalance but takes address argument.
async function getBalanceAddr(address) {
    try {
        if (address == undefined) {
            Utils.print("Address not set");
            return NaN;
        }
        var balancePromise = await web3.eth.getBalance(address);
        currentPlayerBalance = balancePromise;
        return balancePromise;
    } catch(e) {
        Utils.print(`Couldn't receive balance for account: ${address}.`);
        Utils.error(e);
    }
}

async function getCurrentRoundInfo(){
    try {
        return await GameContract.methods.getCurrentRoundInfo().call();//result;
    } catch (e) {
        Utils.print("Error whilst retrieving round information.");
        Utils.error(e);
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
        Utils.error(`Couldn't retrieve block. ${e}`, "ERR");
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
        Utils.error(`Couldn't retrieve gas price. ${e}`, "ERR");
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
        Utils.error(`Couldn't retrieve block number. ${e}`, "ERR");
    } 
}

// TODO
async function getBoughtKeys() {
    try {
        return await GameContract.methods.getPlayerInfoByAddress(config.sniper.walletAddr).call();
    } catch(e) {
        Utils.error(`Couldn't retrieve ICO key price. ${e}`, "ERR");
    }
}

async function getICOPrice(round) {
    try {
        return await GameContract.methods.calcAverageICOPhaseKeyPrice(round).call();
    } catch(e) {
        Utils.error(`Couldn't retrieve ICO key price. ${e}`, "ERR");
    }
}
//#endregion

//#region polling
async function getRemainingContractTime() {
    try {
        return await GameContract.methods.getTimeLeft().call();
    } catch (e) {
        Utils.error(e, "CRITICAL", true);
        Utils.print("Failed to get remaining time for round. See Error log");
    }
}

async function getRemainingTime() {
    try {
        var timePromise = GameContract.methods.getTimeLeft().call();
        var time = await timePromise;
        loop(time);
    } catch (e) {
        Utils.error(e, "CRITICAL", true);
        Utils.print("Failed to get remaining time for round. See Error log");
    }
}

//#endregion


async function getKeyBuyPrice() {
    try {
        return await GameContract.methods.getBuyPrice().call();
    } catch(e) {
        Utils.print("Couldn't retrieve Key buy price.");
        Utils.error(e);
    }
    return NaN;
}

async function getContractName() {
    try {
        return await GameContract.methods.name().call();
    } catch(e) {
        Utils.print("Couldn't retrieve Contract Name.");
        Utils.error(e);
    }
    return NaN;
}

module.exports = {
    getNonce: getNonce,
    getVaultBalance: getVaultBalance,
    getGasPrice: getGasPrice,
    getLastBlock: getLastBlock,
    getBalance: getBalance,
    getCurrentBlockNum: getCurrentBlockNum,
    getBoughtKeys: getBoughtKeys,
    getICOPrice: getICOPrice,
    getRemainingTime: getRemainingTime,
    getRemainingContractTime: getRemainingContractTime,
    getCurrentRoundInfo: getCurrentRoundInfo,
    getBalanceAddress: getBalanceAddr,
    getKeyBuyPrice: getKeyBuyPrice,
    getContractName: getContractName,
    getPersonalBalance: getPersonalBalance

};