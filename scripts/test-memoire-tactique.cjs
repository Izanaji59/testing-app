const assert=require('node:assert/strict');
const T=require('../public/game/memoire/tactique-core.js');
let seed=73;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
function fixture(type){const g=T.create(random);for(const u of g.units)u.hp=0;const u=g.units.find(u=>u.id==='0-'+type),enemy=g.units.find(u=>u.id==='1-ISTJ'),ally=g.units.find(u=>u.id==='0-'+(type==='ISTJ'?'ESTJ':'ISTJ'));Object.assign(u,{x:7,y:8,hp:6,facing:0});Object.assign(enemy,{x:7,y:7,hp:8});Object.assign(ally,{x:8,y:8,hp:8});return {g,u,enemy,ally};}
const g=T.create(random);
assert.equal(g.units.length,32);for(const team of [0,1])assert.equal(new Set(g.units.filter(u=>u.team===team).map(u=>u.type)).size,16);
assert.equal(new Set(Object.values(T.ROSTER).map(s=>s.skill)).size,16);
assert.equal(new Set(g.units.map(u=>u.x+','+u.y)).size,32);
assert.equal(g.ap,3);assert.equal(g.turn,0);
const u=g.units.find(u=>u.id==='0-ESTP');let m=T.moves(g,u)[0];assert.ok(m);assert.ok(T.apply(g,u.id,'move',m.x,m.y).ok);m=T.moves(g,u)[0];assert.ok(T.apply(g,u.id,'move',m.x,m.y).ok);assert.equal(g.ap,1);assert.equal(u.orders,2);assert.equal(T.preview(g,u.id,'move',2,8).ok,false);
const before=JSON.stringify(g);assert.equal(T.apply(g,'1-ESTP','move',2,7).ok,false);assert.equal(JSON.stringify(g),before);
u.hp=2;T.endTurn(g);assert.equal(u.hp,2);assert.equal(g.ap,3);assert.equal(g.team,1);T.endTurn(g);assert.equal(u.hp,2);assert.equal(u.orders,0);
// Chaque capacité a une conséquence distincte observable et respecte le budget.
const specs={INTJ:[5,7],INTP:[7,7],ENTJ:[7,8],ENTP:[7,7],ESFP:[6,8],ISFP:[6,7],ESFJ:[8,8],ISFJ:[8,8],ENFP:[7,7],INFP:[6,7],ENFJ:[7,6],INFJ:[7,7],ESTP:[7,7],ISTP:[7,7],ESTJ:[6,7],ISTJ:[7,8]};
for(const [type,[x,y]]of Object.entries(specs)){
 const {g,u,enemy,ally}=fixture(type);if(type==='ENFJ'){enemy.x=6;enemy.y=6;specs.ENFJ=[6,6];}if(type==='ISFP'){enemy.x=6;enemy.y=8;}
 const tx=type==='ENFJ'?6:x,ty=type==='ENFJ'?6:y;
 const p=T.preview(g,u.id,'skill',tx,ty);assert.ok(p.ok,type+': '+p.reason);const r=T.apply(g,u.id,'skill',tx,ty);assert.ok(r.ok,type);assert.equal(g.ap,1,type);assert.equal(u.orders,1,type);assert.equal(u.ready,4,type);
 switch(type){
 case 'INTJ':assert.equal(g.walls.length,3);T.endTurn(g);assert.equal(g.walls.length,3);T.endTurn(g);assert.equal(g.walls.length,0);break;
 case 'INTP':assert.equal(enemy.hp,5);break;
 case 'ENTJ':assert.equal(ally.buff,1);break;
 case 'ENTP':assert.equal(u.y,7);assert.equal(enemy.y,8);break;
 case 'ESFP':assert.equal(u.x,6);assert.equal(enemy.hp,6);break;
 case 'ISFP':assert.equal(u.x,6);assert.equal(u.y,7);assert.equal(enemy.hp,6);break;
 case 'ESFJ':assert.equal(ally.shield,2);break;
 case 'ISFJ':assert.equal(u.x,8);assert.equal(ally.x,7);assert.equal(ally.shield,2);break;
 case 'ENFP':assert.equal(enemy.hp,6);break;
 case 'INFP':assert.equal(g.zones.length,1);T.endTurn(g);assert.equal(enemy.hp,8);T.endTurn(g);assert.equal(enemy.hp,6);break;
 case 'ENFJ':assert.ok(T.dist(u,enemy)<=1);assert.equal(enemy.hp,7);break;
 case 'INFJ':assert.equal(enemy.rootUntil,1);T.endTurn(g);assert.equal(T.moves(g,enemy).length,0);T.endTurn(g);assert.ok(T.moves(g,enemy).length>0);break;
 case 'ESTP':assert.equal(enemy.hp,6);break;
 case 'ISTP':assert.equal(enemy.hp,6);break;
 case 'ESTJ':assert.equal(g.zones[0].kind,'watch');break;
 case 'ISTJ':assert.equal(u.shield,3);assert.equal(u.anchorUntil,1);break;
 }
}
// Gardes, portes, cooldowns, coûts et apprentissage par cadence.
{
 const {g,u,enemy}=fixture('ESTJ');T.apply(g,u.id,'skill',6,7);T.endTurn(g);Object.assign(enemy,{x:5,y:6});const r=T.apply(g,enemy.id,'move',6,6);assert.ok(r.ok);assert.equal(enemy.hp,6);assert.ok(g.zones[0].used);
}
{
 const {g,u,enemy}=fixture('INTP');enemy.shield=3;T.apply(g,u.id,'skill',7,7);assert.equal(enemy.hp,5);assert.equal(enemy.shield,3);T.endTurn(g);T.endTurn(g);assert.equal(T.preview(g,u.id,'skill',7,7).ok,false);T.endTurn(g);T.endTurn(g);assert.equal(T.preview(g,u.id,'skill',7,7).ok,true);
}
{
 const {g,u}=fixture('ESTP');Object.assign(u,{x:4,y:3});assert.equal(T.moves(g,u).some(p=>p.y<3),false);g.gates.find(v=>v.team===1&&v.x===4).hp=0;assert.ok(T.moves(g,u).some(p=>p.y===0));assert.ok(T.apply(g,u.id,'move',4,0).ok);assert.equal(g.winner,0);
}
{
 const {g,u,enemy}=fixture('ENTP');Object.assign(u,{x:4,y:3});Object.assign(enemy,{x:4,y:1});assert.equal(T.preview(g,u.id,'skill',4,1).ok,false);
}
{
 const {g,u,enemy}=fixture('ENTP');T.apply(g,u.id,'attack',7,7);T.apply(g,u.id,'attack',7,7);assert.equal(u.cheapSwap,true);T.endTurn(g);T.endTurn(g);assert.equal(T.cost(u,'skill'),1);assert.ok(T.apply(g,u.id,'skill',7,7).ok);assert.equal(g.ap,2);assert.equal(u.cheapSwap,false);
}
// Partie entière de bots avec les mêmes règles : aucun chevauchement ni action illégale.
{
 const {g,u,enemy}=fixture('ESTP');Object.assign(u,{x:4,y:8});Object.assign(enemy,{x:4,y:5});g.zones.push({kind:'watch',team:1,cells:[{x:4,y:7}],due:2});
 assert.ok(T.apply(g,u.id,'skill',4,5).ok);assert.equal(u.y,7);assert.equal(u.hp,4);assert.equal(enemy.hp,8,'Une charge arrêtée ne touche pas une cible à deux cases.');
}
{
 const {g,u,enemy}=fixture('ENTP');g.zones.push({kind:'watch',team:1,cells:[{x:7,y:7}],due:2});
 assert.ok(T.apply(g,u.id,'skill',7,7).ok);assert.equal(u.hp,4,'Une permutation déclenche une garde adverse.');assert.ok(g.zones[0].used);
}
let completed=0,total=0;
for(let match=0;match<3;match++){
 const g=T.create(random);
 for(let turn=0;turn<100&&g.winner===null;turn++){
  let spent=0;
  for(let i=0;i<3&&g.ap>0&&g.winner===null;i++){
   const a=T.chooseBot(g,random);if(!a)break;const before=g.ap,r=T.apply(g,a.id,a.mode,a.x,a.y);assert.ok(r.ok,JSON.stringify(a)+r.reason);spent+=before-g.ap;total++;
   assert.ok(g.ap>=0&&spent<=3);assert.equal(new Set(g.units.filter(u=>u.hp>0).map(u=>u.x+','+u.y)).size,g.units.filter(u=>u.hp>0).length);
   for(const u of g.units){assert.ok(u.hp>=0&&u.hp<=u.max);assert.ok(u.orders<=2);assert.ok(u.x>=0&&u.x<16&&u.y>=0&&u.y<16);}
  }
  if(g.winner===null)T.endTurn(g);
 }
 if(g.winner!==null)completed++;
}
assert.ok(completed>0,'Au moins une partie simulée doit aboutir.');
console.log('Tactique : 32 personnages, 16 capacités, actions, cadence, portes, effets différés et '+total+' actions simulées OK. '+completed+'/3 parties terminées.');
