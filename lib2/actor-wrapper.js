const _ = require('lodash');
const process = require('process');

class ActorWrapper {
  constructor(actor){
    this.actor = actor;
    this.notify('ACTOR_CREATED', { name: actor.constructor.name, state: this.actor._getState() });
  }
  onMessage(message){
    console.log(process.pid, message)
    if(message.type === 'send') {
      this.notify('MESSAGE_RECEIVED', _.omit(message, 'type'));
      try {
        this.actor[this.actor._state](...message.data);
      } catch(e) {
        this.notify('RUNTIME_ERROR', { error: e.toString() });
      }
      this.notify('ACTOR_UPDATED', this.actor._getState());
    } else if(message.type === 'replace') {
      this.actor._replaceState(message.data);
      this.notify('ACTOR_REPLACED', { state: this.actor._getState() });
    } else {
      this.notify('PROTOCOL_ERROR', { error: 'Illegal Message Type' });
    }
  }
  notify(event, body){
    process.send({ event, body, pid : process.pid });
  }
}

module.exports = ActorWrapper;
