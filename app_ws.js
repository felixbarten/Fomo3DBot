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
// web libs:
const bodyParser = require('body-parser');
const prompt = require('prompt'); //https://www.npmjs.com/package/prompt
const express = require('express');
//const connection = require('connect');
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
//var __dirname = './public';


app.get('/', function(req, res){
    res.sendFile(__dirname + '/public/index_ws.html');
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

io.on('connection', function(socket){
    console.log('a user connected');
});

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
});