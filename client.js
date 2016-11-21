const socket = require('socket.io-client')('http://localhost:3000');
const repl = require('repl');
const _ = require('lodash');
const EventEmitter = require('events').EventEmitter;

var WebSocket = require('ws');
var ws = new WebSocket('ws://localhost:3000');
var listener = new EventEmitter();

listener.on('DUMP_LOG', (log) => {
  var vectorClock = new Map();
  var timestampMap = new Map();
  for(let entry of _.flatten(_.values(log))) {
    console.log(`${entry.timestamp} [${entry.event} ${entry.pid} |${entry.body.data} ${entry.body.uid}]`)
  }
});

function send(data){
  ws.send(JSON.stringify(data));
}

ws.on('open', () => {
  console.log('connected');
  send({ type: 'dump_log' });
});
ws.on('message', (dataMsg) => {
  console.log('<IN<', dataMsg);
  var data = JSON.parse(dataMsg);
  listener.emit(data.event, data.body);
});

ws.on('close', () => {

});
