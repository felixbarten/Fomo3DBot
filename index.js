'use_strict';
/**
 * @author Felix Barten
 * @name FOMO Contact poller
 * @version 1.0
 * @description Monitors the FOMO Short (or any FOMO3D contract for that matter) timer. If the timer ticks down to a threshold value an alert will sound. CLI implementation only.
 */
const config = require('./config');
const Web3 = require('web3');
const PlayerBook = require('./playerbook.js');
const Utils = require('./utils.js');
const Sniper = require('./sniper.js');
const beep = require('beepbeep');

//#region variables
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.nodeWS));
//Contract needs correct ABI to handle requests.
contractAbi = (config.contractABI);
//Address to contract
var contractAddr = config.contractAddress;
// set default account
web3.eth.defaultAccount = web3.eth.accounts[0];
//create contract variable
var GameContract = new web3.eth.Contract(contractAbi, contractAddr);

var currentPot = 0;
var rndNumber = 0;
var lastTimeLeft = 0;
// get vars from config.
var threshold = config.timerThreshold;
var waitTime = config.waitTime;
var currentPlayerAddr = "";
var currentPlayerBalance = 0.0;
var loopCnt=0, loopCnt2=0, loopCnt3=0;
var ICOSupported = config.ICO;
var roundEnded = false;
var tmpRndNum = 0;
var subscription = null;
//#endregion

/*
Function main will be the starting point of this application and will start the infinite loop of getRemainingTime() and loop()
*/
function main() {
    init();
    printOptions();
    Utils.print("Starting Contract polling");
    getContractName().then(nameResult => {
        Utils.print("Working with contract: " + nameResult);
    });
    // initialize vars
    getCurrentRoundInfo().then(result => {
        rndNumber = result[1];
        currentPot = Utils.weiToETH(result[5]);
        displayPot();
    });
    //start loop
    subscribe();
}

function printOptions() {
    Utils.print(`Module ICO sniping is: ${config.sniper.isEnabled ? 'ENABLED' : 'NOT enabled'}`);
    Utils.print(`Audio notifications are ${config.isMuted ? 'disabled' : 'enabled'}`);
    if (config.debugging) {
        Utils.print(`Script is in debugging mode`);
    }
    Utils.print(`Script is executing on: ${config.testnet ? 'testnet': 'mainnet'}`);
}

function init() {
    Utils.print("Initializing...");
    let tries = 0;
    while(!nodeInSync()) {
        Utils.print("Node has not started. Please start your node or switch to a different Node URL.");
        setTimeout(dummyfunc, 5000);        
        tries++;
        if (tries>20){
            Utils.print("Aborting startup.");
            process.exit(2);
        }
    }
    Utils.print("Node is synced!");
}

async function nodeInSync(){
    try {
        var inSync = await web3.eth.isSyncing();
        if(inSync != false) {
            return false;
        }

    } catch (e) {
        Utils.error("Couldn't query node status.", "ERR");
        return false;
    }

    return true;
}

function subscribe() {
    subscription = web3.eth.subscribe("newBlockHeaders", function(error, result) {
        if (error) {
            Utils.error(error, "CRITICAL", true);
        }
    })
   .on("data", pollContract);
}

function unsubscribe() {
    subscription.unsubscribe(function(error, success) {
        if(error) {
            Utils.print("Error unsubscribing from events.");
            Utils.error("Error unsubscribing from events.", "CRITICAL");
        }

        if(success) {
            Utils.print("Successfully unsubscribed."); 
        }
    });
}

function pollContract(blockHeader) {
    getRemainingContractTime().then(result => {
        loop(result);
    });
    Sniper.updateBlockInformation(blockHeader);
}

/*
Loop determines the amount of time to wait untill the next polling query is sent
*/
function loop(timeLeft) {
    innerLoop();
    displayTimeLeft(timeLeft);
    getCurrentPlayer();

    if (isNaN(timeLeft)) {
        Utils.print("Node returned bad result.");
        return;
    }
    // check if we're in ICO
    if (timeLeft <= 60 && ICOSupported && detectICO()) {
        Utils.insertDividerLine();
        Utils.print("WE ARE IN ICO PHASE!");
        Utils.print(`${timeLeft} SECONDS LEFT`);
        Utils.insertDividerLine();
        notifyAll(5);
        roundEnded = true;
        if (config.sniper.isEnabled) {
            Sniper.snipeICO(timeLeft, tmpRndNum);
        }
    }
    //Clean up after ICO.
    if (roundEnded && timeLeft > 200) {
        cleanUp();
    }

    if (timeLeft < threshold + 5) {
        // notify user.
        process.stdout.write('\n');
        Utils.insertDividerLine();
        Utils.print("WAKE UP");
        Utils.insertDividerLine();
        process.stdout.write('\n');
        if (timeLeft < 10) {
            notifyAll(3);
        } else {
            notifyAll(3);
        }        
        return;
    } 
    lastTimeLeft = timeLeft;
}

function innerLoop() {
    loopCnt++;
    loopCnt2++;
    loopCnt3++;
    // if it's a healthy pot this should display once every 5 minutes.
    if (loopCnt > 20) {
        PlayerBook.viewPlayerBook();
        loopCnt = 0;
        updateVars();
    }

    if (loopCnt3 > 30) {
        Sniper.displayBlockTime();
        loopCnt3 = 0;
    }

    if (loopCnt2 > 50 && config.debugging) {
        Utils.logStackTrace(false);
        var memory =process.memoryUsage();
        Utils.error(`${memory.heapUsed}/${memory.heapTotal} used.`, "INFO", true);
        loopCnt2 = 0;
    }
}

// Sends repeating beeping sound
function notifyAll(numBeeps) {
    if (!config.isMuted) {
        numBeeps = (typeof numBeeps === 'undefined') ? 10 : numBeeps;
        Utils.print(`Notifying: ${numBeeps} times`);
        beep(numBeeps, 1000);
    }
}

function outputPlayer(addr, balance) {
    setTimeout(dummyfunc, 1000);
    if (currentPlayerBalance !== 0.0) {
        Utils.print(`[o] Current Exit Scammer is: ${addr}`);
    } else {
        Utils.print(`Current Exit Scammer is: ${addr}`);
    }
}

function fancyOutput(playerObj) {
    var displayStr = "";
    if (playerObj.name != undefined && playerObj.name != '') {
        displayStr = playerObj.name;
    } else {
        displayStr = playerObj.address;
    }
    Utils.print(`[f] Current Exit Scammer is: ${displayStr}`);
}

function dummyfunc() {
    // do nothing
}

function displayTimeLeft(time) {
    if (time > 600) {
        let hours = Math.floor(time / 3600);
        let minutes = Math.floor((time % 3600) /60);
        let seconds = (time - (hours * 3600)) % 60;
        Utils.print(`Time left on contract: ${hours} Hours, ${minutes} Minutes and ${seconds} seconds.`);
    } else {
        Utils.print(`Time left on contract: ${time} seconds`);
    }
}

function getCurrentPlayer() {
    var result = GameContract.methods.getCurrentRoundInfo().call()
    .then(function(res) {
        currentPlayerAddr = res[7];
        // check if player is in book
        PlayerBook.processPlayer(currentPlayerAddr).then(playerResult => {
            // if player obj is empty go to old display method.
            if (playerResult == null) {
                getBalance().then(balanceResult => {
                    outputPlayer(currentPlayerAddr, balanceResult);
                });
            } else {
                fancyOutput(playerResult);
            }
        });
    }, function(fail) {
        Utils.print(`Current Round Call failed: ${fail}`);
    });
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
        Utils.print("Couldn't retrieve Account Balance.");
        Utils.error(e);
    }
}

// same as getBalance but takes address argument.
async function getBalanceAddr(addr) {
    try {
        if (addr == undefined) {
            Utils.print("Address not set");
            return NaN;
        }
        var balancePromise = await web3.eth.getBalance(addr);
        currentPlayerBalance = balancePromise;
        return balancePromise;
    } catch(e) {
        Utils.print("Error whilst retrieving balance.");
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

function getCurrentRndNumber() {
    getCurrentRoundInfo().then(rndResult => {
        tmpRndNum = rndResult[1];
    });
}

function updateVars() {
    getCurrentRoundInfo().then(result => {
        rndNumber = result[1];
        currentPot = Utils.weiToETH(result[5]);
        displayPot();
    });
}

function displayPot() {
    Utils.insertDividerLine();
    Utils.print("Current pot is #" + rndNumber + " with " + currentPot + " ETH");
    Utils.insertDividerLine();
}

/**
 * Detects if round has ended and is in ICO phase. ICO is detected by retrieving the round number. 
 * If the numbers differ the round has ended.
 */
function detectICO() {
    getCurrentRndNumber();
    Utils.debug("Tmp round num:" + tmpRndNum);
    Utils.debug("current rnd num:" + rndNumber);
    
    if (rndNumber == (tmpRndNum - 1) ) {
        Utils.insertDividerLine();
        Utils.print("We are in ICO!");
        Utils.debug("We are in ICO");
        Utils.insertDividerLine();
        roundEnded = true;
    } else {
        Utils.debug("We are NOT in ICO");
    }
    return roundEnded;
}

async function getKeyBuyPrice() {
    try {
        var buyPromise = GameContract.methods.getBuyPrice().call();
        return await buyPromise;
    } catch(e) {
        Utils.print("Couldn't retrieve Key buy price.");
        Utils.error(e);
    }
    return NaN;
}

async function getContractName() {
    try {
        var namePromise = GameContract.methods.name().call();
        return await namePromise;
    } catch(e) {
        Utils.print("Couldn't retrieve Contract Name.");
        Utils.error(e);
    }
    return NaN;
}

// update vars after ICO phase concluded. Reset round variables for new round.
function cleanUp() {
    roundEnded = false;
    PlayerBook.resetPlayerBook();
    console.log('\n\n');
    Utils.insertDividerLine();
    Utils.print("New round has started!");
    Utils.insertDividerLine();
    Sniper.reset();
    updateVars();
}

async function getRemainingContractTime() {
    try {
        var timePromise = GameContract.methods.getTimeLeft().call();
        return await timePromise;
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

  // catch ctrl+c event and exit normally
 process.on('SIGINT', function () {
    Utils.print('Ctrl-C...');
    Utils.exitProgram();
    process.exit(2);
 });

main();

