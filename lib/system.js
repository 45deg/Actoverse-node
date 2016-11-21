class System {
  constructor(master){
    this.master = master;
  }
  spawn(name, ...args){
    return this.master.spawn(name, ...args);
  }
  send(target, ...args){
    this.master.dispatch({ type: 'send', target, sender: null, data: args });
  }
}

module.exports = System;
