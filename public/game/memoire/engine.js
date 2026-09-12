// Simulation uses action time only. Observation never reveals an old hidden trap.
const profiles={
 INTJ:['Vision · protéger une position','A : matrice 4 × 4 devant le NT, un bouclier de 40 par allié pendant 6 s.'],
 INTP:['Détail · +10 G tous les deux last-hits','A : fissure devant le NT. Le premier sbire ennemi qui la traverse est achevé.'],
 ENTJ:['Commande · +50 G à la première porte détruite','A : accélère les sbires alliés pendant 6 s.'],
 ENTP:['Propagation · un last-hit blesse un sbire voisin','A : le prochain last-hit propage 25 dégâts autour de sa cible.']
};
const LANES=[4,11];
const FORMATION_SIZE=8,LANE_CAP=16;
const ACTION_SECONDS=12,OBSERVE_SECONDS=3.2,BEAT_SECONDS=2;
let g,started=false,paused=false,last=0,keys=new Set();
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const laneOf=y=>LANES.find(lane=>Math.abs(y-lane)<=1.45);
function message(s){$('notice').textContent=s;}
function champion(team,type,x,y,id){
 const spec=roster[type];
 return {id,team,type,...spec,x,y,max:spec.hp,fx:team?-1:1,fy:0,cd:0,skill:0,mobility:0,hurt:0,flash:0,slow:0,silence:0,shield:0,respawnWave:null,order:'lane',lane:y<7.5?4:11,gankLane:y<7.5?11:4,targetId:team?0:2,manual:false,suggestion:null,accepted:false,guardCd:0,path:[],plan:null,mp:0,stepClock:0,castCycle:0,aimAfter:null};
}
function strategist(team,type){return {id:4+team,team,type,kind:'NT',hp:400,max:400,speed:2.6,dash:2,reach:2,x:team?13:2,y:7.5,fx:team?-1:1,fy:0,cd:0,skill:0,mobility:0,hurt:0,flash:0,slow:0,silence:0,shield:0,guardCd:0,respawnWave:null,path:[]};}
function units(){return [...g.heroes,...g.nts,...g.minions];}
function makeGates(){const result=[];for(const team of [0,1])for(const y of LANES)for(const tier of [0,1])result.push({team,y,tier,x:team?(tier?14:12):(tier?1:3),hp:tier?400:300,max:tier?400:300,flash:0});return result;}
function gateOpen(b){return b.tier===0||g.gates.some(a=>a.team===b.team&&a.y===b.y&&a.tier===0&&a.hp===0);}
function breached(team,lane){return lane!==undefined&&g.gates.filter(b=>b.team===team&&b.y===lane).every(b=>b.hp===0);}
function reset(){
 g={teams:[teamState(),teamState()],get gold(){return this.teams[0].gold;},set gold(v){this.teams[0].gold=v;},get hits(){return this.teams[0].hits;},set hits(v){this.teams[0].hits=v;},get effect(){return this.teams[0].effect;},set effect(v){this.teams[0].effect=v;},phase:'observe',left:1.5,cycle:1,waveIndex:0,time:0,active:0,kills:0,nt:$('nt').value,minions:[],traps:[],fx:[],floats:[],heroes:[champion(0,$('class0').value,5,4,0),champion(0,$('class1').value,5,11,1),champion(1,'ISTP',10,4,2),champion(1,'ENFJ',10,11,3)],nts:[strategist(0,$('nt').value),strategist(1,'ENTJ')],gates:makeGates(),winner:null};
 Object.assign(g,{committed:false,actionElapsed:0,pulseNext:1,minionBeat:0,pending:[],memoryStats:{avoided:0,hit:0,uninvolved:0}});
 started=false;paused=false;keys.clear();$('order').value='lane';$('intro').style.display='flex';
 for(const id of ['nt','class0','class1'])$(id).disabled=false;
 syncOrderControls();message('Prépare ton équipe à ton rythme. Tu décides quand lancer le combat.');ui();draw();
}
function spawnWave(){
 g.waveIndex++;
 for(const b of g.gates){b.shield=0;b.shieldCycle=0;}
 for(const h of [...g.heroes,...g.nts])if(h.respawnWave!==null&&h.respawnWave<=g.waveIndex){
  const base=h.team?13:2,lane=h.kind==='NT'?7:h.id%2?11:4;
  const spots=[];for(let radius=0;radius<4;radius++)for(let x=Math.max(0,base-radius);x<=Math.min(15,base+radius);x++)for(let y=Math.max(0,lane-radius);y<=Math.min(15,lane+radius);y++)spots.push({x,y});
  const point=spots.find(p=>!blocked(p.x,p.y,h.team)&&!occupied(p.x,p.y,h))||{x:base,y:lane};
  h.hp=h.max;h.respawnWave=null;Object.assign(h,point);h.path=[];h.plan=null;h.shield=0;h.slow=0;h.silence=0;h.hurt=0;h.guardCd=0;
 }
 for(const team of [0,1])for(const lane of LANES){
  const state=g.teams[team];let count=g.minions.filter(m=>m.team===team&&m.lane===lane&&m.hp>0).length;
  for(let row=lane===4?0:8;row<(lane===4?8:16);row++){
   if(count>=LANE_CAP)break;const x=team?15:0,y=row;
   if(g.minions.filter(m=>m.team===team&&m.hp>0&&(m.spawnRow??m.y)===y).length>=2)continue;
   if(g.minions.some(m=>m.hp>0&&m.y===y&&Math.abs(m.x-x)<.85))continue;
   const shield=state.reinforce[lane]>0?25:0;if(shield)state.reinforce[lane]--;
   g.minions.push({team,x,y,lane,spawnRow:row,file:Math.max(-1,Math.min(1,row-lane)),hp:100,max:100,cd:0,shield,flash:0});count++;
  }
  if(state.fortify[lane]){const gate=g.gates.find(b=>b.team===team&&b.y===lane&&b.hp>0&&gateOpen(b));if(gate){gate.shield=150;gate.shieldCycle=g.cycle;}state.fortify[lane]=false;}
 }
}
function forward(h){return {x:Math.max(0,Math.min(15,h.x+h.fx*h.reach)),y:Math.max(0,Math.min(15,h.y+h.fy*h.reach))};}
function blocked(x,y,team){
 if(x<0||y<0||x>15||y>15)return true;
 const enemy=1-team;
 // The final line cannot be bypassed outside a breached lane.
 if((team===0&&x>13.55||team===1&&x<1.45)&&!breached(enemy,laneOf(y)))return true;
 return g.gates.some(b=>b.team!==team&&b.hp>0&&Math.abs(x-b.x)<.6&&Math.abs(y-b.y)<1.5);
}
function move(h,dx,dy,dt){
 const n=Math.hypot(dx,dy);if(!n)return;
 h.fx=dx/n;h.fy=dy/n;const length=Math.min(n,h.speed*(h.slow>0?.5:1)*dt);
 const x=h.x+h.fx*length,y=h.y+h.fy*length;
 if(!blocked(x,h.y,h.team))h.x=x;if(!blocked(h.x,y,h.team))h.y=y;
}
function dash(h){
 if(h.mobility>0||h.hp<=0||h.silence>0)return;
 for(let d=0;d<h.dash*(h.slow>0?.5:1);d+=.1){const x=h.x+h.fx*.1,y=h.y+h.fy*.1;if(blocked(x,y,h.team))break;h.x=x;h.y=y;}
 h.mobility=4;
}
function reachable(h){
 const start={x:Math.round(h.x),y:Math.round(h.y)},queue=[{...start,path:[]}],seen=new Set([start.x+','+start.y]);
 for(let i=0;i<queue.length;i++){
  const node=queue[i];if(node.path.length>=h.mp)continue;
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
   const x=node.x+dx,y=node.y+dy,key=x+','+y;
   if(seen.has(key)||blocked(x,y,h.team)||blocked(node.x+dx*.5,node.y+dy*.5,h.team))continue;
   seen.add(key);queue.push({x,y,path:[...node.path,{x,y}]});
  }
 }
 return queue;
}
function pathTo(h,x,y){return reachable(h).find(n=>n.x===Math.round(x)&&n.y===Math.round(y))?.path??null;}
function cardinal(h){return Math.abs(h.fx)>=Math.abs(h.fy)?{x:h.fx<0?-1:1,y:0}:{x:0,y:h.fy<0?-1:1};}
function attackCells(h){
 const d=cardinal(h),x=Math.round(h.x),y=Math.round(h.y);
 return (familyOffsets[h.kind]||[]).map(([f,side])=>[x+d.x*f-d.y*side,y+d.y*f+d.x*side]).filter(([cx,cy])=>cx>=0&&cx<16&&cy>=0&&cy<16);
}
function occupies(t,cells){
 return cells.some(([x,y])=>g.gates.includes(t)?Math.round(t.x)===x&&Math.abs(t.y-y)<=1:Math.round(t.x)===x&&Math.round(t.y)===y);
}
function inField(h,t){return occupies(t,attackCells(h))&&lineClear(h,t);}
function face(x,y){
 if(!started||paused||g.phase!=='strategy'||g.committed||g.winner!==null)return;
 const h=g.heroes[g.active];if(h.hp<=0)return;h.manual=true;h.suggestion=null;h.fx=x;h.fy=y;h.aimAfter={x,y};
 message(h.type+' : orientation fixée pour ses attaques.');focusBoard();
}
function rotateFacing(){const h=g.heroes[g.active],d=cardinal(h);face(-d.y,d.x);}
function planMove(x,y){
 if(!started||paused||g.winner!==null||g.phase!=='strategy'||g.committed)return false;
 const h=g.heroes[g.active];if(h.hp<=0){message('Ce champion attend son retour avec une vague.');return false;}
 const path=pathTo(h,x,y);if(path===null||occupied(Math.round(x),Math.round(y),h)){message('Destination hors portée ou passage fermé. Choisis une case plus proche.');return false;}
 h.manual=true;h.suggestion=null;h.path=path;h.plan=path;h.aimAfter=null;message(h.type+' : '+path.length+' pas. '+h.mp+' points de déplacement disponibles.');return true;
}
function showNumber(t,value,gold=false){
 const old=g.floats.find(f=>f.target===t&&f.gold===gold&&f.left>.8);
 if(old){old.value+=value;return;}
 g.floats.push({target:t,x:t.x,y:t.y,value,gold,left:1.1});
}
function damage(t,n){
 if(t.hp<=0||g.gates.includes(t)&&!gateOpen(t))return;
 if(t.kind==='NT'){
  const guard=g.heroes.find(h=>h.team===t.team&&h.hp>0&&h.kind==='ST'&&h.order==='guard'&&h.guardCd<=0&&dist(h,t)<=2.1);
  if(guard){guard.guardCd=1;const intercepted=n*.5;damage(guard,intercepted);n-=intercepted;}
 }
 const absorb=Math.min(t.shield||0,n);t.shield=(t.shield||0)-absorb;
 const dealt=Math.min(t.hp,n-absorb);t.hp-=dealt;t.flash=.18;
 if(t.kind)t.hurt=4;if(dealt>0)showNumber(t,dealt);
 if(t.hp===0&&g.gates.includes(t)){const side=g.teams[1-t.team];if(g.nts[1-t.team].type==='ENTJ'&&!side.firstGate){side.firstGate=true;side.gold+=50;showNumber(t,50,true);}}
 if(t.hp===0&&t.kind){t.respawnWave=g.waveIndex+2;t.path=[];t.plan=null;message(t.type+' éjecté · retour dans 2 vagues.');}
}
function reward(t,team=0,manual=true){
 const side=g.teams[team],type=g.nts[team].type;let gold=50;side.hits++;if(type==='INTP'&&side.hits%2===0)gold+=10;side.gold+=gold;showNumber(t,gold,true);
 if(manual&&type==='ENTP'){const other=g.minions.find(m=>m!==t&&m.team!==team&&m.hp>0&&dist(m,t)<1.6);if(other)damage(other,10);}
 if(side.effect?.type==='ENTP'){for(const m of g.minions)if(m!==t&&m.team!==team&&m.hp>0&&dist(m,t)<1.6)damage(m,25);side.effect=null;}
}
function hit(t,n,team){
 const alive=t.hp>0;damage(t,n);if(!alive||t.hp>0)return;
 if(g.minions.includes(t))reward(t,team);
 if(t.kind&&team===0)g.kills++;
}
function targetDistance(h,t){return g.gates.includes(t)?Math.hypot(h.x-t.x,Math.max(0,Math.abs(h.y-t.y)-1)):dist(h,t);}
function lineClear(h,t){
 const ty=g.gates.includes(t)?Math.max(t.y-1,Math.min(t.y+1,h.y)):t.y;
 for(let i=1;i<12;i++){
  const x=h.x+(t.x-h.x)*i/12,y=h.y+(ty-h.y)*i/12;
  if(blocked(x,y,h.team)&&!(g.gates.includes(t)&&Math.abs(x-t.x)<.95&&Math.abs(y-t.y)<1.5))return false;
 }
 return true;
}
function attack(h,telegraph=false){
 if(h.hp<=0||h.cd>0)return;
 const targets=[...units(),...g.gates].filter(t=>t.team!==h.team&&t.hp>0&&(!g.gates.includes(t)||gateOpen(t))&&(h.order!=='lane'||h.kind==='NT'||laneOf(t.y)===h.lane)&&(h.kind==='NT'?targetDistance(h,t)<=1.65&&lineClear(h,t):inField(h,t)));
 if(!targets.length)return;
 if(h.kind!=='NT'&&h.order==='stack'&&!targets.some(t=>t.kind||!g.gates.includes(t)&&t.hp<=33))return;
 h.cd=h.kind==='NT'?.95:1.6;
 if(h.kind==='NT'){
  targets.sort((a,b)=>Number(!(g.minions.includes(a)&&a.hp<=33))-Number(!(g.minions.includes(b)&&b.hp<=33))||targetDistance(h,a)-targetDistance(h,b));
  targets.splice(1);
 }
 if(telegraph){
  const cells=h.kind==='NT'?[[Math.round(targets[0].x),Math.round(targets[0].y)]]:attackCells(h);
  g.pending.push({owner:h,origin:{...h},team:h.team,cells,fireAt:g.pulseNext+1});return;
 }
 // A field attack hits every enemy in the family footprint exactly once.
 for(const t of targets){hit(t,33,h.team);g.fx.push({x:h.x,y:h.y,tx:t.x,ty:t.y,left:.16,team:h.team});}
}
function explode(t){
 for(const h of units())if(h.hp>0&&t.cells.some(([x,y])=>Math.abs(h.x-x)<.65&&Math.abs(h.y-y)<.65)){
  if(h.team!==t.team){hit(h,55,t.team);if(h.kind&&h.hp>0){
   if(t.kind==='SF'){const nx=h.x+(t.team===0?1:-1);if(!blocked(nx,h.y,h.team))h.x=nx;}
   if(t.kind==='NF')h.silence=2;if(t.kind==='ST')h.slow=2;
  }}else if(t.kind==='ST')h.shield=40;
 }
 for(const [x,y]of t.cells)g.fx.push({x,y,left:.35,team:t.team});
}
function beginObservation(){
 spawnWave();g.phase='observe';g.left=OBSERVE_SECONDS;keys.clear();
 for(const h of g.heroes){h.plan=null;h.path=[];h.suggestion=null;if(h.aimAfter){h.fx=h.aimAfter.x;h.fy=h.aimAfter.y;}}
 prepareMemory();
 message('Mémorise I puis II. Ces cases fixes frapperont à 4 s et 8 s du combat.');
}
function ready(){
 if(!started||paused||g.phase!=='strategy'||g.committed||g.winner!==null)return;
 for(const h of g.heroes.filter(h=>h.team===0&&h.hp>0&&!h.manual&&!h.accepted))acceptSuggestion(h);
 g.committed=true;keys.clear();
 if(!g.heroes.some(h=>h.hp>0&&h.path.length))beginObservation();
 else message('Les champions terminent leurs déplacements, puis observe les empreintes.');
 focusBoard();
}
function beginAction(){
 g.phase='action';g.left=ACTION_SECONDS;g.actionElapsed=0;g.pulseNext=1;g.minionBeat=0;g.pending=[];keys.clear();
 for(const side of g.teams){side.charges=1+(side.extraCharge?1:0);side.extraCharge=false;side.cooldown=0;}
 for(const h of g.heroes)if(h.hp>0&&h.kind==='ST'&&h.order==='guard'&&dist(h,g.nts[h.team])<2.5)g.nts[h.team].shield=Math.max(g.nts[h.team].shield,30);
 message('12 s : ZQSD / Espace. Impacts ordinaires toutes les 2 s. Mémoire I à 4 s, II à 8 s.');focusBoard();
}
function card(){if(activateCard(0))focusBoard();}
function frontTarget(h){
 const lane=h.order==='gank'?h.gankLane:h.lane||(h.y<7.5?4:11),gate=g.gates.find(b=>b.team!==h.team&&b.y===lane&&b.hp>0&&gateOpen(b));
 return gate?{x:gate.x+(h.team?1:-1),y:lane}:{x:h.team?0:15,y:lane};
}
function autoChampion(h,dt){
 // All automatic attacks are announced on the shared two-second beat.
}
function positionValue(h,pose){
 const enemies=units().filter(t=>t.team!==h.team&&t.hp>0),wounded=h.hp/h.max;
 let score=0;
 for(const t of enemies){
  if(inField(pose,t))score+=t.kind==='NT'?18+(1-t.hp/t.max)*14:t.kind?10+(1-t.hp/t.max)*8:t.hp<=33?7:3;
  if(t.kind&&t.kind!=='NT'&&inField(t,pose))score-=wounded<.35?16:3.5;
  if(t.kind==='NT'&&dist(t,pose)<1.65)score-=wounded<.35?9:1;
 }
 const target=frontTarget(pose);
 score-=dist(pose,target)*1.25;
 for(const gate of g.gates)if(gate.team!==h.team&&gate.hp>0&&gateOpen(gate)&&inField(pose,gate))score+=9+(1-gate.hp/gate.max)*5;
 const allies=g.minions.filter(m=>m.team===h.team&&m.hp>0);
 if(allies.some(m=>dist(m,pose)<2))score+=2.5;
 // Help intercept invaders close to our last line instead of blindly pushing.
 for(const t of enemies)if(h.team===1?t.x>11:t.x<4)score+=Math.max(0,6-dist(t,pose))*2;
 for(const other of g.heroes)if(other!==h&&other.team===h.team&&other.hp>0){const p=other.path.at(-1)||other;if(dist(p,pose)<1)score-=8;}
 if(wounded<.3)score-=Math.max(0,5-Math.min(...enemies.map(t=>dist(t,pose)),16))*3;
 return score;
}
function beginStrategy(){
 g.phase='strategy';g.left=0;g.committed=false;g.pending=[];g.traps=[];keys.clear();
 for(const h of g.heroes){h.mp=Math.ceil(h.dash+2);h.stepClock=0;h.path=[];h.plan=null;h.aimAfter=null;h.manual=false;h.accepted=false;h.suggestion=null;}
 const next=g.waveIndex+1;
 for(const h of g.heroes.filter(h=>h.team===1&&h.hp>0)){
  chooseBotOrder(h,next);const saved=h.mp;if(next<=2)h.mp=Math.min(h.mp,3);const plan=suggestOrder(h);h.mp=saved;h.path=plan?.path||[];h.aimAfter=plan?.facing||cardinal(h);h.accepted=true;if(!h.path.length){h.fx=h.aimAfter.x;h.fy=h.aimAfter.y;}
 }
 for(const h of g.heroes.filter(h=>h.team===0&&h.hp>0))h.suggestion=suggestOrder(h);
 botShopping();
 message('Prends ton temps. Ajuste les ordres et les achats, puis clique sur Lancer le combat.');
}
function autoStrategist(h,dt){
 const opponents=units().filter(t=>t.team!==h.team&&t.hp>0),allies=g.heroes.filter(t=>t.team===h.team&&t.hp>0);
 const prey=opponents.filter(t=>!t.kind&&t.hp<=33).sort((a,b)=>dist(a,h)-dist(b,h))[0];
 const weak=opponents.find(t=>t.kind==='NT'&&t.hp<t.max*.4&&dist(t,h)<4);
 const escort=allies.sort((a,b)=>a.x-b.x)[0];
 const goal=h.hp<h.max*.3?{x:12,y:7.5}:weak||prey||(escort?{x:Math.min(13,escort.x+1.5),y:escort.y}:{x:10,y:7.5});
 let best={dx:0,dy:0,score:-Infinity};
 for(const [dx,dy]of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
  const n=Math.hypot(dx,dy)||1,p={x:h.x+dx/n*.6,y:h.y+dy/n*.6};if(blocked(p.x,p.y,h.team))continue;
  let score=-dist(p,goal);
  for(const t of opponents)if(t.kind&&t.kind!=='NT'&&inField(t,p))score-=h.hp<h.max*.4?12:5;
  if(score>best.score)best={dx,dy,score};
 }
 move(h,best.dx,best.dy,dt*.8);
 if(h.silence===0&&g.minions.some(m=>m.team===1&&m.hp>0&&m.x<11))activateCard(1);
}
function stepChampions(dt){
 for(const h of g.heroes){
  if(h.hp<=0||!h.path.length)continue;h.stepClock+=dt;
  const duration=h.team===1?.5:.28;
  while(h.stepClock>=duration&&h.path.length&&h.mp>0){
   h.stepClock-=duration;const next=h.path.shift();
   if(blocked(next.x,next.y,h.team)||occupied(next.x,next.y,h,h.path.length>0)){h.path=[];h.plan=null;break;}
   const dx=next.x-h.x,dy=next.y-h.y,n=Math.hypot(dx,dy)||1;h.fx=dx/n;h.fy=dy/n;
   h.x=next.x;h.y=next.y;h.mp--;
   if(!h.path.length&&h.aimAfter){h.fx=h.aimAfter.x;h.fy=h.aimAfter.y;}
  }
 }
}
function checkVictory(){
 const teams=new Set(units().filter(h=>h.hp>0&&(h.team===0?h.x>14.55:h.x<.45)&&breached(1-h.team,laneOf(h.y))).map(h=>h.team));
 if(!teams.size)return;
 g.winner=teams.size===2?2:[...teams][0];keys.clear();
 message(g.winner===2?'Égalité : les deux dernières lignes ont été franchies !':g.winner===0?'Victoire ! Une unité alliée a franchi la dernière ligne.':'Défaite : une unité ennemie a franchi ta dernière ligne.');
}
function tick(dt){
 if(!started||paused||g.winner!==null)return;
 if(g.phase==='strategy'){stepChampions(dt);checkVictory();if(g.committed&&g.winner===null&&!g.heroes.some(h=>h.hp>0&&h.path.length))beginObservation();return;}
 if(g.phase==='observe'){
  g.left=Math.max(0,g.left-dt);
  if(g.left<=.000001)beginAction();
  return;
 }
 dt=Math.min(dt,g.left);g.left=Math.max(0,g.left-dt);g.time+=dt;g.actionElapsed=ACTION_SECONDS-g.left;
 for(const h of [...g.heroes,...g.nts]){
  if(h.hp<=0)continue;
  for(const k of ['cd','skill','slow','silence','mobility','hurt','flash','guardCd'])h[k]=Math.max(0,h[k]-dt);
  // HP persists between phases. Only a scheduled respawn restores health.
  if(h===g.nts[0]){
   const input=movementInput();move(h,input.x,input.y,dt);
   if(keys.has(' '))attack(h);if(keys.has('shift'))dash(h);if(keys.has('a'))card();
  }else if(h.kind==='NT'){
   autoStrategist(h,dt);
  }else autoChampion(h,dt);
 }
 updateCards(dt);
 updateRhythm();
 const beat=Math.floor((g.actionElapsed+.000001)/BEAT_SECONDS),minionsStrike=beat>g.minionBeat;g.minionBeat=beat;
 const strikes=[];
 for(const m of g.minions){
  if(m.hp<=0)continue;m.cd=Math.max(0,m.cd-dt);m.flash=Math.max(0,m.flash-dt);
  const foes=[...units(),...g.gates].filter(t=>t.team!==m.team&&t.hp>0&&targetDistance(m,t)<1.05&&(!g.gates.includes(t)||gateOpen(t)));
  if(foes.length){if(minionsStrike)strikes.push(foes[0]);}
  else advanceMinion(m,dt);
 }
 for(const t of strikes)damage(t,t.kind?12:25);
 updateMemory();
 g.traps=g.traps.filter(t=>!t.done);g.minions=g.minions.filter(m=>m.hp>0);
 for(const f of [...g.fx,...g.floats])f.left-=dt;g.fx=g.fx.filter(f=>f.left>0);g.floats=g.floats.filter(f=>f.left>0);
 for(const b of g.gates)b.flash=Math.max(0,b.flash-dt);
 checkVictory();
 if(g.winner===null&&g.left<.000001){g.cycle++;beginStrategy();}
}
