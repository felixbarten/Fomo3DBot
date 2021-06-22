'use_strict';
const config = require('./config');
const Utils = require('./utils.js');
const Sniper = require('./sniper.js');
const Contract = require('./contract.js');
const prompt = require('prompt');
const colors = require('colors/safe');
const Ascii = require('./ascii.js');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.nodeWS));

var schema = {
    properties: {
      choice: {
        pattern: /^[0-9]+$/,
        description: colors.red('Please enter your choice:'),
        message: 'Choice must be only numbers',
        required: true
      }
    }
  };
function init() {
    Utils.insertDividerLine();
    Utils.print(`Starting CLImenu.js`);
    Contract.getContractName().then(nameResult => {
        Utils.print("Working with contract: " + nameResult);
    });
    Utils.insertDividerLine();
    //Sniper.initialize();
    setTimeout(showMenu, 3000);
}

function showMenu() {
    Utils.insertDividerLine();
    console.log(`Choose an option: `);
    console.log(`Option 1: Buy ICO keys transaction`);
    console.log(`Option 2: Cancel transaction`);
    console.log(`Option 3: Withdraw from contract`);
    console.log(`Option 4: Buy one key`);
    console.log(`\n`);
    console.log(`Option 5: View Gas prices`);
    console.log(`Option 6: view ICO prices for current round`);
    console.log(`Option 7: View current player balance`);
    console.log(`Option 8: View Bot Status`);
    console.log(`\n`);
    console.log(`Option 9: Exit`);
    console.log(`Option 0: Clear console`);
    Utils.insertDividerLine();
    prompt.start();
    prompt.get(schema, function(err, result) {
        switch(result.choice) {
            case '1':
                sendBuy();
                break;
            case '2':
                sendCancel();
                break;
            case '3':
                sendWithdraw();
                break;
            case '4': 
                buyOneKey();
                break;
            case '5':
                getGasPrices();
                break;
            case '6':
                viewICO();
                break;
            case '7':
                viewCurrentPlayer();
                break;
            case '8':
                viewBotStatus();
                break;
            case '9':
                exitProgram();
                break;
            case '0':
                console.clear();
                showMenu();
                break;
            case '01':
                Ascii.printICOSmall();
                Ascii.printICOBlock();
                Ascii.printICOLarge();
                Ascii.printWakeUpLarge();
                Ascii.printWakeUpSmall();
                break;
            case '02':
                Sniper.withdrawOrPostpone();
                break;
            case '03':
                console.log(config.ownAddresses.includes('addr'));
                showMenu();
                break;
            case '04':
                detectICO();
                console.log(inICO);
                showMenu();
                break;
            case '05':
                detectICO2().then(result => {
                    console.log(result);
                });
                setTimeout(showMenu, 3000);
                break;
            case '06':
                getGasSniper();
                showMenu();
                break;
            case '07':
                viewCurrentContractTime();
                showMenu();
                break;
            default: 
                console.log(`Invalid choice try again.`);
                showMenu();
                break;
        } 
    });
}

function sendBuy() {
    Sniper.initialize();
    var buySchema = {
        properties: {
          choice: {
            pattern: /^'yes'|'no'|'[Yy]'|'[nN]'|$/,
            description: colors.red('Are you sure you wish to buy keys?. (default: No) N/Y:'),
            message: 'Choice must be either yes or no',
            required: true
          }
        }
    };
    prompt.start();
    prompt.get(buySchema, function(err, res) {
        if (res.choice === 'y' || res.choice === 'yes'){
            Sniper.buyICOKeys();
            Sniper.reset();
            setTimeout(showMenu, 3000);
        } else {
            console.log(`Returning to menu.`);
            showMenu();
        }
    });
}

/**
 * Sends a cancel transaction manually.
 */
function sendCancel() {
    Sniper.initialize();

    setTimeout(Sniper.cancelTransaction, 3000);
    setTimeout(showMenu, 3000);
}

function sendWithdraw() {
    var withdrawSchema = {
        properties: {
          choice: {
            pattern: /^'yes'|'no'|'[Yy]'|'[nN]'|$/,
            description: colors.red('Withdraw is disabled. Override? (default: No) N/Y:'),
            message: 'Choice must be either yes or no',
            required: true
          }
        }
      };
    if (!config.sniper.enableWithdraw) {
        prompt.start();
        prompt.get(withdrawSchema, function(err, res) {
            if (res.choice === 'y' || res.choice === 'yes'){
                console.log("Overriding...");
                config.sniper.enableWithdraw = true;
                withdraw();
            } else {
                console.log(`Returning to menu.`);
                showMenu();
            }
        });
    } else {
        withdraw();
    }
}

function withdraw() {
    Sniper.initialize();
    // wait hack to initialize. (*ahem* unlock account)
    setTimeout(Sniper.withdraw, 3000);
    setTimeout(showMenu, 5000);
}

function getGasPrices() {
    Contract.getGasPrice().then(result => {
        let gasGwei = web3.utils.fromWei(result, 'gwei');
        if (gasGwei < 15) { 
            console.log(`Gas price is: ${colors.green(gasGwei)} gwei`);
        } else {
            console.log(`Gas price is: ${colors.red(gasGwei)} gwei`);
        }
    });
    setTimeout(showMenu, 3000);
}

function getGasSniper() {
    Sniper.calculateGasPrice(config.sniper.highGas).then(result => {
        console.log(`Chosen buy keys gas price is: ${result} max price is: ${config.sniper.highGas}`);
    });

    Sniper.calculateGasPrice(config.sniper.withdrawGas).then(result2 => {
        console.log(`Chosen withdraw gas price is: ${result2} max price is: ${config.sniper.withdrawGas}`);

    });
    setTimeout(showMenu, 3000);
}


function viewICO(){
    let rndNumber = 0;
    Contract.getCurrentRoundInfo().then(result => {
        console.log(`Viewing ICO for round ${result[1]}`);
        Contract.getICOPrice(result[1]).then(ico => {
            //let icoPrice = web3.utils.fromWei(web3.utils.toBN(ico), 'ether');
            let icoPrice = web3.utils.fromWei(ico, 'ether');

            console.log(`ICO price was: ${icoPrice}`);
            console.log(`Our buyin should have yielded ${config.sniper.buyin / icoPrice} keys`);
            setTimeout(showMenu, 3000);
        });
    });
    //Contract.getICOPrice(round);
}

function viewCurrentPlayer() {
    Contract.getCurrentRoundInfo().then(result => { 
        let addr = result [7];
        Contract.getBalanceAddress(addr).then(balanceRes => {
            console.log(`current player is: ${addr} with a balance of ${web3.utils.fromWei(balanceRes, 'ether')} ETH`);
        });
    });
    setTimeout(showMenu, 3000);

}

var inICO = false;

function detectICO() {
    
    Contract.getCurrentRoundInfo().then(result => {
        // convert getTime() to seconds.
        var currentTime = Math.round((new Date()).getTime() / 1000);
        var startTime = currentTime - 20;
        var difference = currentTime - startTime;
        inICO =  (difference <= config.sniper.abortICO);
        Utils.print((difference <= config.sniper.abortICO));
        Utils.debug(`${currentTime}, ${startTime}, ${difference}`);
        Utils.debug(`[Testing][DetectICO] We are in ICO: ${inICO}`);
        inICO = true; // fucking return is broken. 
    });
}

async function detectICO2() {
    
    var prom = Contract.getCurrentRoundInfo().then(result => {
        // convert getTime() to seconds.
        var currentTime = Math.round((new Date()).getTime() / 1000);
        var startTime = currentTime - 20;
        var difference = currentTime - startTime;
        inICO =  (difference <= config.sniper.abortICO);
        Utils.print(`${(difference <= config.sniper.abortICO)} <- detectICO`);
        Utils.debug(`${currentTime}, ${startTime}, ${difference}`, "info");
        Utils.debug(`[Testing][DetecftICO] We are in ICO: ${inICO}`, "info");
        return inICO;
    });

    return await prom;
}

function buyOneKey() {
    viewCurrentContractTime();
    Utils.print(`Buying one key...`);
    Sniper.initialize();
    setTimeout(Sniper.buyOneKey, 3000);

    setTimeout(Sniper.reset, 3000);
    setTimeout(showMenu, 5000);
}

function viewBotStatus() {
    Sniper.logPlayer(undefined, true);
    setTimeout(showMenu, 5000);
}

function viewCurrentContractTime() {
    Contract.getRemainingContractTime().then(result => {
        console.log(`Remaining contract time is: ${result}`);
    });
}

function exitProgram() {
    console.log("Exiting...");
    process.exit(2);
}

process.on('SIGINT', function () {
    Utils.print('Ctrl-C...');
    process.exit(2);
 });

init();