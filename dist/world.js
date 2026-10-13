// Spatial storage and deterministic world generation; no camera-dependent simulation.
(function(root){
'use strict';
class Chunk {
 constructor(cx,cy,size){this.cx=cx;this.cy=cy;this.size=size;this.terrain='ground';this.roads=new Set();this.tiles=new Map();this.deposits=new Map();this.depositRecords=new Map();this.buildings=new Set();this.logistics=new Set();this.underground=new Set();this.version=0}
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
 constructor(c){this.width=c.width;this.height=c.height;this.chunkSize=c.chunkSize||16;this.chunks=new Map();this.cells=new ChunkedMap(this,'tiles');this.deposits=new ChunkedMap(this,'deposits')}
 key(x,y){return y*this.width+x}
 inside(x,y){return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<this.width&&y<this.height}
 chunkAt(x,y,create=false){if(!this.inside(x,y))return;const cx=Math.floor(x/this.chunkSize),cy=Math.floor(y/this.chunkSize),key=cy*Math.ceil(this.width/this.chunkSize)+cx;let chunk=this.chunks.get(key);if(!chunk&&create){chunk=new Chunk(cx,cy,this.chunkSize);this.chunks.set(key,chunk)}return chunk}
 terrainAt(x,y){return this.chunkAt(x,y)?.roads.has(this.key(x,y))?'road':'ground'}
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
const DEPOSIT_CONFIG={iron:{min:8,max:25,weight:4},coal:{min:8,max:20,weight:4},copper:{min:6,max:20,weight:2},tin:{min:5,max:15,weight:2},spacing:9,patchesPer10000:26};
function generateDeposits(game,settings={}){
 const cfg={...DEPOSIT_CONFIG,...settings},rng=new SeededRandom(game.seed),grid=game.grid,centers=[];game.depositPatches=[];
 const allowed=(x,y)=>grid.inside(x,y)&&!grid.get(x,y)&&!game.road(x,y)&&!game.reserved(x,y)&&!game.deposits.has(grid.key(x,y));
 function patch(type,x,y){const rule={...DEPOSIT_CONFIG[type],...cfg[type]},target=rng.integer(rule.min,rule.max),frontier=[[x,y]],seen=new Set(),tiles=[];
 while(frontier.length&&tiles.length<target){const index=rng.integer(0,frontier.length-1),[tx,ty]=frontier[index];frontier[index]=frontier[frontier.length-1];frontier.pop();const key=grid.key(tx,ty);if(seen.has(key))continue;seen.add(key);if(!allowed(tx,ty))continue;game.deposits.set(key,type);tiles.push([tx,ty]);for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]])if(allowed(tx+dx,ty+dy))frontier.push([tx+dx,ty+dy])}
 if(tiles.length){centers.push([x,y]);game.depositPatches.push({type,x,y,tiles})}}
 // Guaranteed seeds are near the start, with copper/tin farther out and open building space.
 patch('iron',game.depot.x-4,game.depot.y);patch('coal',game.depot.x-4,game.depot.y+6);patch('copper',game.depot.x+17,game.depot.y-14);patch('tin',game.depot.x-21,game.depot.y-22);
 const weighted=[];for(const type of ['iron','coal','copper','tin'])for(let i=0;i<cfg[type].weight;i++)weighted.push(type);const count=Math.round(grid.width*grid.height/10000*cfg.patchesPer10000);
 for(let i=0,tries=0;i<count&&tries<count*30;tries++){const x=rng.integer(4,grid.width-5),y=rng.integer(4,grid.height-5);if(centers.some(p=>Math.hypot(x-p[0],y-p[1])<cfg.spacing)||Math.hypot(x-game.depot.x,y-game.depot.y)<12||!allowed(x,y))continue;patch(weighted[rng.integer(0,weighted.length-1)],x,y);i++}
}
root.World={Chunk,ChunkedMap,Grid,SeededRandom,DEPOSIT_CONFIG,generateDeposits};if(typeof module!=='undefined')module.exports=root.World;
})(globalThis);
