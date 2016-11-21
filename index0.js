const actor = require('./lib/index.js');
const actors = require('./actors');

actor(actors).start(function(sys){
  let cohorts = [sys.spawn('Cohort', true), sys.spawn('Cohort', true), sys.spawn('Cohort', true)];
  let coodinator = sys.spawn('Coordinator', cohorts);
  sys.send(coodinator, 'start_2pc');
});
