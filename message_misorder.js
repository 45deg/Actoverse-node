const actor = require('./actorlib/index.js');
const Actor = require('./actorlib/actor');

class Server extends Actor {
  constructor(client){
    super();
    this.client = client;
    this.resps = [];
  }
  receive(command, arg) {
    if(command == 'start') {
      this.send(this.client, 'set', 1);
      this.send(this.client, 'get', this.name);
      this.send(this.client, 'get', this.name);
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
  let client = sys.spawn('Client', 'a client')
  let server = sys.spawn('Server', 'a server', client);
  sys.send(server, 'start');
});
