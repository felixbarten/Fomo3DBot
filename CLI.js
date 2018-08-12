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
const Ascii = require('./ascii.js');
const Contract = require('./contract.js');
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
var inICO = false;
//#endregion

/*
Function main will be the starting point of this application and will start the infinite loop of getRemainingTime() and loop()
*/
function main() {
    init();
    printOptions();
    if (config.sniper.isEnabled) {
        Sniper.displayWallet();
        Sniper.logPlayer(); 
    }
    Utils.print("Starting Contract polling");
    Contract.getContractName().then(nameResult => {
        Utils.print("Working with contract: " + nameResult);
    });
    // initialize vars
    Contract.getCurrentRoundInfo().then(result => {
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
    if(config.useAscii) {
        Utils.print(`Ascii message are enabled. Don't say you weren't warned.`);
    }
    if (config.debugging) {
        Utils.print(`Script is in debugging mode`);
    }
    Utils.print(`Script is executing on: ${config.testnet ? 'testnet': 'mainnet'}`);
}

function init() {
    Utils.print("Initializing...");
    let tries = 0;
    while(nodeInSync() === false) {
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

//#region Node status

// synchronous function to return sync status. 
function nodeInSync() {
    let synced = false;
    getSyncStatus().then(result => {
        synced = result;
        return synced;
    });
}

async function getSyncStatus(){
    try {
        var inSync = await web3.eth.isSyncing();
        Utils.debug(`inSync: ${inSync}`);
        if(inSync === false) {
            return true;
        }

    } catch (e) {
        Utils.error("Couldn't query node status.", "ERR", true, true);
        return false;
    }

    return false ;
}
//#endregion

function subscribe() {
    subscription = web3.eth.subscribe("newBlockHeaders", function(error, result) {
        if (error) {
            Utils.error(`Can't subscribe to new Block headers: ${error}`, "CRITICAL", true);
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
    Contract.getRemainingContractTime().then(result => {
        loop(result);
    });
    //Utils.debug(JSON.stringify(blockHeader, null, 2));
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
    if (timeLeft <= 60  && ICOSupported) {
        detectICO().then(result => {
            Utils.debug(`detectico result: ${result}`)
            // explicit checks because result could be anything.
            if (result === true) {
                Utils.insertDividerLine();
                if (config.useAscii) {
                    Ascii.printICOLarge();
                }
                Utils.print("CONTRACT IN ICO PHASE!");
                Utils.print(`${timeLeft} SECONDS LEFT`);
                Utils.insertDividerLine();
                notifyAll(5);
                roundEnded = true;
                if (config.sniper.isEnabled) {
                    Sniper.snipeICO(timeLeft, tmpRndNum);
                }
            } 
            if (result === false) {
                Utils.debug(`NOT in ICO.`);
            }
        });
    }
    /*
    if (inICO) {
        Utils.insertDividerLine();
        if (config.useAscii) {
            Ascii.printICOLarge();
        }
        Utils.print("CONTRACT IN ICO PHASE!");
        Utils.print(`${timeLeft} SECONDS LEFT`);
        Utils.insertDividerLine();
        notifyAll(5);
        roundEnded = true;
        if (config.sniper.isEnabled) {
            Sniper.snipeICO(timeLeft, tmpRndNum);
        }
    }
    */
    //Clean up after ICO.
    if (roundEnded && timeLeft > 200) {
        cleanUp();
    }

    if (timeLeft < threshold + 5) {
        // notify user.
        process.stdout.write('\n');
        Utils.insertDividerLine();
        if (config.useAscii) {
            Ascii.printWakeUpSmall();
        }
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
        PlayerBook.removeInactivePlayers();
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
        if(isOwnAddress(addr)) {
        } else {
            Utils.print(`[o] You are the exit scammer`);
        }
            Utils.print(`[o] Current Exit Scammer is: ${addr}`);
    } else {
        if(isOwnAddress(addr)) {
            Utils.print(`You are the current exit scammer!`);
        } else {
            Utils.print(`Current Exit Scammer is: ${addr}`);
        }

    }
}

function isOwnAddress(address) {
    return config.ownAddresses.includes(address);
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
                Contract.getBalanceAddress(currentPlayerAddr).then(balanceResult => {
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

function getCurrentRndNumber() {
    Contract.getCurrentRoundInfo().then(rndResult => {
        tmpRndNum = rndResult[1];
    });
}

function updateVars() {
    Contract.getCurrentRoundInfo().then(result => {
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
/* 
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
*/
/*
function detectICO() {
    let inICO = false;
    Contract.getCurrentRoundInfo().then(result => {
        // convert getTime() to seconds.
        var currentTime = Math.round((new Date()).getTime() / 1000);
        var startTime = result[4];
        var difference = currentTime - startTime;
        inICO =  (difference <= config.sniper.abortICO);
        Utils.debug(`${currentTime}, ${startTime}, ${difference}`);
        Utils.debug(`We are in ICO: ${inICO}`);
       // inICO = true;
    });
}
*/
async function detectICO() {
    
    var prom = Contract.getCurrentRoundInfo().then(result => {
        // convert getTime() to seconds.
        var currentTime = Math.round((new Date()).getTime() / 1000);
        var startTime = result[4];
        var difference = currentTime - startTime;
        inICO =  (difference <= config.sniper.abortICO);
       // Utils.print((difference <= config.sniper.abortICO));
        Utils.debug(`${currentTime}, ${startTime}, ${difference}`);
        Utils.debug(`[DetectICO] We are in ICO: ${inICO}`);
        return inICO;
    });

    return await prom;
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
    inICO = false;
    if(Sniper.isReady()) {
        Utils.print(`Sniper module ready for next round.`);
    } else {
        Utils.print(`Sniper module did not reset.`);
    }
    // Utils.print(`Sniper module ready for next round`)
    updateVars();
}

  // catch ctrl+c event and exit normally
 process.on('SIGINT', function () {
    if(config.sniper.isEnabled) {
        Sniper.logPlayer("Shutting down");
    }
    Utils.print('Ctrl-C...');
    Utils.exitProgram();
    process.exit(2);
 });

main();

