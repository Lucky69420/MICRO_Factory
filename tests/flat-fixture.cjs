// Existing logistics/combat tests use fixed coordinates on unobstructed ground.
// Procedural terrain and integration behavior are covered separately in terrain.cjs.
const API=require('../dist/simulation.js');
class Game extends API.Game {constructor(config={}){super({terrain:false,...config})}}
module.exports={...API,Game};
