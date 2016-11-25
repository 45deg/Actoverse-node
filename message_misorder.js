const actor = require('./lib/index.js');
const Actor = require('./lib/actor');

class Server extends Actor {
  constructor(client){
    super();
    this.client = client;
    this.resps = [];
  }
  receive(command, arg) {
    if(command == 'start') {
      this.send(this.client, 'set', 1);
      this.send(this.client, 'get', this.pid);
      this.send(this.client, 'get', this.pid);
    } else if(command == 'response') {
      this.resps.push(arg);
    }
  }
}

class Client extends Actor {
  constructor(){
    super();
    this.value = null;
  }
  receive(command, arg) {
    if(command == 'set') {
      this.value = arg;
    } else if(command == 'get') {
      this.send(arg, 'response', this.value);
    }
  }
}

actor({ Server, Client }).start(function(sys){
  let client = sys.spawn('Client')
  let server = sys.spawn('Server', client);
  sys.send(server, 'start');
});
