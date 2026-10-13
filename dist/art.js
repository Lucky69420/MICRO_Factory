// Cached resource textures and original building sprites shared by world rendering and UI icons.
(function(root){
 const items={},buildings={},belts={};
 const load=(path,fallback)=>{const image=new Image();if(fallback)image.onerror=()=>{image.onerror=null;image.src=fallback};image.src=path;return image};
 for(const [id,r] of Object.entries(Factory.RESOURCES))items[id]=load(r.icon,r.fallback);
 for(const type of Object.keys(Factory.SPECS))buildings[type]=load(Factory.BUILDINGS[type].sprite);
 for(let dir=0;dir<4;dir++)for(let mask=0;mask<16;mask++)belts[dir+'-'+mask]=load('assets/belts/'+dir+'-'+mask+'.svg',Factory.BUILDINGS.belt.sprite);
 const truck=load('assets/truck.svg');
 function draw(ctx,image,x,y,w,h=w){if(image?.complete&&image.naturalWidth)ctx.drawImage(image,Math.round(x),Math.round(y),w,h)}
 document.addEventListener('error',e=>{const img=e.target;if(img?.tagName==='IMG'){const fallback=img.getAttribute('data-fallback');if(fallback){img.removeAttribute('data-fallback');img.src=fallback}}},true);
 root.Art={items,buildings,belts,truck,draw,icon:(id,extra='')=>`<img class="item-icon ${extra}" src="${Factory.RESOURCES[id].icon}" data-fallback="${Factory.RESOURCES[id].fallback}" alt="${Factory.RESOURCES[id].name}" title="${Factory.RESOURCES[id].name}">`,buildingIcon:type=>`<img class="machine-icon" src="assets/building-${type}.svg" alt="">`};
})(globalThis);
