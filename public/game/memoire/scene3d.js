import * as THREE from './vendor/three.module.min.js';

// The renderer reads public game state; picking/reachability never inspect hidden traps.
const host=document.getElementById('scene3d');
try {
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.5;
 renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Plateau 3D : sélectionner un champion et cliquer une case');
 host.appendChild(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#03060D');
 const camera=new THREE.OrthographicCamera(-9.8,9.8,9.8,-9.8,.1,100);
 camera.position.set(-15,21,0);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xc6e6ff,0x182135,2.2));
 const sun=new THREE.DirectionalLight(0xffedda,3.5);sun.position.set(-7,16,6);sun.castShadow=true;
 Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:40});
 sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.001;sun.shadow.normalBias=.03;scene.add(sun);
 const rim=new THREE.DirectionalLight(0x57bfff,2);rim.position.set(9,5,-8);scene.add(rim);
 const materials=new Map();
 function mat(color,metal=.2,emissive=false){const key=color+metal+emissive;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.48,metalness:metal,emissive:emissive?color:0,emissiveIntensity:emissive?.4:0}));return materials.get(key);}
 const cube=new THREE.BoxGeometry(1,1,1);
 function box(parent,x,y,z,w,h,d,color,metal=.2,emissive=false){const m=new THREE.Mesh(cube,mat(color,metal,emissive));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function solid(parent,geometry,x,y,z,color,metal=.2,emissive=false){const mesh=new THREE.Mesh(geometry,mat(color,metal,emissive));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 const base=new THREE.Group();scene.add(base);
 box(base,0,-.48,0,16.5,.85,16.5,'#182739',.7);
 box(base,0,-.98,0,15.5,.2,15.5,'#0b1725',.6);
 for(const x of [-8.23,8.23])box(base,x,-.15,0,.06,.12,16.3,x<0?'#4bd8b0':'#f4778c',.3,true);
 for(const z of [-8.23,8.23])box(base,0,-.15,z,16.3,.12,.06,'#46647d',.5,true);
 const tiles=[];
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){
  const lane=laneOf(y)!==undefined,color=x===0?'#123A4A':x===15?'#3A1420':lane?'#0F2A3D':(x+y)%2?'#08111C':'#0A151F';
  const material=new THREE.MeshStandardMaterial({color,roughness:.7,metalness:.22});
  const tile=new THREE.Mesh(new THREE.BoxGeometry(.965,.14,.965),material);tile.position.set(x-7.5,-.02,y-7.5);tile.receiveShadow=true;
  tile.userData={x,y,base:new THREE.Color(color)};scene.add(tile);tiles.push(tile);
 }
 // Quiet architecture outside playable squares gives the board depth without hiding cells.
 for(const x of [-8.55,8.55])for(const z of [-7.8,7.8]){
  const color=x<0?'#4ECDFF':'#FF5577';
  box(base,x,-.1,z,.35,1.2,.35,'#23364a',.8);
  solid(base,new THREE.OctahedronGeometry(.2),x,.65,z,color,.5,true);
 }
 const finalLines=[];
 for(const team of [0,1])for(let y=0;y<16;y++){
  const line=new THREE.Mesh(new THREE.BoxGeometry(.04,.035,.95),new THREE.MeshBasicMaterial({color:colors[team]}));
  line.position.set(team?7:-7,.1,y-7.5);scene.add(line);finalLines.push({team,y,line});
 }
 const gateViews=new Map(),actors=new Map(),textCache=new Map();
 const markerGeo=new THREE.RingGeometry(.35,.41,48);markerGeo.rotateX(-Math.PI/2);
 const selection=new THREE.Mesh(markerGeo,new THREE.MeshBasicMaterial({color:'#fff1bb',transparent:true,opacity:.95,side:THREE.DoubleSide}));selection.position.y=.12;scene.add(selection);
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let hover=null;
 function cellAt(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(tiles,false)[0];return hit?hit.object.userData:null;}
 renderer.domElement.addEventListener('mousemove',e=>{hover=cellAt(e);});
 renderer.domElement.addEventListener('mouseleave',()=>{hover=null;});
 renderer.domElement.addEventListener('click',e=>{
  renderer.domElement.focus();if(g.phase!=='strategy')return;
  // First test a figurine, then the ground, so clicking a head selects its owner.
  const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObjects([...actors.values()].map(a=>a.group),true).find(h=>{let o=h.object;while(o&&!o.userData.unit)o=o.parent;return o?.userData.unit?.team===0&&o.userData.unit.kind!=='NT';});
  if(hit){let obj=hit.object;while(!obj.userData.unit)obj=obj.parent;select(obj.userData.unit.id);return;}
  const p=cellAt(e);if(p){const hero=g.heroes.find(h=>h.team===0&&h.hp>0&&Math.round(h.x)===p.x&&Math.round(h.y)===p.y);if(hero)select(hero.id);else planMove(p.x,p.y);}
 });
 function label(text,color='#ddecf7',width=160,height=64){
  const key=text+color+width+height;if(textCache.has(key))return textCache.get(key);
  const c=document.createElement('canvas');c.width=width;c.height=height;const cx=c.getContext('2d');
  cx.font='bold '+Math.floor(height*.51)+'px "JetBrains Mono",monospace';cx.textAlign='center';cx.textBaseline='middle';cx.lineWidth=7;cx.strokeStyle='#07111fea';cx.strokeText(text,width/2,height/2);cx.fillStyle=color;cx.fillText(text,width/2,height/2);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const material=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});
  textCache.set(key,material);return material;
 }
 function sprite(parent,text,x,y,z,w=.95,h=.24,color){const s=new THREE.Sprite(label(text,color));s.position.set(x,y,z);s.scale.set(w,h,1);s.renderOrder=10;parent.add(s);return s;}
 const cylinder=new THREE.CylinderGeometry(.29,.33,.15,12),headGeo=new THREE.IcosahedronGeometry(.16,1);
 function actor(unit){
  const group=new THREE.Group();scene.add(group);group.userData.unit=unit;
  const team=unit.team===0?'#4ECDFF':'#FF5577',dark=unit.team===0?'#123244':'#4A1B28';
  const minion=!unit.kind;
  solid(group,cylinder,0,.16,0,dark,.7);
  const ring=solid(group,new THREE.TorusGeometry(.3,.025,6,24),0,.25,0,team,.4,true);ring.rotation.x=Math.PI/2;
  const body=new THREE.Group();group.add(body);
  if(minion){
   solid(body,new THREE.CylinderGeometry(.13,.21,.35,6),0,.4,0,dark,.6);
   solid(body,headGeo,0,.68,0,team,.5);
   box(body,.2,.44,0,.08,.42,.06,'#c6dfec',.8);
  }else{
   const tank=unit.kind==='ST',mage=unit.kind==='NF',nt=unit.kind==='NT';
   box(body,-.12,.36,0,.16,.23,.22,'#162538',.7);box(body,.12,.36,0,.16,.23,.22,'#162538',.7);
   solid(body,new THREE.CylinderGeometry(tank?.33:.19,tank?.29:.27,.46,6),0,.67,0,dark,.6);
   box(body,0,.73,.15,tank?.53:.33,.16,.06,team,.7,true);
   solid(body,headGeo,0,1.04,0,'#c4d2dc',.6);
   if(mage){
    solid(body,new THREE.ConeGeometry(.26,.47,6),0,1.31,0,dark,.4);
    box(body,.35,.77,0,.055,.95,.055,'#72899e',.8);
    solid(body,new THREE.OctahedronGeometry(.13),.35,1.31,0,team,.3,true);
   }else if(tank){
    box(body,-.38,.68,.08,.16,.59,.43,team,.7);box(body,-.48,.7,.09,.04,.38,.26,'#234456',.8);
    box(body,.35,.8,0,.2,.15,.3,'#a5b7c4',.8);box(body,.35,.51,0,.07,.5,.08,'#46566b',.7);
    box(body,0,1.17,0,.36,.16,.34,dark,.8);
   }else if(nt){
    solid(body,new THREE.CylinderGeometry(.19,.19,.11,8),0,1.2,0,'#f4cd72',.8,true);
    for(const a of [0,1,2,3,4]){const angle=a*Math.PI*2/5;solid(body,new THREE.ConeGeometry(.06,.2,4),Math.cos(angle)*.16,1.32,Math.sin(angle)*.16,'#ffdc86',.7,true);}
    const halo=solid(body,new THREE.TorusGeometry(.42,.019,6,48),0,.61,0,'#e8bb65',.5,true);halo.rotation.x=Math.PI/2;
   }else{
    box(body,0,1.16,0,.33,.14,.29,dark,.8);box(body,.33,.78,0,.06,.71,.07,'#d2e4ed',.9);
    box(body,.33,.53,0,.22,.055,.09,'#f2ce84',.7);box(body,-.29,.67,0,.18,.28,.23,dark,.5);
   }
  }
  const name=sprite(group,minion?String(Math.ceil(unit.hp)):unit.type,0,minion?.99:1.75,0,minion?.8:1.15,minion?.32:.34,unit.kind==='NT'?'#ffdd89':undefined);
  const hpBack=new THREE.Sprite(new THREE.SpriteMaterial({color:'#07101b',depthTest:false}));hpBack.scale.set(minion?.5:.85,.07,1);hpBack.position.set(0,minion?.79:1.54,0);hpBack.renderOrder=11;group.add(hpBack);
  const hpFill=new THREE.Sprite(new THREE.SpriteMaterial({color:team,depthTest:false}));hpFill.scale.copy(hpBack.scale);hpFill.position.copy(hpBack.position);hpFill.renderOrder=12;group.add(hpFill);
  const status=sprite(group,'',0,minion?1.15:2.05,0,1.15,.23,'#ffdd89');status.visible=false;return {group,body,name,status,hpBack,hpFill,lastHp:-1,unit};
 }
 function makeGate(gate){
  const group=new THREE.Group();group.position.set(gate.x-7.5,0,gate.y-7.5);scene.add(group);
  const color=gate.team===0?'#4ECDFF':'#FF5577';
  for(const z of [-1.4,1.4]){box(group,0,.47,z,.47,.92,.22,'#405268',.8);box(group,0,1.01,z,.54,.16,.3,color,.4,true);}
  box(group,0,.98,0,.25,.18,2.65,'#445b70',.8);
  const barrier=new THREE.Mesh(new THREE.BoxGeometry(.08,.8,2.65),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.7,transparent:true,opacity:.48,metalness:.4,roughness:.3}));barrier.position.y=.5;group.add(barrier);
  const text=sprite(group,'',0,1.45,0,1.15,.24);
  return {group,barrier,text,hp:-1};
 }
 const trail=new THREE.Group();scene.add(trail);let lastTrail='';
 function updateTrail(){
  const signature=g.phase+g.heroes.slice(0,2).map(h=>h.x+','+h.y+':'+displayPath(h).map(p=>p.x+','+p.y).join(';')).join('|');
  if(signature===lastTrail)return;lastTrail=signature;
  for(const child of [...trail.children]){trail.remove(child);child.geometry.dispose();child.material.dispose();}
  if(g.phase!=='strategy')return;
  for(const h of g.heroes.slice(0,2))if(h.hp>0&&displayPath(h).length){
   const points=[new THREE.Vector3(h.x-7.5,.14,h.y-7.5),...displayPath(h).map(p=>new THREE.Vector3(p.x-7.5,.14,p.y-7.5))];
   const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#ffe29b'}));trail.add(line);
  }
 }
 const effects=new THREE.Group();scene.add(effects);const floatViews=new Map();
 function project(x,y,height=0){const p=new THREE.Vector3(x-7.5,height,y-7.5).project(camera);return {x:(p.x+1)/2,y:(1-p.y)/2};}
 function release(group){
  group.traverse(o=>{if(o.geometry&&![cube,cylinder,headGeo,markerGeo].includes(o.geometry))o.geometry.dispose();
   if(o.material&&!Array.from(materials.values()).includes(o.material)&&!Array.from(textCache.values()).includes(o.material))o.material.dispose();});scene.remove(group);
 }
 let enabled=true,lastSize=0,seenState=null;
 function draw3d(){
  if(!enabled)return;
  const size=Math.floor(host.clientWidth);if(size<1)return;if(lastSize!==size){renderer.setSize(size,size);lastSize=size;}
  // Release meshes associated with an earlier match.
  if(seenState!==g){for(const a of actors.values())release(a.group);actors.clear();for(const v of gateViews.values())release(v.group);gateViews.clear();seenState=g;}
  const selected=g.heroes[g.active];
 for(const edge of finalLines)edge.line.material.color.set(breached(edge.team,laneOf(edge.y))?'#FFB23D':colors[edge.team]);
  const preview=new Set(started&&g.phase==='strategy'&&selected.hp>0?attackCells(selected).map(([x,y])=>x+','+y):[]);
  const visibleTraps=new Map();for(const t of g.traps)if(visibleTrap(t))for(const [x,y]of t.cells)visibleTraps.set(x+','+y,t);
  const warnings=new Map();for(const strike of g.pending)for(const [x,y]of strike.cells)warnings.set(x+','+y,strike.team);
  for(const tile of tiles){
   const {x,y,base}=tile.userData;tile.material.color.copy(base);tile.material.emissive.set(0);tile.material.emissiveIntensity=0;
   const threat=visibleTraps.get(x+','+y);
   if(threat!==undefined){tile.material.color.set(memoryColor(threat));tile.material.emissive.copy(tile.material.color);tile.material.emissiveIntensity=.85;}
   else if(g.phase==='strategy'&&selected.hp>0&&Math.abs(x-selected.x)+Math.abs(y-selected.y)<=selected.mp&&!blocked(x,y,0))tile.material.color.lerp(new THREE.Color('#2E9BC2'),.32);
   if(warnings.has(x+','+y)){tile.material.color.set(warnings.get(x+','+y)?'#b37c3a':'#459e9b');tile.material.emissive.set(warnings.get(x+','+y)?'#7e4a13':'#1c7069');tile.material.emissiveIntensity=.45;}
   if(threat===undefined&&preview.has(x+','+y))tile.material.color.lerp(new THREE.Color('#efb658'),.65);
   if(hover?.x===x&&hover?.y===y&&g.phase==='strategy')tile.material.color.lerp(new THREE.Color('#ffe4a2'),.45);
  }
  const live=new Set(units().filter(h=>h.hp>0));
  for(const [unit,a]of actors)if(!live.has(unit)){release(a.group);actors.delete(unit);}
  for(const unit of live){
   let a=actors.get(unit);if(!a){a=actor(unit);actors.set(unit,a);a.group.position.set(unit.x-7.5,0,unit.y-7.5);}
   const target=new THREE.Vector3(unit.x-7.5,0,unit.y-7.5);a.group.position.lerp(target,.5);
   const status=unit.silence>0?'SILENCE':unit.slow>0?'RALENTI':unit.shield>0?'BOUCLIER':'';a.status.visible=!!status;if(status)a.status.material=label(status,'#ffdd89');
   a.body.position.y=unit.kind==='NF'?Math.sin(g.time*2+unit.id)*.025:0;
   a.body.rotation.y=unit.fx!==undefined?Math.atan2(unit.fx,unit.fy):unit.team?-Math.PI/2:Math.PI/2;
   const width=unit.kind?.85:.5,fraction=unit.hp/unit.max;
   a.hpFill.scale.x=width*fraction;a.hpFill.position.x=-(width-width*fraction)/2;
   if(!unit.kind&&a.lastHp!==Math.ceil(unit.hp)){a.name.material=label(String(Math.ceil(unit.hp)),unit.hp<=33?'#ffdc7c':'#eaf5ff',96);a.lastHp=Math.ceil(unit.hp);}
  }
  for(const gate of g.gates){
   let view=gateViews.get(gate);if(!view){view=makeGate(gate);gateViews.set(gate,view);}
   view.group.visible=gate.hp>0;
   view.barrier.material.opacity=gateOpen(gate)?.48:.2;
   if(view.hp!==gate.hp||view.shield!==gate.shield){view.shield=gate.shield;view.text.material=label((gateOpen(gate)?'':'◆ ')+Math.ceil(gate.hp)+(gate.shield?' +'+Math.ceil(gate.shield):''),gate.team===0?'#B8ECFF':'#ffc2d1');view.hp=gate.hp;}
  }
  const who=g.phase==='action'?g.nts[0]:selected;selection.visible=who.hp>0;selection.position.set(who.x-7.5,.12,who.y-7.5);
  updateTrail();
  for(const [f,s]of floatViews)if(!g.floats.includes(f)){effects.remove(s);floatViews.delete(f);}
  for(const f of g.floats){let s=floatViews.get(f);const text=f.gold?'+'+f.value+' G':'−'+Math.round(f.value);if(!s){s=sprite(effects,text,0,0,0,.95,.3,f.gold?'#ffdc7c':'#fff');floatViews.set(f,s);}s.material=label(text,f.gold?'#ffdc7c':'#fff');s.position.set(f.x-7.5,1.35+(1.1-f.left)*.8+(f.gold?.45:0),f.y-7.5);}
  // Hit lines and burst tiles live briefly, then disappear entirely.
  for(const child of [...effects.children])if(child.userData.transient){effects.remove(child);child.geometry?.dispose();if(!child.userData.sharedLabel)child.material?.dispose();}
  for(const t of g.traps)if(visibleTrap(t))for(const [x,y]of t.cells){
   const marker=sprite(effects,t.slot===1?'I':'II',x-7.5,.3,y-7.5,.55,.5,memoryColor(t));marker.userData.transient=true;marker.userData.sharedLabel=true;
  }
  for(const f of g.fx){
   let object;
   if(f.tx!==undefined){object=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(f.x-7.5,.7,f.y-7.5),new THREE.Vector3(f.tx-7.5,.7,f.ty-7.5)]),new THREE.LineBasicMaterial({color:colors[f.team]}));}
   else{object=new THREE.Mesh(new THREE.BoxGeometry(.88,.09,.88),new THREE.MeshBasicMaterial({color:colors[f.team],transparent:true,opacity:.65}));object.position.set(f.x-7.5,.16,f.y-7.5);}
   object.userData.transient=true;effects.add(object);
  }
  renderer.render(scene,camera);
 }
 function setMode(on){enabled=on;host.hidden=!on;canvas.style.display=on?'none':'block';document.getElementById('view3d').classList.toggle('selected',on);document.getElementById('view2d').classList.toggle('selected',!on);if(on)renderer.domElement.focus();else canvas.focus();}
 window.board3d={get enabled(){return enabled;},draw:draw3d,focus:()=>renderer.domElement.focus(),setMode,project,pick:(x,y)=>cellAt({clientX:x,clientY:y}),tiles,renderer};
 // Loading the renderer must not steal focus or pause a match already started.
 host.hidden=false;canvas.style.display='none';document.getElementById('view3d').classList.add('selected');
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();setMode(false);document.getElementById('view3d').disabled=true;message('La vue 3D est indisponible. La partie continue en vue du dessus.');});
} catch(error){
 console.warn('Vue 3D indisponible :',error.message);host.hidden=true;canvas.style.display='block';document.getElementById('view3d').disabled=true;document.getElementById('view2d').classList.add('selected');
}
