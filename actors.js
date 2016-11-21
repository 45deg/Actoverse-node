const process = require('process');

class Actor {
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

class Coordinator extends Actor {
  constructor(cohorts) {
    super();
    this.cohorts = cohorts;
    this.responses = [];
  }
  receive(command, arg) {
    if (command === 'start_2pc') {
      this.broadcast('query', this.pid);
    } else if (command === 'agreement') {
      this.responses.push(arg);
      if (this.responses.length === this.cohorts.length) {
        // finished
        if (this.responses.every(e => e)) {
          this.broadcast('commit', this.pid);
        } else {
          this.broadcast('rollback', this.pid);
        }
        this.responses = [];
        this.become('waitAcknowledgements');
      }
    }
  }
  waitAcknowledgements(arg) {
    this.responses.push(arg);
    if (this.responses.length === this.cohorts.length) {
      this.exit();
    }
  }
  broadcast(...args) {
    for (let cohort of this.cohorts) {
      this.send(cohort, ...args);
    }
  }
}

// cohort
class Cohort extends Actor {
  constructor(decision) {
    super();
    this.decision = decision;
  }
  receive(command, pid) {
    if (command === 'query') {
      this.send(pid, 'agreement', this.decision);
    } else if (command === 'commit') {
      // commit code here
      setTimeout(() => { 
        this.send(pid, 'commit_ack');
      }, 1000);
    } else if (command === 'rollback') {
      // rollback code here
      this.send(pid, 'rollback_ack');
    }
  }
}

module.exports.Coordinator = Coordinator;
module.exports.Cohort = Cohort;
