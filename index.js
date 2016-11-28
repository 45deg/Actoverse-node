const actor = require('./lib/index.js');
const Actor = require('./lib/actor');

class Coordinator extends Actor {
  constructor(cohorts) {
    super();
    this.cohorts = cohorts;
    this.responses = [];
  }
  receive(command, arg) {
    if (command === 'start_2pc') {
      this.broadcast('query', this.name);
    } else if (command === 'agreement') {
      this.responses.push(arg);
      if (this.responses.length === this.cohorts.length) {
        // finished
        if (this.responses.every(e => e)) {
          this.broadcast('commit', this.name);
        } else {
          this.broadcast('rollback', this.name);
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
  receive(command, name) {
    if (command === 'query') {
      this.send(name, 'agreement', this.decision);
    } else if (command === 'commit') {
      // commit code here
      setTimeout(() => {
        this.send(name, 'commit_ack');
      }, 1000);
    } else if (command === 'rollback') {
      // rollback code here
      this.send(name, 'rollback_ack');
    }
  }
}

actor({ Coordinator, Cohort }).start(function(sys){
  let cohorts = [sys.spawn('Cohort', 'cohort-1', true), sys.spawn('Cohort', 'cohort-2', true), sys.spawn('Cohort', 'cohort-3', true)];
  let coordinator = sys.spawn('Coordinator', 'coordinator', cohorts);
  sys.send(coordinator, 'start_2pc');
});
