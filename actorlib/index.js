const cluster = require('cluster');
const process = require('process');
const Master = require('./master');
const ActorWrapper = require('./actor-wrapper');

function actor(actors){
  function start(callback){
    if (cluster.isMaster) {
      let master = new Master(cluster);
      cluster.on('message', (worker, message) => master.onMessage(worker, message));

      callback(master.createSystem());
    } else {
      let name = process.env['ACTOR_NAME'];
      let klass = process.env['ACTOR_CLASS'];
      let arguments = JSON.parse(process.env['ACTOR_ARGUMENTS']);
      let actor = new actors[klass](...arguments);
      actor._setName(name);

      let wrapper = new ActorWrapper(name, actor);
      process.on('message', (message) => wrapper.onMessage(message));
    }
  }

  return { start };
}

module.exports = actor;
