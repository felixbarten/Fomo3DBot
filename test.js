'use_strict';
const config = require('./config');
const Web3 = require('web3');
var beep = require('beepbeep');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
const Sniper = require('./sniper.js');

			
async function getPlayerBalance(addr) {
	try {
		if (addr == undefined) {
			console.log("Address not set");
			return NaN;
		}
		return await web3.eth.getBalance(addr);
	} catch(e) {
		console.log(e);
		throw e;
	}
	return NaN;
}

		var balancePromise = getPlayerBalance("addr").then(result => {
			
			console.log(result);

		});
		

async function getInternalTransactions(addr) {
	

}	

// Sends repeating beeping sound
function notifyAll() {
    notify();
	console.log("second");
	setTimeout(notify, 3000);
	console.log("third");

	setTimeout(notify, 3000);
	console.log("fourth");

	setTimeout(notify, 3000);
	console.log("fifth");

	setTimeout(notify, 3000);
	console.log("sixth");

}

// Whenever this is printed it will emit a system "beep".
function notify() {
    process.stdout.write("\007");
}


function notifyTest() {
	console.log("calling notifyAll")
	notifyAll();
	setTimeout(() => {console.log("notifying again"); }, 1500);
	notifyAll();

}

function beepTest() {
	beep(10, 1000);
}


function main() {
	//Sniper.sniperTests();

	Sniper.gasPriceTest();
}

main();
//notifyTest();