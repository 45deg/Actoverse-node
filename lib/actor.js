const process = require('process');

module.exports = class Actor {
  constructor(){
    this._state = "receive";
  }
  send(target, ...args){
    process.send({ type:"send", sender: this.pid, target, data: args });
  }
  become(listening) {
    this._state = listening;
  }
  exit() {}
  get pid() { return this._pid; }

  // internal functions
  _setPid(pid){ this._pid = pid; }
  _getState() {
    var state = {};
    for(let name in this) {
      state[name] = this[name];
    }
    return state;
  }
  _replaceState(state){
    for(let name in state) {
      this[name] = state[name];
    }
  }
}
