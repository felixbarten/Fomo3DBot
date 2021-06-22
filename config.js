const fs = require('fs');
const env = process.env.NODE_ENV; // 'dev' or 'test'

// method for describing right config either by polling node.js ENV var or by arguments. 
var fomoshort = JSON.parse(fs.readFileSync('./contracts/fomoshort.json', 'utf8'));

// default config is FOMOShort.
const config = {
    // address of node
    node: 'http://localhost:8545',
    nodeWS: 'ws://localhost:8546',
    fallbackNode: 'http://mainnet.infura.io',
    connectionMode: 'ws',
    //contract to interact with
    contractAddress: fomoshort.address,
    contractABI: fomoshort.ABI,
    contractMaxTime: fomoshort.maxTime,
    outputLog: './logs/output.log',
    debugLog: './logs/debug.log',
    errorLog: './logs/errors.log',
    timerThreshold: 40,
    debugging: {
        isEnabled: true,
        debugLevel: "info",
    },
    ICO: true,
    useTimeColors: true,
    isMuted: true,
    //scale from 0 to 2 with 2 being the most logging
    notificationSeverity: 0,
    useAscii: false,
    playerBook: {
        display: true,
        // remove player after not bidding for 60 minutes
        inactive: 60,
        // display every X blocks
        displayFreq: 30
    },
    sniper: {
        isEnabled: true,
        logFile: './logs/transactions.log',
        accountLog: './logs/account.log',
        transactionStorage: './logs/transactions.json',
        /*
        If you're using internal eth accounts on your Ethereum Node no private key is necessary. If you have an existing account it can also be imported into the node. 
        Otherwise specify private key for address. Bare in mind that this config file should be secured if you're exposing your private key in it. If the config is accessible to a malicious process all the funds may be drained from the bot account. 
        */
        walletAddr: "",
        privateKey: "",
        passphrase: "",
        useAffiliate: true,
        // Author's affiliate address.
        affiliateAddress: "",
        useWeb3Accounts: true,
        // toggle for using private key or passphrase.
        usePrivateKey: false,
        ICOGas: '15',
        withdrawGas: '10',
        cancelGas: '21',
        // team for buying into ICO.
        ICOteam: "snek",
        // team for buying when trying to win
        KeyTeam: "bear", 
        // enable withdrawing from the contract.
        enableWithdraw: true,
        withdrawThreshold: 0.05,
        // buyin in string in ETHER. 
        buyin: '0.025',
        // aborts sending transactions if gas price is higher than highGas gwei.      
        highGas: 15,
        // aborts sending transactions if avg of last 20 blocks is higher than: highBlockTime
        highBlockTime: 25,
        abortICO: 30,
        debugging: {
            transferAddr: ''
        }
    },
    testnet: false,
    // add your own addresses here so the bot can see if you're in the lead.
    ownAddresses: [
        '',
        '',
        '',
        ''
    ]
};

var args = process.argv.slice(2);
// Swap contract addr and ABI

// I should probably get a framework for this.
for (let arg of args) { 
    // swap contracts
    if (arg == "long" || arg == "fomolong") {
        var fomolong = JSON.parse(fs.readFileSync('./contracts/fomolong.json', 'utf8'));
        config.contractAddress = fomolong.address;
        config.contractABI = fomolong.ABI;
        config.timerThreshold = 75;
        config.errorLog = './logs/fomolongerr.log';
        config.debugLog = './logs/fomolongdebug.log';
        config.outputLog = './logs/fomolongout.log';
        config.sniper.isEnabled = false;
    }

    if (arg === "test" || arg === "testnet") {
        config.nodeWS = 'ws://localhost:4000';
        config.testnet = true;
        config.sniper.isEnabled = true;
    }

    if (arg === "mute" || arg === "nosound") {
        config.isMuted = true;
    }

    if (arg === "sound" || arg === "unmute") {
        config.isMuted = false;
    }

    if (arg === "nobuy" || arg === "noico" || arg === "disable sniper") {
        config.sniper.isEnabled = false;
    }

    if (arg === "ascii" || arg === "couch" || arg === "obnoxious") {
        config.useAscii = true;
    }
    if (arg === "nowithdraw") {
        config.sniper.enableWithdraw = false;
    }
}



module.exports = config;
