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

//#region variables
const web3 = new Web3(new Web3.providers.HttpProvider(config.node));
//Contract needs correct ABI to handle requests.
contractAbi = JSON.parse(config.contractABI);
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
var loopCnt=0, loopCnt2=0;
var ICOSupported = config.ICO;
var roundEnded = false;
var tmpRndNum = 0;
//#endregion

/*
Function main will be the starting point of this application and will start the infinite loop of getRemainingTime() and loop()
*/
function main() {
    init();
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
    getRemainingTime();
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

/*
Loop determines the amount of time to wait untill the next polling query is sent
*/
function loop(timeLeft) {
    Sniper.updateBlockInformation();
    innerLoop();
    displayTimeLeft(timeLeft);
    getCurrentPlayer();

    if (isNaN(timeLeft)) {
        Utils.print("RPC returned bad result.");
        //loopAround(10);
        setTimeout(getRemainingTime, 10000);
        return;
    }
    // check if we're in ICO
    if (timeLeft <= 60 && ICOSupported && detectICO()) {
        Utils.clearSpace();
        Utils.print("WE ARE IN ICO PHASE!");
        Utils.print(timeLeft + " SECONDS LEFT");
        Utils.clearSpace();
        notify();
        roundEnded = true;
        setTimeout(getRemainingTime, 3000);
        loopAround(5);
    }
    //Clean up after ICO.
    if (roundEnded && timeLeft > 200) {
        cleanUp();
    }

    if (timeLeft < threshold + 5) {
        // notify user.
        process.stdout.write('\n');
        Utils.clearSpace();
        Utils.print("WAKE UP");
        Utils.clearSpace();
        process.stdout.write('\n');

        notifyAll();
        setTimeout(getRemainingTime, 3000);
        return;
        //loopAround(5);
    } else {
        if (timeLeft <60) {
            Utils.print("Polling for next Ethereum block");
            setTimeout(getRemainingTime, 5000);
            return;
            //loopAround(5);
        } else {
            if (timeLeft < 90) {
                Utils.print("Waiting 15 seconds");
                // sleep for 15 sec if the timer is getting close to ending.
                setTimeout(getRemainingTime, 15000);
                return;
                //loopAround(15);
            } else {
                // check if blockchain has stalled
                if (lastTimeLeft == timeLeft) {
                        Utils.print("No new block in last " + waitTime + " seconds, polling again");
                       setTimeout(getRemainingTime, 5000);
                       return;
                       //loopAround(5);
                } else {
                    // check if waiting would be longer than the end of the round
                    if (waitTime > 30 && waitTime > timeLeft ) {
                        Utils.print("Waiting " + 45 + " seconds");
                        setTimeout(getRemainingTime, 45000);
                        return;
                        //loopAround(waitTime - 90);
                    }
                    Utils.print("Waiting " + waitTime + " seconds");
                    setTimeout(getRemainingTime, waitTime * 1000);
                    return;
                    //loopAround(waitTime);
                }
            }
        }
    }
    lastTimeLeft = timeLeft;
}

function innerLoop() {
    loopCnt++;
    loopCnt2++;
    // if it's a healthy pot this should display once every 5 minutes.
    if (loopCnt > 10) {
        PlayerBook.viewPlayerBook();
        loopCnt = 0;
        updateVars();
    }

    if(loopCnt2 % 10 > 5) {
        Sniper.displayBlockTime();
    }

    if (loopCnt2 > 50 && config.debugging) {
        Utils.logStackTrace();
        Utils.error(process.memoryUsage());
        loopCnt2 = 0;
    }
}

function loopAround(waitTime) {
    setTimeout(getRemainingTime, waitTime *1000);
}

// Sends repeating beeping sound
function notifyAll() {
    notify();
    for( i =0; i< 3; i++) {
        setTimeout(notify, 1250);
    }
}

// Whenever this is printed it will emit a system "beep".
function notify() {
    process.stdout.write("\007");
}

function outputPlayer(addr, balance) {
    setTimeout(dummyfunc, 1000);
    if (currentPlayerBalance !== 0.0) {
        Utils.print("[o] Current Exit Scammer is: " + addr + " with " + balance + " ETH");
    } else {
        Utils.print("Current Exit Scammer is: " + addr);
    }
}

function fancyOutput(playerObj) {
    var displayStr = "";
    if (playerObj.name != undefined && playerObj.name != '') {
        displayStr = playerObj.name;
    } else {
        displayStr = playerObj.address;
    }
    Utils.print("[f] Current Exit Scammer is: " + displayStr + " with: " + playerObj.balance + " ETH");
}

function dummyfunc() {
    // do nothing
}

function displayTimeLeft(time) {
    if (time > 3600) {
        let hours = Math.floor(time / 3600);
        let minutes = Math.floor((time % 3600) /60);
        let seconds = (time - (hours * 3600)) % 60;
        Utils.print(`Time left on contract: ${hours} Hours, ${minutes} Minutes and ${seconds} seconds.`);
    } else {
        Utils.print("Time left on contract: " + time + " seconds");
    }
}

function getCurrentPlayer() {
    var result = GameContract.methods.getCurrentRoundInfo().call()
    .then(function(res) {
        //rndNumber = res[1];
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
        Utils.print("Current Round Call failed: " + fail);
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
            //console.log("Eth: " + eth);
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
        //console.debug("Fetching balance for: " + addr);
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
        /*
        var result = GameContract.methods.getCurrentRoundInfo().call();
        await result;*/
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
    Utils.clearSpace();
    Utils.print("Current pot is #" + rndNumber + " with " + currentPot + " ETH");
    Utils.clearSpace();
}

function detectICO() {
    var icoPrice = 100000000000000;
    //Utils.print("detecting ICO");
    getKeyBuyPrice().then(result => {
        getCurrentRndNumber();
        Utils.debug(result);
        Utils.debug("Tmp round num:" + tmpRndNum);
        Utils.debug("current rnd num:" + rndNumber);
        
        /*(
        console.log("Current round num: " + tmpRndNum);
        if (tmpRndNum != rndNumber) {
            Utils.print("round numbers do not match!");
            console.log(result);
        }
        */
        if (!isNaN(result) && rndNumber == (tmpRndNum - 1) ) {
            Utils.clearSpace();
            Utils.print("We are in ICO!");
            Utils.clearSpace();
            roundEnded = true;
        }
    });
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
    Utils.clearSpace();
    Utils.print("New round has started!");
    Utils.clearSpace();
    updateVars();
}

/*
// Call contract for time remaining.
function getRemainingTime() {
    var result = GameContract.methods.getTimeLeft().call()
    .then(function(value) {
        loop(value);
    }, function(failure) {
        Utils.print("Failed to get promise object");
        Utils.debug(failure, true);
        Utils.error(failure, "CRITICAL", false);
        Utils.print("Waiting 15 seconds to retry");
        setTimeout(getRemainingTime, 15000);
        return NaN;
    });

}*/

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

