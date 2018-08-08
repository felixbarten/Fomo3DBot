/*
Author: Felix Barten
Name: ICO Timer
Version: 1.0
Description: Monitors the FOMO Short (or any FOMO3D contract for that matter) timer. If the timer ticks down to a threshold value an alert will sound. CLI implementation only.
*/

const Web3 = require('web3');
const PlayerBook = require('./playerbook.js');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
//const web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/metamask'));

//Contract needs correct ABI to handle requests.
contractAbi = JSON.parse(
'[{"constant":true,"inputs":[],"name":"getBuyPrice","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_affCode","type":"bytes32"},{"name":"_team","type":"uint256"},{"name":"_eth","type":"uint256"}],"name":"reLoadXname","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"activate","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"pIDxAddr_","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"airDropTracker_","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"round_","outputs":[{"name":"plyr","type":"uint256"},{"name":"team","type":"uint256"},{"name":"end","type":"uint256"},{"name":"ended","type":"bool"},{"name":"strt","type":"uint256"},{"name":"keys","type":"uint256"},{"name":"eth","type":"uint256"},{"name":"pot","type":"uint256"},{"name":"mask","type":"uint256"},{"name":"ico","type":"uint256"},{"name":"icoGen","type":"uint256"},{"name":"icoAvg","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"},{"name":"","type":"bytes32"}],"name":"plyrNames_","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"fees_","outputs":[{"name":"gen","type":"uint256"},{"name":"p3d","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"bytes32"}],"name":"pIDxName_","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_affCode","type":"uint256"},{"name":"_team","type":"uint256"},{"name":"_eth","type":"uint256"}],"name":"reLoadXid","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_nameString","type":"string"},{"name":"_affCode","type":"address"},{"name":"_all","type":"bool"}],"name":"registerNameXaddr","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":false,"inputs":[{"name":"_pID","type":"uint256"},{"name":"_addr","type":"address"},{"name":"_name","type":"bytes32"},{"name":"_laff","type":"uint256"}],"name":"receivePlayerInfo","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"},{"name":"","type":"uint256"}],"name":"rndTmEth_","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"rID_","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_pID","type":"uint256"}],"name":"getPlayerVaults","outputs":[{"name":"","type":"uint256"},{"name":"","type":"uint256"},{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_nameString","type":"string"},{"name":"_affCode","type":"bytes32"},{"name":"_all","type":"bool"}],"name":"registerNameXname","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[],"name":"getCurrentRoundInfo","outputs":[{"name":"","type":"uint256"},{"name":"","type":"uint256"},{"name":"","type":"uint256"},{"name":"","type":"uint256"},{"name":"","type":"uint256"},{"name":"","type":"uint256"},{"name":"","type":"uint256"},{"name":"","type":"address"},{"name":"","type":"bytes32"},{"name":"","type":"uint256"},{"name":"","type":"uint256"},{"name":"","type":"uint256"},{"name":"","type":"uint256"},{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_pID","type":"uint256"},{"name":"_rID","type":"uint256"}],"name":"calcPlayerICOPhaseKeys","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_affCode","type":"address"},{"name":"_team","type":"uint256"},{"name":"_eth","type":"uint256"}],"name":"reLoadXaddr","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_affCode","type":"uint256"},{"name":"_team","type":"uint256"}],"name":"buyXid","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":false,"inputs":[{"name":"_pID","type":"uint256"},{"name":"_name","type":"bytes32"}],"name":"receivePlayerNameList","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_nameString","type":"string"},{"name":"_affCode","type":"uint256"},{"name":"_all","type":"bool"}],"name":"registerNameXID","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_affCode","type":"address"},{"name":"_team","type":"uint256"}],"name":"buyXaddr","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"},{"name":"","type":"uint256"}],"name":"plyrRnds_","outputs":[{"name":"eth","type":"uint256"},{"name":"keys","type":"uint256"},{"name":"mask","type":"uint256"},{"name":"ico","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_affCode","type":"bytes32"},{"name":"_team","type":"uint256"}],"name":"buyXname","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"potSplit_","outputs":[{"name":"gen","type":"uint256"},{"name":"p3d","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"getTimeLeft","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_rID","type":"uint256"},{"name":"_eth","type":"uint256"}],"name":"calcKeysReceived","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_keys","type":"uint256"}],"name":"iWantXKeys","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"activated_","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"airDropPot_","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_rID","type":"uint256"}],"name":"calcAverageICOPhaseKeyPrice","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"plyr_","outputs":[{"name":"addr","type":"address"},{"name":"name","type":"bytes32"},{"name":"win","type":"uint256"},{"name":"gen","type":"uint256"},{"name":"aff","type":"uint256"},{"name":"lrnd","type":"uint256"},{"name":"laff","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"potSwap","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"_addr","type":"address"}],"name":"getPlayerInfoByAddress","outputs":[{"name":"","type":"uint256"},{"name":"","type":"bytes32"},{"name":"","type":"uint256"},{"name":"","type":"uint256"},{"name":"","type":"uint256"},{"name":"","type":"uint256"},{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"playerID","type":"uint256"},{"indexed":true,"name":"playerAddress","type":"address"},{"indexed":true,"name":"playerName","type":"bytes32"},{"indexed":false,"name":"isNewPlayer","type":"bool"},{"indexed":false,"name":"affiliateID","type":"uint256"},{"indexed":false,"name":"affiliateAddress","type":"address"},{"indexed":false,"name":"affiliateName","type":"bytes32"},{"indexed":false,"name":"amountPaid","type":"uint256"},{"indexed":false,"name":"timeStamp","type":"uint256"}],"name":"onNewName","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"compressedData","type":"uint256"},{"indexed":false,"name":"compressedIDs","type":"uint256"},{"indexed":false,"name":"playerName","type":"bytes32"},{"indexed":false,"name":"playerAddress","type":"address"},{"indexed":false,"name":"ethIn","type":"uint256"},{"indexed":false,"name":"keysBought","type":"uint256"},{"indexed":false,"name":"winnerAddr","type":"address"},{"indexed":false,"name":"winnerName","type":"bytes32"},{"indexed":false,"name":"amountWon","type":"uint256"},{"indexed":false,"name":"newPot","type":"uint256"},{"indexed":false,"name":"P3DAmount","type":"uint256"},{"indexed":false,"name":"genAmount","type":"uint256"},{"indexed":false,"name":"potAmount","type":"uint256"},{"indexed":false,"name":"airDropPot","type":"uint256"}],"name":"onEndTx","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"playerID","type":"uint256"},{"indexed":false,"name":"playerAddress","type":"address"},{"indexed":false,"name":"playerName","type":"bytes32"},{"indexed":false,"name":"ethOut","type":"uint256"},{"indexed":false,"name":"timeStamp","type":"uint256"}],"name":"onWithdraw","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"playerAddress","type":"address"},{"indexed":false,"name":"playerName","type":"bytes32"},{"indexed":false,"name":"ethOut","type":"uint256"},{"indexed":false,"name":"compressedData","type":"uint256"},{"indexed":false,"name":"compressedIDs","type":"uint256"},{"indexed":false,"name":"winnerAddr","type":"address"},{"indexed":false,"name":"winnerName","type":"bytes32"},{"indexed":false,"name":"amountWon","type":"uint256"},{"indexed":false,"name":"newPot","type":"uint256"},{"indexed":false,"name":"P3DAmount","type":"uint256"},{"indexed":false,"name":"genAmount","type":"uint256"}],"name":"onWithdrawAndDistribute","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"playerAddress","type":"address"},{"indexed":false,"name":"playerName","type":"bytes32"},{"indexed":false,"name":"ethIn","type":"uint256"},{"indexed":false,"name":"compressedData","type":"uint256"},{"indexed":false,"name":"compressedIDs","type":"uint256"},{"indexed":false,"name":"winnerAddr","type":"address"},{"indexed":false,"name":"winnerName","type":"bytes32"},{"indexed":false,"name":"amountWon","type":"uint256"},{"indexed":false,"name":"newPot","type":"uint256"},{"indexed":false,"name":"P3DAmount","type":"uint256"},{"indexed":false,"name":"genAmount","type":"uint256"}],"name":"onBuyAndDistribute","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"playerAddress","type":"address"},{"indexed":false,"name":"playerName","type":"bytes32"},{"indexed":false,"name":"compressedData","type":"uint256"},{"indexed":false,"name":"compressedIDs","type":"uint256"},{"indexed":false,"name":"winnerAddr","type":"address"},{"indexed":false,"name":"winnerName","type":"bytes32"},{"indexed":false,"name":"amountWon","type":"uint256"},{"indexed":false,"name":"newPot","type":"uint256"},{"indexed":false,"name":"P3DAmount","type":"uint256"},{"indexed":false,"name":"genAmount","type":"uint256"}],"name":"onReLoadAndDistribute","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"affiliateID","type":"uint256"},{"indexed":false,"name":"affiliateAddress","type":"address"},{"indexed":false,"name":"affiliateName","type":"bytes32"},{"indexed":true,"name":"roundID","type":"uint256"},{"indexed":true,"name":"buyerID","type":"uint256"},{"indexed":false,"name":"amount","type":"uint256"},{"indexed":false,"name":"timeStamp","type":"uint256"}],"name":"onAffiliatePayout","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"roundID","type":"uint256"},{"indexed":false,"name":"amountAddedToPot","type":"uint256"}],"name":"onPotSwapDeposit","type":"event"}]'
);
//Address to contract
var contractAddr = "0x4e8ecF79AdE5e2C49B9e30D795517A81e0Bf00B8";
// set default account 
web3.eth.defaultAccount = web3.eth.accounts[0];
//create contract variable
var FOMOShortContract = new web3.eth.Contract(contractAbi, contractAddr);

// set threshold to 30 seconds. 
var threshold = 30;
var currentPlayerAddr = "";
var currentPlayerBalance = 0.0;

/*
Function main will be the starting point of this application and will start the infinite loop of getRemainingTime() and loop()
*/
function main() {
	console.log(timestamp() + "Starting ICO polling");
	console.log(timestamp() + "Working with contract: " + contractAddr);
	
	getRemainingTime();
}

/*
Loop determines the amount of time to wait untill the next polling query is sent
*/
function loop(timeleft) {

	console.log(timestamp() + "Time left on contract: " + timeleft + " seconds");	
	getCurrentPlayer();
	
	if (timeleft == NaN) {
		console.log(timestamp() + "RPC not working");
		setTimeout(getRemainingTime, 10000);
	}
	
	if (timeleft < threshold + 5) {
		// notify user. 
		console.log("WAKE UP");
		notifyAll();
		setTimeout(getRemainingTime, 3000);
	} else {
		if (timeleft <60) {
			console.log(timestamp() + "Polling for next Ethereum block");
			setTimeout(getRemainingTime, 5000);
		} else {
			if (timeleft < 90) {
				// sleep for 20 sec if close.
				setTimeout(getRemainingTime, 20000)
			} else {
				console.log(timestamp() + "Waiting 60 seconds");
				setTimeout(getRemainingTime, 60000)
			}
		}
	}

}
// Sends repeating beeping sound
function notifyAll() {
	notify();
	for( i =0; i< 5; i++) {
		setTimeout(notify, 1000);
	}
}

// Whenever this is printed it will emit a system "beep". 
function notify() {
	console.log("\007");
}

function outputPlayer(player, balance) {
	setTimeout(dummyfunc, 1000);
	 
	if (currentPlayerBalance !== 0.0) { 
		console.log("Current Exitscammer is: " + currentPlayerAddr + " With an Ether balance of: " + weiToETH(currentPlayerBalance));
	} else {
		console.log("Current Exitscammer is: " + currentPlayerAddr);
	}
}

function fancyOutput(playerObj) {
	var displayStr = web3.utils.hexToUtf8(playerObj.name);
	console.log("Current Exitscammer is: " + displayStr + " With an Ether balance of: " + weiToETH(playerObj.balance));
}

function weiToETH(value) {
	return value / 1000000000000000000;
}

function dummyfunc() {
	// do nothing
}

function getCurrentPlayer() {
	var result = FOMOShortContract.methods.getCurrentRoundInfo().call()
	.then(function(res) {
		currentPlayerAddr = res[7];
		// check if player is in book
		var player = PlayerBook.processPlayer(currentPlayerAddr);
		if (player == null) {
			outputPlayer(res, getBalance());
		} else {
			fancyOutput(player);
		}
	}, function(fail) {
		console.log("Current Round Call failed: " + fail);
	});
	//var res = Promise.resolve(result);
	//console.log(res);
}

function getBalance() {
	if (currentPlayerAddr == undefined) {
		console.log("Address not set");
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
		console.log(fail);
		return NaN;
	});
	
	return balancePromise;
}

// same as getBalance but takes address argument.
function getBalanceAddr(addr) {
	if (addr == undefined) {
		console.log("Address not set");
		return NaN;
	}
	//console.debug("Fetching balance for: " + addr); 
	var balancePromise = web3.eth.getBalance(addr)
	.then(function(value) {
		var eth = value / 1000000000000000000;
		currentPlayerBalance = eth;
		return eth;
		// Why doesn't this work? ^^
	}, function(fail) {
		console.log(fail);
		return NaN;
	});
	
	return balancePromise;
}


// Call contract for time remaining. 
function getRemainingTime() {
	var result = FOMOShortContract.methods.getTimeLeft().call()
	.then(function(value) {
		loop(value); 
	}, function(failure) {
		console.log(timestamp() + "Failed to get promise object");
		console.error(failure);
		return NaN;
	});
	
	var val = Promise.resolve(result);
	return val;
}

// Prepend timestamps for each written log. 
function timestamp() {
	var d = new Date();
	var time = d.getTime();
	return "[" + d.toLocaleTimeString() + "] ";
}

main();
