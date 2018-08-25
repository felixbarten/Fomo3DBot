'use_strict';

const config = require('./config');
const Web3 = require('web3');
const PlayerBook = require('./playerbook.js');
const Utils = require('./utils.js');
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.nodeWS));
const infura = new Web3(new Web3.providers.HttpProvider(config.fallbackNode));
const Contract = require('./contract.js');
var blocks = [];
var blocksToSave = 20;


function calcAVGBlockTime() {
    let blockTime = NaN;
    let avgBlockTime = 0;
    if (blocks.length > 2) {
        blockTime = (blocks[blocks.length - 1].timestamp - blocks[0].timestamp);
        avgBlockTime = blockTime / blocks.length;
        Utils.debug(`Timestamp of last block: ${blocks[blocks.length - 1].timestamp} Timestamp of newest block: ${blocks[0].timestamp} \n ${blockTime}`);
        Utils.debug(`Average block time over ${blocks.length} blocks: ${avgBlockTime}`);

    }
    return avgBlockTime;
}

function addBlock(block) {
    if (blocks.length > blocksToSave) {
        removeBlocks();
    }
    if (block === undefined) {
        getLastBlock().then(result => {
            blocks.push(result);
        });
    } else {
        blocks.push(block);
    }
}

function removeBlocks() {
    // prune blocks until blocks back to normal size. 
    while (blocks.length > blocksToSave) {
        removeBlock();
    }
}

function removeBlock() {
    // fifo.
    blocks.splice(0, 1);
}

function updateBlockInformation(block) {
    addBlock(block);
}

function displayBlockTime() {
    Utils.print(`Current average block time over last 20 blocks is: ${calcAVGBlockTime()} seconds`);
}


module.exports = {
    displayBlockTime: displayBlockTime,
    calcAVGBlockTime: calcAVGBlockTime,
    updateBlockInformation: updateBlockInformation
}