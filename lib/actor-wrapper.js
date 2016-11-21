const _ = require('lodash');
const process = require('process');

class ActorWrapper {
  constructor(actor){
    this.actor = actor;
    this.mailbox = [];
    this.notify('ACTOR_CREATED', { name: actor.constructor.name, state: this.actor._getState()});
  }
  onMessage(message){
    console.log(process.pid, message)
    if(message.type === 'send') {
      let msg = { sender: message.sender,
                  target: message.target,
                  data: message.data };
      this.mailbox.push(msg);
      this.notify('QUEUE_RECEIVED', msg);
    } else if(message.type === 'select') {
      let index = this.mailbox.findIndex(m => m.sender === message.sender &&
                                              _.isEqual(m.data, message.data));
      if(index < 0) {
        this.notify('PROTOCOL_ERROR', { error: 'Message Not Found' });
      } else {
        let selectedMsg = this.mailbox.splice(index, 1)[0];
        this.notify('QUEUE_CONSUMED', selectedMsg);
        try {
          this.actor[this.actor._state](...selectedMsg.data);
        } catch(e) {
          this.notify('RUNTIME_ERROR', { error: e.toString() });
        }
        this.notify('ACTOR_UPDATED', this.actor._getState());
      }
    } else if(message.type === 'replace') {
      this.mailbox = message.data.mailbox;
      this.actor._replaceState(message.data.state);
      this.notify('ACTOR_REPLACED', { state: this.actor._getState(),
                                      mailbox: this.mailbox });
    } else if(message.type === 'report') {
      this.notify('REPORT_STATE', { name: this.actor.constructor.name,
                                    state: this.actor._getState(),
                                    mailbox: this.mailbox,
                                    session: message.session });
    } else {
      this.notify('PROTOCOL_ERROR', { error: 'Illegal Message Type' });
    }
  }
  notify(event, body){
    process.send({ type:'response', event, body, pid : process.pid });
  }
}

module.exports = ActorWrapper;
