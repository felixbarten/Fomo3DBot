//#region startup
'use_strict';
const Web3 = require('web3');
const config = require('./config');
const Utils = require('./utils.js');
const Contract = require('./contract.js');
const fs = require('fs');

var web3;


if (config.connectionMode === 'http') {
    web3 = new Web3(new Web3.providers.HttpProvider(config.node));
} else if(config.connectionMode === 'ws') {
    web3 = new Web3(new Web3.providers.WebsocketProvider(config.nodeWS));
}
var playerBookABI = JSON.parse(fs.readFileSync('./contracts/PlayerBook.json', 'utf8'));

var playerBookAddr = "0xD60d353610D9a5Ca478769D371b53CEfAA7B6E4c";
// set default account
web3.eth.defaultAccount = web3.eth.accounts[0];
//create contract variable
var playerBookCTR = new web3.eth.Contract(playerBookABI, playerBookAddr);
var playerID = 0;
var playerBook = [];
var tmpBalance = 0;
// divider indices
var divider = 46;
var secondDivider = 75;
//#endregion

async function processPlayer(playerAddress){
    var player = {};
    var resultName = "";
    var balance = 0;
    var succeeded = false;
    try {
        retrievePID(playerAddress).then(pidResult => {
                Utils.debug(`retrieved PID: ${pidResult}`);
                if (pidResult !== -1 && pidResult !== 0 && !isInBook(pidResult)) {
                    retrievePlayerObj(pidResult).then(playerResult => {
                        // if can't retrieve player postpone until next block header.
                        if (playerResult === null) {
                            Utils.debug(`Retrieved null player object for PID: ${pidResult}`, "debug");
                            return null;
                        }
                        // convert bytes to string
                        utf8Name = web3.utils.hexToUtf8(playerResult.name);
                        Contract.getBalanceAddress(playerAddress).then(balanceResult => {
                            balance = balanceResult;
                            succeeded = addToPlayerBook(pidResult, utf8Name, playerAddress, Utils.weiToETH(balance), 0);
                            tmpBalance = 0;
                        });
                    });
            }
            Utils.debug(`Retrieving player from book... ${getPlayerFromBookAddr(playerAddress)}`, "debug");
            return getPlayerFromBookAddr(playerAddress);

        });
        Utils.debug(`Retrieving player from book...inside try ${getPlayerFromBookAddr(playerAddress)}`, "debug", false);
        return getPlayerFromBookAddr(playerAddress);
        //return playerPromise;
    }  catch(e) {
        Utils.print("Couldn't process player.");
        Utils.error(`Could not finish player processing: ${e}`);
        return null;
    }
  //  Utils.debug(`Retrieving player from book... outside try ${getPlayerFromBookAddr(playerAddress)}`);
    //return getPlayerFromBookAddr(playerAddress);

}

async function processing() {
    return succesful;
}

async function getPlayerBalance(addr) {
    try {
        if (addr === undefined) {
            console.log("Address not set");
            return NaN;
        }
        var balancePromise = web3.eth.getBalance(addr);
        balancePromise =  await balancePromise;
        tmpBalance = balancePromise;
        return balancePromise;
    } catch(e) {
        Utils.print("Couldn't retrieve Player Balance.");
        Utils.error(e);
    }
    return NaN;
}

function dummy() {

}

function updatePlayer(addr) {
}


async function retrievePlayerObj(pid) {
    try {
        var playerObj = await playerBookCTR.methods.plyr_(pid).call();
        currentPlayerObj = playerObj;
        return playerObj;
    } catch(e) {
        Utils.print("Couldn't retrieve Player Object.");
        Utils.error(`[retrievePlayerObj] Couldn't retrieve Player Object ${e} `, "ERR", false, true);
        return null;
    }
    return null;
}

async function retrievePID(address) {
    try {
        return await playerBookCTR.methods.pIDxAddr_(address).call();
    } catch(e) {
        Utils.print("Couldn't retrieve Player ID.");
        Utils.error(`[retrievePID] Couldn't retrieve PID: ${e}`, "ERR", false, true);
        return -1;
    }
}

function viewPlayerBook() {
    console.log("<------------------------- Displaying player book ------------------------->");
    // insert table header.
    var header = Utils.padLength("| Name", divider);
    header += "| ETH";
    header = Utils.padLength(header, secondDivider, " ");
    header += "|";
    console.log(header);
    //insert line after showing columns.
    var columnDivider = Utils.padLength("|", divider, "-");
    columnDivider += "|";
    columnDivider = Utils.padLength(columnDivider, secondDivider, "-");
    columnDivider += "|";
    console.log(columnDivider);
    // loop through players.
    for (var p of playerBook) {
        displayPlayer(p);
    }
    console.log(columnDivider);
    console.log("<------------------------- End of  player book ---------------------------->");
}

function displayPlayer(player) {
    var message = "| ";
    if (player.hasVanityName) {
        message += player.name;
    } else {
        message+= player.address;
    }
    message = Utils.padLength(message, divider, " ");
    message += "| ";
    message +=  player.balance;
    message = Utils.padLength(message, secondDivider, " ");
    message += "|";
    console.log(message);
}


function addToPlayerBook(pid, name, addr, balance, team) {
    // don't add if player is already in.
    if (!isInBook(pid)){
        var newPlayer = {
            ID: pid,
            name: name,
            address: addr,
            balance: balance,
            lastSeen: new Date(),
            team: team,
            hasVanityName: name === "" ? false : true
        };
        playerBook.push(newPlayer);
        Utils.debug(`Adding new player: ${JSON.stringify(newPlayer)}`, "info");
    }
    return isInBook(pid);
}

/**
 * Returns boolean if pid is in array or not
 * @param {number} pid
 * @return {boolean} Player ID is found
 */
function isInBook(pid) {
    for (var p of playerBook) {
        if (Number(p.ID) === Number(pid)) {
            return true;
        }
    }
    return false;
}

function getPlayerFromBookAddr(address) {
    for (var player of playerBook) {
        if (player.address === address) {
            Utils.debug(`Checking ${player.address} is same as ${address}: ${player.address === address}`, "debug");
            let index = playerBook.indexOf(player);
            if (index !== -1) {
               // update last seen.             
                playerBook[index].lastSeen = new Date();
                return player;
            }
        }
    }
    Utils.debug(`Failed to get player from book for: ${address}.`);

    return null;
}
// Deletes all player objects from array for new round.
function resetPlayerBook(){
    Utils.print("Resetting PlayerBook");
    playerBook = [];
}

// removes players from playerbook if they haven't placed a bid in: config.playerbook.inactive minutes
function removeInactivePlayers() {
    let playerCnt = playerBook.length;
    let inactive = new Date(Date.now() - (config.playerBook.inactive * 60) * 1000);
    playerBook.forEach(function(val, i) {
        // if player was last seen before inactive remove it.
        if (val.lastSeen < inactive) {
            Utils.debug(`Removing inactive player ${JSON.stringify(val)}`);
            playerBook.splice(i, 1);
        }
    });
    if (playerCnt !== playerBook.length) {
        Utils.print(`Pruned ${playerCnt - playerBook.length} inactive players.`);
    }
}


function main() {
    retrieveVanityName("addr");
    console.log(isInBook(1093));
}

module.exports = {
    resetPlayerBook: resetPlayerBook,
    processPlayer: processPlayer,
    viewPlayerBook: viewPlayerBook,
    removeInactivePlayers: removeInactivePlayers
};