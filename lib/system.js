class System {
  constructor(master){
    this.master = master;
  }
  spawn(name, ...args){
    return this.master.spawn(name, ...args);
  }
  send(target, ...args){
    this.master.onMessage(null,{ type: 'send', target, sender: 0, data: args });
  }
}

module.exports = System;
