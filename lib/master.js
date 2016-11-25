const _ = require('lodash');
const System = require('./system');
// const Server = require('socket.io');
const WebSocketServer = require('ws').Server;
const MessageFilter = require('./filter')

class Master {
  constructor(cluster){
    this.cluster = cluster;

    this.serialIds = new Map();
    this.logicTime = new Map();
    this.logicTime.set(0, 0);
    this.log = {};
    this.wss = new WebSocketServer({ port: 3000 });
    this.filter = new MessageFilter();
    this.messagePool = [];

    this.wss.on('connection', (ws) => {
      console.log('[SERVER OPEN]');
      ws.on('message', (messageString) => {
        var message = JSON.parse(messageString);
        if(message.type === 'rollback') {
          this.rollbackState(message.time);
        } else if(message.type === 'dump_log') {
          this.sendToClients({ event: 'DUMP_LOG', body: this.log });
        } else if(message.type === 'add_filter') {
          let id = this.filter.add(message.body);
          this.sendToClients({ event: 'ADD_SENSORSHIP', body: message.body, id });
        } else if(message.type === 'remove_filter'){
          this.filter.remove(message.id);
          this.sendToClients({ event:'REMOVE_SENSORSHIP', id: message.id });
        } else if(message.type == 'export_filters') {
          let filters = this.filter.export();
          this.sendToClients({ event:'EXPORT_SENSORSHIP', filters });
        } else if(message.type === 'select') {
          this.removePool(message.sender, message.serial);
        }
      });
    });
  }

  sendToClients(data){
    var dataString = JSON.stringify(data);
    this.wss.clients.forEach(function (client){
      console.log('[send]', dataString);
      client.send(dataString);
    });
  }

  createSystem(){
    return new System(this);
  }

  onMessage(worker, message){
    let pid = worker ? worker.process.pid : 0;
    if(!this.log[pid]) this.log[pid] = [];

    if(message.event) {
      if (message.event === 'ACTOR_CREATED') {
        this.logicTime.set(pid, 0);
      }
      if(message.event === 'MESSAGE_RECEIVED') {
        let timestamp = message.body.timestamp;
        this.logicTime.set(pid, Math.max(timestamp, this.logicTime.get(pid)) + 1);
      }
      message.timestamp = this.logicTime.get(pid);
      this.log[pid].push(_.omit(message, 'type'));
      this.sendToClients(_.omit(message, 'type'));
    }

    if(message.type === 'send') {
      message.timestamp = this.logicTime.get(message.sender);

      let entry = {
        event: 'SEND_MESSAGE',
        body: _.omit(message, 'type'),
        pid: pid,
        timestamp: message.timestamp,
      };
      this.log[pid].push(entry);
      this.sendToClients(entry);
      if(this.filter.match(message)) { // check filter
        this.addPool(message);
      } else {
        this.dispatch(message);
      }
    }
  }

  spawn(klass, ...args){
    let proc = this.cluster.fork({
      ACTOR_CLASS: klass,
      ACTOR_ARGUMENTS: JSON.stringify(args)
    });
    return proc.process.pid;
  }

  dispatch(message){
    let target = this.findWorker(message.target);
    target.send(message);
  }

  findWorker(pid) {
    for (let id in this.cluster.workers) {
      if(this.cluster.workers[id].process.pid == pid) {
        return this.cluster.workers[id];
      }
    }
    return null;
  }

  rollbackState(time){
    if(time == 0) return;
    let sended = [];
    let received = [];
    for(let pidString in this.log){
      let pid = pidString | 0;
      this.log[pid] = this.log[pid].filter(entry => entry.timestamp < time);
      this.mesasgePool = this.messagePool.filter(message => message.timestamp < time);
      for(let entry of this.log[pid]) {
        if(entry.event === 'SEND_MESSAGE') sended.push(entry.body);
        if(entry.event === 'MESSAGE_RECEIVED') received.push(entry.body);
      }
      this.logicTime.set(pid, Math.min(time - 1, this.logicTime.get(pid)));

      if(pid !== 0) {
        let lastUpdate = _.findLast(this.log[pid], e => e.event === 'ACTOR_UPDATED' || e.event === 'ACTOR_CREATED');
        let state = lastUpdate.event === 'ACTOR_CREATED' ?
                      lastUpdate.body.state :
                      lastUpdate.body
        this.dispatch({
          type: 'replace',
          data: state,
          target: pid,
        });
      }
    }

    // resending messages
    let resendingMessages = _.differenceBy(sended, received, 'serial');
    resendingMessages.forEach((origMsg) => {
      let message = Object.assign({type: 'send'}, origMsg);
      if(this.filter.match(message)) { // check filter
        this.addPool(message);
      } else {
        this.dispatch(message);
      }
    });
  }

  addPool(message){
    this.messagePool.push(message);
    let entry =
      {
        event: 'POOL_ADD',
        body: _.omit(message, 'type'),
        timestamp: message.timestamp,
      };
    this.log[0].push(entry);
    this.sendToClients(entry);
  }
  removePool(sender, serial){
    let index = this.messagePool.findIndex(msg => msg.sender === sender && msg.serial === serial );
    let message = this.messagePool.splice(index, 1)[0];
    let entry = {
      event: 'POOL_REMOVE',
      body: _.omit(message, 'type'),
      timestamp: message.timestamp,
    };
    this.log[0].push(entry);
    this.sendToClients(entry);
    this.dispatch(message);
  }
}

module.exports = Master;
