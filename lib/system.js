class System {
  constructor(master){
    this.master = master;
  }
  spawn(klass, name, ...args){
    return this.master.spawn(klass, name, ...args);
  }
  send(target, ...args){
    this.master.onMessage(null,{ type: 'send', target, sender: 'master', data: args });
  }
}

module.exports = System;
