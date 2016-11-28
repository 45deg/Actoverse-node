const _ = require('lodash');
const System = require('./system');
// const Server = require('socket.io');
const WebSocketServer = require('ws').Server;
const MessageFilter = require('./filter')

class Master {
  constructor(cluster){
    this.cluster = cluster;

    this.namings = new Map();
    this.serialIds = new Map();
    this.logicTime = new Map();
    this.logicTime.set('master', 0);
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
    //let pid = worker ? worker.process.pid : 0;
    let name = worker ? [...this.namings].find(e => e[1] === worker.id)[0]
                      : 'master';
    if(!this.log[name]) this.log[name] = [];

    if(message.event) {
      if (message.event === 'ACTOR_CREATED') {
        this.logicTime.set(name, 0);
      }
      if(message.event === 'MESSAGE_RECEIVED') {
        let timestamp = message.body.timestamp;
        this.logicTime.set(name, Math.max(timestamp, this.logicTime.get(name)) + 1);
      }
      message.timestamp = this.logicTime.get(name);
      this.log[name].push(_.omit(message, 'type'));
      this.sendToClients(_.omit(message, 'type'));
    }

    if(message.type === 'send') {
      message.timestamp = this.logicTime.get(message.sender);

      let entry = {
        event: 'SEND_MESSAGE',
        body: _.omit(message, 'type'),
        name: name,
        timestamp: message.timestamp,
      };
      this.log[name].push(entry);
      this.sendToClients(entry);
      if(this.filter.match(message)) { // check filter
        this.addPool(message);
      } else {
        this.dispatch(message);
      }
    }
  }

  spawn(klass, name, ...args){
    let proc = this.cluster.fork({
      ACTOR_NAME: name,
      ACTOR_CLASS: klass,
      ACTOR_ARGUMENTS: JSON.stringify(args)
    });
    this.namings.set(name, proc.id);
    return name;
  }

  dispatch(message){
    console.log(message)
    let target = this.findWorker(message.target);
    target.send(message);
  }

  findWorker(name) {
    return this.cluster.workers[this.namings.get(name)] || null;
  }

  rollbackState(time){
    if(time == 0) return;
    let sended = [];
    let received = [];
    for(let name in this.log){
      this.log[name] = this.log[name].filter(entry => entry.timestamp < time);
      this.mesasgePool = this.messagePool.filter(message => message.timestamp < time);
      for(let entry of this.log[name]) {
        if(entry.event === 'SEND_MESSAGE') sended.push(entry.body);
        if(entry.event === 'MESSAGE_RECEIVED') received.push(entry.body);
      }
      this.logicTime.set(name, Math.min(time - 1, this.logicTime.get(name)));

      if(name !== 'master') {
        let lastUpdate = _.findLast(this.log[name], e => e.event === 'ACTOR_UPDATED' || e.event === 'ACTOR_CREATED');
        let state = lastUpdate.event === 'ACTOR_CREATED' ?
                      lastUpdate.body.state :
                      lastUpdate.body
        this.dispatch({
          type: 'replace',
          data: state,
          target: name,
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
    this.log['master'].push(entry);
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
    this.log['master'].push(entry);
    this.sendToClients(entry);
    this.dispatch(message);
  }
}

module.exports = Master;
