const process = require('process');

module.exports = class Actor {
  constructor(){
    this._state = "receive";
    this.$serial = 1;
  }
  send(target, ...args){
    process.send({ type:"send", sender: this.pid, target, data: args, serial: this.$serial++ });
  }
  become(listening) {
    this._state = listening;
  }
  exit() {
    this._state = 'exit';
  }
  get pid() { return this.$pid; }

  // internal functions
  _setPid(pid){ this.$pid = pid; }
  _getState() {
    var state = {};
    for(let name in this) {
      if(name[0] === '$') continue;
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
