const _ = require('lodash');
const System = require('./system');
// const Server = require('socket.io');
const WebSocketServer = require('ws').Server;

class Master {
  constructor(cluster){
    this.cluster = cluster;

    this.wss = new WebSocketServer({ port: 3000 });

    this.session = [];
    this.wss.on('connection', (ws) => {
      console.log('[SERVER OPEN]');
      ws.on('message', (messageString) => {
        var message = JSON.parse(messageString);
        console.log(message);
        if(message.type === 'select' || message.type === 'replace') {
          this.dispatch(message);
        } else if (message.type === 'report') {
          let sessionId = this.session.length;
          this.session[sessionId] = { values: [], rest: 0 };
          for (let id in this.cluster.workers) {
            this.session[sessionId].rest++;
            cluster.workers[id].send({ type: 'report', session: sessionId });
          }
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

    if(message.type === 'response') {
      if(message.event === 'REPORT_STATE') {
        let sessionId = message.body.session;
        let session = this.session[sessionId];
        let body = message.body;
        session.values.push({
          name: body.name,
          state: body.state,
          mailbox: body.mailbox,
          pid: worker.process.pid,
        });
        session.rest--;
        if(session.rest === 0) {
          this.sendToClients({ event: 'REPORT_STATE', body: session.values });
          this.session[sessionId] = null;
        }
      } else {
        this.sendToClients(_.omit(message, 'type'));
      }
    }

    if(message.type === 'send') {
      this.sendToClients({ event: 'SEND_MESSAGE', body: _.omit(message, 'type'), pid: worker.process.pid });
      this.dispatch(message);
    }
  }

  spawn(name, ...args){
    let proc = this.cluster.fork({
      ACTOR_NAME: name,
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


}

module.exports = Master;
