'use_strict';
//#region imports
const config = require('./config');
const Web3 = require('web3');
const fs = require('fs');
const web3 = new Web3(new Web3.providers.HttpProvider(config.node));
const logFile = fs.createWriteStream(config.outputLog, {flags: 'a'});
const debugLog = fs.createWriteStream(config.debugLog, {flags: 'a'});
const errorLog = fs.createWriteStream(config.errorLog, {flags: 'a'});
//#endregion

//Convert wei to ETH.
function weiToETH(value) {
    return web3.utils.fromWei(value, 'ether');
}

// Prepend timestamps for each written log.
function timestamp() {
    var d = new Date();
    return "[" + d.toLocaleTimeString() + "] ";
}

/**
 * Adds characters until {message} is the same length as len parameter. If no character is provided defaults to spaces.
 * @param {string} message
 * @param {number} len
 * @param {char} character
 */
function padLength(message, len, character){
    if(character == undefined) {
        character = " ";
    }
    for (var i = message.length; i < len; i++){
        message += character;
    }
    return message;
}

/**
 * Write debugging messages to debug log. Optional flag for writing debug messages to regular log.
 * @param {string} message
 * @param {boolean} writeToLog
 */
function debug(message, writeToLog) {
    var msg = timestamp() + "[DEBUG] " + message + '\n';
    debugLog.write(msg);
    if(writeToLog != undefined && writeToLog) {
        logFile.write(msg);
    }
}

/**
 * Write error messages to error log file. Optional flag for writing messages to regular log.
 * @param {string} message
 * @param {string} errorLevel
 * @param {boolean} writeToLog
 */
function error(message, errorLevel, writeToLog, printStackTrace) {
    let stackTrace = printStackTrace || false;
    var msg = timestamp() + "[" + errorLevel +"] " + message + '\n';
    errorLog.write(msg);
    if(writeToLog != undefined && writeToLog) {
        logFile.write(msg);
    }
    if (stackTrace) {
        logStackTrace();
    }
}

function logStackTrace(printToConsole) {
    var stack = new Error().stack;
    errorLog.write(timestamp() + "Stacktrace: " + stack);
    if (printToConsole) {
        console.log(stack);
    }
}

function printToLog(message) {
    logFile.write(timestamp() + message + '\n');
}

/**
 * Prints message to log file and stdout.
 * @param {string} message
 */
function print(message) {
    process.stdout.write(timestamp() + message + '\n');
    logFile.write(timestamp() + message + '\n');
}

function separateLines() {
    console.log(padLength("<", 76, "-") + ">");
}

/**
 * Closes output streams before exiting.
 */
function exitProgram() {
    logFile.close();
    debugLog.close();
    errorLog.close();
}

module.exports = {
    debug: debug,
    error: error,
    padLength: padLength,
    timestamp: timestamp,
    print: print,
    weiToETH: weiToETH,
    exitProgram: exitProgram,
    logStackTrace: logStackTrace,
    insertDividerLine: separateLines
};