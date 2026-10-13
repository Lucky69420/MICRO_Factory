// Spatial storage and deterministic world generation; no camera-dependent simulation.
(function(root){
'use strict';
class Chunk {
 constructor(cx,cy,size){this.cx=cx;this.cy=cy;this.size=size;this.roads=new Set();this.tiles=new Map();this.deposits=new Map();this.depositRecords=new Map();this.buildings=new Set();this.logistics=new Set();this.underground=new Set();this.version=0}
}
class ChunkedMap {
 constructor(grid,kind){this.grid=grid;this.kind=kind;this.size=0}
 get(key){const x=key%this.grid.width,y=Math.floor(key/this.grid.width);return this.grid.chunkAt(x,y)?.[this.kind].get(key)}
 has(key){return this.get(key)!==undefined}
 set(key,value){const x=key%this.grid.width,y=Math.floor(key/this.grid.width),map=this.grid.chunkAt(x,y,true)[this.kind];if(!map.has(key))this.size++;map.set(key,value);if(this.kind==='deposits')this.grid.chunkAt(x,y).depositRecords.set(key,{x,y,type:value});this.grid.chunkAt(x,y).version++;return this}
 delete(key){const x=key%this.grid.width,y=Math.floor(key/this.grid.width),chunk=this.grid.chunkAt(x,y);if(chunk?.[this.kind].delete(key)){this.size--;if(this.kind==='deposits')chunk.depositRecords.delete(key);chunk.version++;return true}return false}
 *entries(){for(const chunk of this.grid.chunks.values())yield*chunk[this.kind].entries()}
 *values(){for(const [,value] of this.entries())yield value}
 [Symbol.iterator](){return this.entries()}
}
class Grid {
 constructor(c){this.width=c.width;this.height=c.height;this.chunkSize=c.chunkSize||16;this.chunks=new Map();this.terrain=new Uint8Array(this.width*this.height);this.variants=new Uint8Array(this.width*this.height);this.transitions=new Uint8Array(this.width*this.height);this.terrainVersion=0;this.cells=new ChunkedMap(this,'tiles');this.deposits=new ChunkedMap(this,'deposits')}
 key(x,y){return y*this.width+x}
 inside(x,y){return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<this.width&&y<this.height}
 chunkAt(x,y,create=false){if(!this.inside(x,y))return;const cx=Math.floor(x/this.chunkSize),cy=Math.floor(y/this.chunkSize),key=cy*Math.ceil(this.width/this.chunkSize)+cx;let chunk=this.chunks.get(key);if(!chunk&&create){chunk=new Chunk(cx,cy,this.chunkSize);this.chunks.set(key,chunk)}return chunk}
 terrainAt(x,y){return this.inside(x,y)?TERRAIN_NAMES[this.terrain[this.key(x,y)]]:'mountain'}
 buildable(x,y){return this.inside(x,y)&&TERRAIN[this.terrainAt(x,y)].buildable}
 passable(x,y){return this.inside(x,y)&&TERRAIN[this.terrainAt(x,y)].passable}
 get(x,y){return this.inside(x,y)?this.cells.get(this.key(x,y)):undefined}
 set(x,y,b){this.cells.set(this.key(x,y),b);const c=this.chunkAt(x,y);c.buildings.add(b);if(b.isTransport)c.logistics.add(b)}
 remove(x,y){const b=this.get(x,y);if(!b)return;this.cells.delete(this.key(x,y));const c=this.chunkAt(x,y);let remains=false;for(let yy=b.y;yy<b.y+b.size;yy++)for(let xx=b.x;xx<b.x+b.size;xx++)if(this.chunkAt(xx,yy)===c&&this.get(xx,yy)===b)remains=true;if(!remains){c.buildings.delete(b);c.logistics.delete(b)}}
 query(x0,y0,x1,y1,buildings=new Set(),deposits=[]){buildings.clear();deposits.length=0;const s=this.chunkSize;x0=Math.max(0,x0);y0=Math.max(0,y0);x1=Math.min(this.width,x1);y1=Math.min(this.height,y1);for(let cy=Math.floor(y0/s);cy<=Math.floor((y1-1)/s);cy++)for(let cx=Math.floor(x0/s);cx<=Math.floor((x1-1)/s);cx++){const c=this.chunkAt(cx*s,cy*s);if(!c)continue;for(const b of c.buildings)if(b.x<x1&&b.y<y1&&b.x+b.size>x0&&b.y+b.size>y0)buildings.add(b);for(const record of c.depositRecords.values()){const {x,y}=record;if(x>=x0&&x<x1&&y>=y0&&y<y1)deposits.push(record)}}return {buildings,deposits}}
 indexLink(link,remove=false){const a=link.entrance,b=link.exit,dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y);for(let i=0;i<=link.distance;i++){const c=this.chunkAt(a.x+i*dx,a.y+i*dy,!remove);if(c){if(remove)c.underground.delete(link);else c.underground.add(link)}}}
}
class SeededRandom {
 constructor(seed){let h=2166136261;for(const ch of String(seed)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}this.state=h>>>0}
 next(){let t=this.state=(this.state+0x6D2B79F5)>>>0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}
 integer(min,max){return min+Math.floor(this.next()*(max-min+1))}
}
// Terrain is immutable after generation, separate from resources and building cells.
const TERRAIN=Object.freeze({grass:{id:0,name:'Grass',buildable:true,passable:true,color:'#557748'},sand:{id:1,name:'Sand',buildable:true,passable:true,color:'#d7bd7c'},gravel:{id:2,name:'Gravel',buildable:true,passable:true,color:'#8c8174'},stone:{id:3,name:'Stone',buildable:true,passable:true,color:'#626975'},hill:{id:4,name:'Hills',buildable:false,passable:false,color:'#8b806f'},mountain:{id:5,name:'Mountains',buildable:false,passable:false,color:'#424956'},water:{id:6,name:'Water',buildable:false,passable:false,color:'#3979b4'},road:{id:7,name:'Road',buildable:false,passable:true,color:'#303537'}});
const TERRAIN_NAMES=Object.keys(TERRAIN),CARDINAL=[[1,0],[0,1],[-1,0],[0,-1]];
function hash2(x,y,seed){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^seed;h=Math.imul(h^(h>>>13),1274126177);return (h^(h>>>16))>>>0}
class TerrainNoise {
 constructor(seed){this.seed=new SeededRandom('terrain:'+seed).state}
 value(x,y){const ix=Math.floor(x),iy=Math.floor(y);let tx=x-ix,ty=y-iy;tx=tx*tx*(3-2*tx);ty=ty*ty*(3-2*ty);const h=(a,b)=>hash2(a,b,this.seed)/4294967295,a=h(ix,iy)*(1-tx)+h(ix+1,iy)*tx,b=h(ix,iy+1)*(1-tx)+h(ix+1,iy+1)*tx;return a*(1-ty)+b*ty}
 fractal(x,y){return this.value(x,y)*.64+this.value(x*2,y*2)*.25+this.value(x*4,y*4)*.11}
}
function startingSources(game){const g=game.grid,clamp=(v,n)=>Math.max(5,Math.min(n-6,v));return [['iron',game.depot.x-4,game.depot.y],['coal',game.depot.x-4,game.depot.y+6],['copper',game.depot.x+17,game.depot.y-14],['tin',game.depot.x-21,game.depot.y-22]].map(([type,x,y])=>({type,x:clamp(x,g.width),y:clamp(y,g.height)}))}
function floodTerrain(game,radius=0){const g=game.grid,n=g.width*g.height,seen=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;const clear=(x,y)=>{if(!g.inside(x,y)||!g.passable(x,y))return false;for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)if(g.inside(x+dx,y+dy)&&!g.passable(x+dx,y+dy))return false;return true},x=game.depot.x+1,y=game.depot.y+1,start=g.key(x,y);if(!clear(x,y))return seen;seen[start]=1;queue[tail++]=start;while(head<tail){const k=queue[head++],x=k%g.width,y=Math.floor(k/g.width);for(const [dx,dy] of CARDINAL){const nx=x+dx,ny=y+dy;if(!g.inside(nx,ny))continue;const nk=g.key(nx,ny);if(!seen[nk]&&clear(nx,ny)){seen[nk]=1;queue[tail++]=nk}}}return seen}
function carvePass(game,ax,ay,bx,by,noise){const grid=game.grid;let x=ax,y=ay;const brush=(x,y)=>{const radius=3;for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)if(dx*dx+dy*dy<=radius*radius+1&&grid.inside(x+dx,y+dy)){const xx=x+dx,yy=y+dy;if(game.road(xx,yy))continue;const k=grid.key(xx,yy);if(!grid.passable(xx,yy))grid.terrain[k]=noise.value(xx/12,yy/12)>.55?2:0}};
 // A gently wandering seven-tile-wide pass; each step stays cardinally connected.
 brush(x,y);while(y!==by){y+=Math.sign(by-y);const t=Math.abs((y-ay)/(by-ay||1)),want=Math.round(ax+(bx-ax)*t+Math.sin(t*Math.PI)*(noise.value(y/23,17)-.5)*12);while(x!==want){x+=Math.sign(want-x);brush(x,y)}brush(x,y)}while(x!==bx){x+=Math.sign(bx-x);brush(x,y)}
}
function terrainValidation(game){const grid=game.grid,reachable=floodTerrain(game),wide=floodTerrain(game,1),problems=[];if(!wide[grid.key(game.spawner.x+1,1)])problems.push('spawn');let roadClear=true;for(let y=game.parkY;y<grid.height;y++)for(let x=game.depot.x;x<game.depot.x+3;x++)if(grid.terrainAt(x,y)!=='road'||!reachable[grid.key(x,y)]||game.deposits.has(grid.key(x,y)))roadClear=false;for(let y=game.parkY;y<grid.height;y++)if(!wide[grid.key(game.depot.x+1,y)])roadClear=false;if(!roadClear)problems.push('road');let land=0,area=0;for(let y=game.depot.y-10;y<=game.depot.y+9;y++)for(let x=game.depot.x-10;x<=game.depot.x+12;x++)if(grid.inside(x,y)){area++;if(grid.buildable(x,y)&&reachable[grid.key(x,y)])land++}if(land<area*.75)problems.push('starting land');if(game.sandSource&&(!reachable[grid.key(game.sandSource.x,game.sandSource.y)]||grid.terrainAt(game.sandSource.x,game.sandSource.y)!=='sand'||game.deposits.has(grid.key(game.sandSource.x,game.sandSource.y))))problems.push('sand');for(const p of startingSources(game))if(!wide[grid.key(p.x,p.y)])problems.push(p.type);for(const [key] of game.deposits)if(!reachable[key]||!grid.buildable(key%grid.width,Math.floor(key/grid.width)))problems.push('ore');return {valid:!problems.length,problems,reachable,wide,startingLand:land}}
function finalizeTerrain(game){const g=game.grid,n=g.width*g.height,variantSeed=new SeededRandom(game.seed).state;for(let k=0;k<n;k++){const x=k%g.width,y=Math.floor(k/g.width);g.variants[k]=hash2(x,y,variantSeed)%3;let mask=0;for(let i=0;i<4;i++){const [dx,dy]=CARDINAL[i];if(g.inside(x+dx,y+dy)&&g.terrain[g.key(x+dx,y+dy)]!==g.terrain[k])mask|=1<<i}g.transitions[k]=mask}g.terrainVersion++}
function generateTerrain(game){const g=game.grid,w=g.width,h=g.height,noise=new TerrainNoise(game.seed),enabled=game.config.terrain!==false;
 if(enabled){for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=g.key(x,y),e=noise.fractal(x/28,y/28),moist=noise.fractal(x/36+81,y/36-37),ridge=1-Math.abs(noise.fractal(x/25-58,y/25+91)-.5)*2,border=Math.min(x,y,w-1-x,h-1-y),thickness=2+Math.floor(noise.value(x/12+120,y/12)*4);let t=0;
 if(e<.32)t=6;else if(e<.39||moist<.33)t=1;else if(ridge>.90&&e>.49)t=5;else if(ridge>.84&&e>.47)t=4;else if(e>.68)t=3;else if(ridge>.78&&e>.44||e>.61)t=2;
 if(border<thickness)t=5;g.terrain[k]=t}
 // Shore bands, scree and foothills soften region boundaries before passage repair.
 const before=g.terrain.slice();for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const k=g.key(x,y),near=CARDINAL.map(([dx,dy])=>before[g.key(x+dx,y+dy)]);if(before[k]<4&&near.includes(6))g.terrain[k]=1;else if(before[k]<2&&near.some(t=>t===4||t===5))g.terrain[k]=2}
 }
 const pad=(cx,cy,r,terrain=0)=>{for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++)if((x-cx)**2+(y-cy)**2<=r*r+2&&g.inside(x,y)&&!game.road(x,y))g.terrain[g.key(x,y)]=terrain};
 if(enabled){pad(game.depot.x+1,game.depot.y,14);for(const p of startingSources(game))pad(p.x,p.y,5);pad(game.spawner.x+1,2,3);pad(game.depot.x+1,h-2,3);game.sandSource={x:game.depot.x+10,y:game.depot.y-7};pad(game.sandSource.x,game.sandSource.y,3,1)}
 for(let y=game.parkY;y<h;y++)for(let x=game.depot.x;x<game.depot.x+3;x++)g.terrain[g.key(x,y)]=7;
 if(enabled){let check=terrainValidation(game);if(!check.wide[g.key(game.spawner.x+1,1)])carvePass(game,game.spawner.x+1,2,game.depot.x+1,game.depot.y,noise);for(const p of startingSources(game)){check=terrainValidation(game);if(!check.wide[g.key(p.x,p.y)])carvePass(game,p.x,p.y,game.depot.x+1,game.depot.y,noise)}
 check=terrainValidation(game);if(!check.valid)throw new Error('Terrain generation failed connectivity validation: '+check.problems.join(', '));g.reachable=check.reachable;game.terrainValidation={valid:true,startingLand:check.startingLand}}
 else g.reachable=floodTerrain(game);
 finalizeTerrain(game);
}

const DEPOSIT_CONFIG={iron:{min:8,max:25,weight:4},coal:{min:8,max:20,weight:4},copper:{min:6,max:20,weight:2},tin:{min:5,max:15,weight:2},spacing:9,patchesPer10000:26};
function generateDeposits(game,settings={}){
 const cfg={...DEPOSIT_CONFIG,...settings},rng=new SeededRandom(game.seed),grid=game.grid,centers=[];game.depositPatches=[];
 const allowed=(x,y)=>(!game.sandSource||(x-game.sandSource.x)**2+(y-game.sandSource.y)**2>11)&&grid.inside(x,y)&&grid.buildable(x,y)&&grid.reachable?.[grid.key(x,y)]&&!grid.get(x,y)&&!game.road(x,y)&&!game.reserved(x,y)&&!game.deposits.has(grid.key(x,y));
 function patch(type,x,y){const rule={...DEPOSIT_CONFIG[type],...cfg[type]},target=rng.integer(rule.min,rule.max),frontier=[[x,y]],seen=new Set(),tiles=[];
 while(frontier.length&&tiles.length<target){const index=rng.integer(0,frontier.length-1),[tx,ty]=frontier[index];frontier[index]=frontier[frontier.length-1];frontier.pop();const key=grid.key(tx,ty);if(seen.has(key))continue;seen.add(key);if(!allowed(tx,ty))continue;game.deposits.set(key,type);tiles.push([tx,ty]);for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]])if(allowed(tx+dx,ty+dy))frontier.push([tx+dx,ty+dy])}
 if(tiles.length){centers.push([x,y]);game.depositPatches.push({type,x,y,tiles})}}
 // Guaranteed seeds are near the start, with copper/tin farther out and open building space.
 for(const p of startingSources(game))patch(p.type,p.x,p.y);
 const weighted=[];for(const type of ['iron','coal','copper','tin'])for(let i=0;i<cfg[type].weight;i++)weighted.push(type);const count=Math.round(grid.width*grid.height/10000*cfg.patchesPer10000);
 for(let i=0,tries=0;i<count&&tries<count*30;tries++){const x=rng.integer(4,grid.width-5),y=rng.integer(4,grid.height-5);if(centers.some(p=>Math.hypot(x-p[0],y-p[1])<cfg.spacing)||Math.hypot(x-game.depot.x,y-game.depot.y)<12||!allowed(x,y))continue;patch(weighted[rng.integer(0,weighted.length-1)],x,y);i++}
}
root.World={Chunk,ChunkedMap,Grid,SeededRandom,TERRAIN,TERRAIN_NAMES,CARDINAL,hash2,TerrainNoise,startingSources,floodTerrain,carvePass,terrainValidation,generateTerrain,finalizeTerrain,DEPOSIT_CONFIG,generateDeposits};if(typeof module!=='undefined')module.exports=root.World;
})(globalThis);
