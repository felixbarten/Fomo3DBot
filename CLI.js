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
const Blocks = require('./blocktimes.js');
const colors = require('colors/safe')
const {
    performance,
    PerformanceObserver
  } = require('perf_hooks');
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

/**
 * Start of the program. Initialized modules and then starts the program loop by subscribing to blockchain events.
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
    Utils.print(`Module ICO sniping is: ${config.sniper.isEnabled ? colors.green('ENABLED') : colors.red('NOT')} enabled`);
    Utils.print(`Audio notifications are ${config.isMuted ? colors.red('disabled') : colors.green('enabled')}`);
    if(config.useAscii) {
        Utils.print(`Ascii message are ${colors.green('enabled')}. Don't say you weren't warned.`);
    }
    if (config.debugging.isEnabled) {
        Utils.print(`Script is in ${colors.blue('debugging')} mode`);
    }
    if (config.sniper.enableWithdraw) {
        Utils.print(`Withdrawing is ${colors.green('enabled')}.`);
    }
    Utils.print(`Script is executing on: ${config.testnet ? colors.red('testnet') : colors.yellow('mainnet')}`);
}

function init() {
    Utils.print("Initializing...");
    let tries = 0;
    while(nodeInSync() === false) {
        Utils.print(colors.red("Node has not started. Please start your node or switch to a different Node URL."));
        setTimeout(dummyfunc, 5000);        
        tries++;
        if (tries>20){
            Utils.print(colors.red("Aborting startup."));
            process.exit(2);
        }
    }
    Utils.print("Node is synced!");
    if (config.debugging.isEnabled) {
        Utils.debug(`Started new Debugging session!`, "info", false);
    }
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
            Utils.error(`Can't subscribe to new Block headers: ${error}`, "CRITICAL", true, true);
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
    Blocks.updateBlockInformation(blockHeader);
}

/*
Loop determines the amount of time to wait untill the next polling query is sent
*/
function loop(remainingTime) {
    innerLoop();
    displayTimeLeft(remainingTime);
    getCurrentPlayer();

    if (isNaN(remainingTime)) {
        Utils.print("Node returned bad result.");
        return;
    }
    // check if we're in ICO
    if (remainingTime <= 60  && ICOSupported) {
        detectICO().then(result => {
            Utils.debug(`[loop] ICO result: ${result}`);
            // explicit checks because result could be anything.
            if (result === true) {
                Utils.insertDividerLine();
                if (config.useAscii) {
                    Ascii.printICOLarge();
                }
                Utils.print("CONTRACT IN ICO PHASE!");
                Utils.print(`${remainingTime} SECONDS LEFT`);
                Utils.insertDividerLine();
                notifyAll(5);
                roundEnded = true;
                if (config.sniper.isEnabled) {
                    Sniper.snipeICO(remainingTime, tmpRndNum);
                }
            } 
            if (result === false) {
                if (remainingTime == 0) {
                    Utils.debug(`Round has ended. Waiting for next round`, "info");
                } else {
                    Utils.debug(`NOT in ICO.`, "info");
                }
            }
        });
    }
    //Clean up after ICO.
    if (roundEnded && remainingTime > 200) {
        cleanUp();
    }

    if (remainingTime < threshold + 5 && remainingTime > 0) {
        // notify user.
        process.stdout.write('\n');
        Utils.insertDividerLine();
        if (config.useAscii) {
            Ascii.printWakeUpSmall();
        }
        Utils.print("WAKE UP");
        Utils.insertDividerLine();
        process.stdout.write('\n');
        if (remainingTime < 10) {
            notifyAll(3);
        } else {
            notifyAll(3);
        }        
        return;
    }

    if (remainingTime == 0) {
        Utils.print(`Round has ended waiting for next round.`);
        if(config.useAscii) {
            Ascii.printGGSmall();
        }
    } 
    lastTimeLeft = remainingTime;
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
        Blocks.displayBlockTime();
        loopCnt3 = 0;
    }

    if (loopCnt2 > 50 && config.debugging.isEnabled) {
        // shwo bot balance every 50 blocks.
        Sniper.logPlayer("", true);
        PlayerBook.removeInactivePlayers();
        var memory =process.memoryUsage();
        Utils.debug(`${memory.heapUsed}/${memory.heapTotal} used.`, "info", false);
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
    if (balance !== 0.0) {
        if(isOwnAddress(addr)) {
            Utils.print(`[o] You are the exit scammer`);
        } else {
            Utils.print(`[o] Current Exit Scammer is: ${addr}`);
        }
    } else {
        if(isOwnAddress(addr)) {
            Utils.print(`[o] You are the current exit scammer!`);
        } else {
            Utils.print(`[o] Current Exit Scammer is: ${addr}`);
        }
    }
}

function isOwnAddress(address) {
    return config.ownAddresses.includes(address);
}

function fancyOutput(playerObj) {
    var displayStr = "";
    if (playerObj.name !== undefined && playerObj.name !== '') {
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
    // async retrievals can still fail. 
    Contract.getCurrentRoundInfo().then(result => {
        if(result == undefined) return; // check if null. 
        currentPlayerAddr = result[7];
        Utils.debug(`Fetched round object: ${JSON.stringify(result)}`, "debug", false);

        // check if player is in book
        PlayerBook.processPlayer(result[7]).then(playerResult => {
            // if player obj is empty go to old display method.
            if (playerResult === null || playerResult === undefined) {
                Contract.getBalanceAddress(result[7]).then(balanceResult => {
                    outputPlayer(result[7], balanceResult);
                });
            } else {
                fancyOutput(playerResult);
            }
        });
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

async function detectICO() {
    var start = performance.now();
    var promise = Contract.getCurrentRoundInfo().then(result => {
        // convert getTime() to seconds.
        var currentTime = Math.round((new Date()).getTime() / 1000);
        var startTime = result[4];
        var difference = currentTime - startTime;
        if (difference < 60) {
            Utils.print(`New round started in last 60 seconds...`);

            if (difference > 30 ) {
                Utils.print(colors.red(`Too late to enter ICO now.`));
            }
        }
        // Check if the difference is under the threshold.
        inICO =  (difference <= config.sniper.abortICO);
        Utils.debug(`[DetectICO] Current: ${currentTime}, Start: ${startTime}, Diff: ${difference}`, "info");
        Utils.debug(`[DetectICO] We are in ICO: ${inICO}`, "info");

        return inICO;
    });

    promise = await promise;
    Utils.debug(`detectICO took ${performance.now() - start} ms`, "perf");
    return promise;
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
        Utils.print(`Finishing logging...`);
        Sniper.endSession();
    }
    Sniper.exit();
    Utils.print(`Ctrl-C.... Shutting down in 5 seconds.`);
    setTimeout(exit, 5000);
});

function exit() {
    Utils.exitProgram();
    process.exit(2);
}


main();

