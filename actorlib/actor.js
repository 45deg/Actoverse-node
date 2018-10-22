const process = require('process');

module.exports = class Actor {
  constructor(){
    this._state = "receive";
    this.$uid = 1;
  }
  send(target, ...args){
    process.send({ type:"send", sender: this.name, target, data: args, uid: this.name + "_" + (this.$uid++) });
  }
  become(listening) {
    this._state = listening;
  }
  exit() {
    this._state = 'exit';
  }
  get name() { return this.$name; }
  get sender() { return this.$sender; }

  // internal functions
  _setName(name){ this.$name = name; }
  _setSender(sender) { this.$sender = sender; }
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
