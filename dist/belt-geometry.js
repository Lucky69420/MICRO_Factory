// Uniform arc-length samples shared by simulation and rendering (32px sprites use the same arcs).
(function(root){
const D=[[1,0],[0,1],[-1,0],[0,-1]],paths=[];
for(let entry=0;entry<4;entry++)for(let exit=0;exit<4;exit++){const curve=entry!==exit&&entry!==(exit+2)%4,values=new Float32Array(130);for(let i=0;i<=64;i++){const p=i/64;let x,y;if(curve){const cx=.5+(D[entry][0]+D[exit][0])*.5,cy=.5+(D[entry][1]+D[exit][1])*.5,a=Math.atan2(.5+D[entry][1]*.5-cy,.5+D[entry][0]*.5-cx),z=Math.atan2(.5+D[exit][1]*.5-cy,.5+D[exit][0]*.5-cx),delta=Math.atan2(Math.sin(z-a),Math.cos(z-a));x=cx+.5*Math.cos(a+delta*p);y=cy+.5*Math.sin(a+delta*p)}else{x=.5+(p<.5?D[entry][0]*(.5-p):D[exit][0]*(p-.5));y=.5+(p<.5?D[entry][1]*(.5-p):D[exit][1]*(p-.5))}values[i*2]=x;values[i*2+1]=y}paths[entry*4+exit]={values,length:curve?Math.PI/4:1,curve}}
function sample(entry,exit,p){const data=paths[entry*4+exit].values,t=Math.max(0,Math.min(1,p))*64,i=Math.min(63,Math.floor(t)),f=t-i;return [data[i*2]+(data[(i+1)*2]-data[i*2])*f,data[i*2+1]+(data[(i+1)*2+1]-data[i*2+1])*f]}
root.BeltGeometry={paths,sample};if(typeof module!=='undefined')module.exports=root.BeltGeometry;
})(globalThis);
