const _ = require('lodash');

class MessageFilter {
  constructor(){
    this.filters = new Map();
    this.uniq = 0;
  }
  add(filter){
    let id = this.uniq++;
    this.filters.set(id, filter);
    return id;
  }
  remove(key){
    this.filters.delete(key);
  }
  match(message){
    for(let filter of this.filters.values()) {
      console.log(filter, message)
      if(filter.type == 'sender_name') {
        if(message.sender == filter.value) return true;
      }
      if(filter.type == 'target_name') {
        console.log(filter, message)
        if(message.target == filter.value) return true;
      }
      if(filter.type == 'partial_match') {
        if(_.isMatch(message.data, filter.value)) return true;
      }
      if(filter.type == 'perfect_match') {
        if(_.isEqual(message.data, filter.value)) return true;
      }
      if(filter.type == 'any') {
        return true;
      }
    }
    return false;
  }
  export(){
    var retval = [];
    for(let [id, filter] of this.filters) {
      retval.push(Object.assign({ id }, filter));
    }
    return retval;
  }
}
module.exports = MessageFilter;
// { type: 'sender', arg: 289, action: 'stop' }
