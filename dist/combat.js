// Combat is simulation-owned. Path searches share a bounded per-tick BFS budget;
// targeting queries use chunk buckets, independent of the camera.
(function(root){
'use strict';
const D=[[0,1],[1,0],[-1,0],[0,-1]];
class Combat {
 constructor(game){this.game=game;this.enemies=new Map();this.projectiles=[];this.effects=[];this.spatial=new Map();this.enabled=false;this.spawnTimer=0;this.nextId=1;this.pathJob=null;this.pathNodes=0}
 spawn(x=this.game.spawner.x+1.5,y=1.5){const c=this.game.config;if(this.enemies.size>=c.enemyCap)return null;const e={id:this.nextId++,x,y,previousX:x,previousY:y,hp:c.enemyHp,maxHp:c.enemyHp,path:null,pathIndex:0,target:null,attackTimer:0,repathAt:0};this.enemies.set(e.id,e);return e}
 clear(){this.enemies.clear();this.projectiles.length=0;this.effects.length=0;this.spatial.clear();this.pathJob=null;this.spawnTimer=0;for(const b of this.game.turrets){b.target=null;b.flash=0}}
 index(){this.spatial.clear();const s=this.game.config.chunkSize;for(const e of this.enemies.values()){const key=Math.floor(e.x/s)+','+Math.floor(e.y/s);let bucket=this.spatial.get(key);if(!bucket)this.spatial.set(key,bucket=[]);bucket.push(e)}}
 nearest(x,y,range){const s=this.game.config.chunkSize;let best=null,distance=range*range;for(let cy=Math.floor((y-range)/s);cy<=Math.floor((y+range)/s);cy++)for(let cx=Math.floor((x-range)/s);cx<=Math.floor((x+range)/s);cx++)for(const e of this.spatial.get(cx+','+cy)||[]){if(e.hp<=0)continue;const d=(e.x-x)**2+(e.y-y)**2;if(d<distance||d===distance&&(!best||e.id<best.id)){distance=d;best=e}}return best}
 adjacent(e,b){return !!b&&!b.removed&&e.x>=b.x-.5&&e.x<=b.x+b.size+.5&&e.y>=b.y-.5&&e.y<=b.y+b.size+.5&&Math.hypot(Math.max(b.x-e.x,0,e.x-b.x-b.size),Math.max(b.y-e.y,0,e.y-b.y-b.size))<=.51}
 startPath(e){const grid=this.game.grid,w=grid.width,start=grid.key(Math.floor(e.x),Math.floor(e.y)),parent=new Int32Array(w*grid.height);parent.fill(-2);parent[start]=-1;this.pathJob={e,parent,queue:[start],head:0,version:this.game.network.version}}
 paths(){const g=this.game,grid=g.grid,w=grid.width;this.pathNodes=0;if(this.pathJob&&!this.enemies.has(this.pathJob.e.id))this.pathJob=null;if(!this.pathJob){const e=[...this.enemies.values()].find(e=>!e.path&&!e.target&&e.repathAt<=g.time);if(e)this.startPath(e)}const job=this.pathJob;if(!job)return;
 while(job.head<job.queue.length&&this.pathNodes<g.config.pathNodesPerTick){this.pathNodes++;const key=job.queue[job.head++],x=key%w,y=Math.floor(key/w);for(const [dx,dy] of D){const nx=x+dx,ny=y+dy;if(!grid.inside(nx,ny))continue;const b=grid.get(nx,ny);if(b){const path=[];let k=key;while(job.parent[k]!==-1){path.push([k%w+.5,Math.floor(k/w)+.5]);k=job.parent[k]}path.reverse();job.e.path=path;job.e.pathIndex=0;job.e.target=b;this.pathJob=null;return}const next=grid.key(nx,ny);if(job.parent[next]!==-2)continue;job.parent[next]=key;job.queue.push(next)}}
 if(job.head===job.queue.length){job.e.repathAt=g.time+1;this.pathJob=null}
 }
 hit(e,damage){if(!this.enemies.has(e.id))return;e.hp=Math.max(0,e.hp-damage);this.effects.push({x:e.x,y:e.y,time:e.hp? .15:.35,color:e.hp?'#ffd36f':'#ed7775'});if(!e.hp){this.enemies.delete(e.id);if(this.pathJob?.e===e)this.pathJob=null}}
 tick(dt){const g=this.game,c=g.config;if(this.enabled){this.spawnTimer+=dt;if(this.spawnTimer+1e-9>=c.spawnInterval){this.spawnTimer%=c.spawnInterval;this.spawn()}}else this.spawnTimer=0;
 this.paths();
 for(const e of this.enemies.values()){e.previousX=e.x;e.previousY=e.y;if(e.target&&!g.entities.has(e.target)){e.target=null;e.path=null;e.repathAt=g.time}if(e.target&&this.adjacent(e,e.target)){e.attackTimer+=dt;if(e.attackTimer+1e-9>=c.enemyAttackSeconds){e.attackTimer%=c.enemyAttackSeconds;const b=e.target;g.damage(b,c.enemyDamage);this.effects.push({x:b.x+b.size/2,y:b.y+b.size/2,time:.15,color:'#ec8580'})}continue}e.attackTimer=0;if(!e.path)continue;let distance=c.enemySpeed*dt;while(distance>0&&e.pathIndex<e.path.length){const [x,y]=e.path[e.pathIndex],obstacle=g.grid.get(Math.floor(x),Math.floor(y));if(obstacle){e.path=null;e.target=this.adjacent(e,obstacle)?obstacle:null;e.repathAt=g.time+.25;break}const dx=x-e.x,dy=y-e.y,len=Math.hypot(dx,dy),step=Math.min(len,distance);if(len){e.x+=dx/len*step;e.y+=dy/len*step}distance-=step;if(len<=step+1e-9)e.pathIndex++;else break}if(e.path&&e.pathIndex===e.path.length&&!this.adjacent(e,e.target)){e.path=null;e.target=null;e.repathAt=g.time+.25}}
 this.index();
 // Advance existing projectiles before firing; a new shot cannot hit in its birth tick.
 for(let i=this.projectiles.length-1;i>=0;i--){const p=this.projectiles[i],target=this.enemies.get(p.target);p.previousX=p.x;p.previousY=p.y;p.life-=dt;if(!target||p.life<=0){this.projectiles.splice(i,1);continue}const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy),step=c.projectileSpeed*dt;if(d<=step+.15){this.hit(target,p.damage);this.projectiles.splice(i,1)}else{p.x+=dx/d*step;p.y+=dy/d*step}}
 for(const b of g.turrets){b.flash=Math.max(0,b.flash-dt);b.cooldown=Math.max(0,b.cooldown-dt);const x=b.x+b.size/2,y=b.y+b.size/2,e=this.nearest(x,y,c.turretRange);b.target=e;if(e)b.angle=Math.atan2(e.y-y,e.x-x);if(!e||!b.ammo||b.cooldown>1e-9)continue;b.ammo--;g.ammoConsumed++;b.cooldown=1/c.fireRate;b.flash=.12;this.projectiles.push({x,y,previousX:x,previousY:y,target:e.id,damage:c.shotDamage,life:c.projectileLifetime})}
 for(let i=this.effects.length-1;i>=0;i--){this.effects[i].time-=dt;if(this.effects[i].time<=0)this.effects.splice(i,1)}
 }
}
root.CombatAPI={Combat};if(typeof module!=='undefined')module.exports=root.CombatAPI;
})(globalThis);
