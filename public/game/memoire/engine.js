// Moteur à tours séquentiels : chaque unité (2 champions + stratège par camp)
// joue son tour l'une après l'autre — déplacement (PM) puis 1 action — sans
// temps réel ni clavier. Ordre d'un round : champ1 allié, champ1 adverse,
// champ2 allié, champ2 adverse, NT allié, NT adverse.
const profiles={
 INTJ:['Vision · protéger une position','Carte : bouclier de 40 à tous les alliés dans une zone 4×4 devant le NT.'],
 INTP:['Détail · +10 G tous les deux last-hits','Carte : achève le sbire ennemi le plus proche devant le NT.'],
 ENTJ:['Commande · +50 G à la première porte détruite','Carte : accélère les sbires alliés pendant 3 tours.'],
 ENTP:['Propagation · un last-hit blesse un sbire voisin','Carte : le prochain last-hit propage 25 dégâts autour de sa cible.']
};
const LANES=[4,11];
const FORMATION_SIZE=8,LANE_CAP=16;
const MINION_STEP_DT=.5; // un "pas" de sbires simulé à chaque tour qui passe
let g,started=false,paused=false,last=0;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const laneOf=y=>LANES.find(lane=>Math.abs(y-lane)<=1.45);
function message(s){$('notice').textContent=s;}
function champion(team,type,x,y,id){
 const spec=roster[type];
 return {id,team,type,...spec,x,y,max:spec.hp,fx:team?-1:1,fy:0,cd:0,skill:0,mobility:0,hurt:0,flash:0,slow:0,silence:0,shield:0,respawnWave:null,order:'lane',lane:y<7.5?4:11,gankLane:y<7.5?11:4,targetId:team?0:2,manual:false,suggestion:null,accepted:false,guardCd:0,path:[],plan:null,mp:0,aimAfter:null};
}
function strategist(team,type){return {id:4+team,team,type,kind:'NT',hp:400,max:400,reach:3,mp:0,x:team?13:2,y:7.5,fx:team?-1:1,fy:0,cd:0,skill:0,mobility:0,hurt:0,flash:0,slow:0,silence:0,shield:0,guardCd:0,respawnWave:null,path:[]};}
function units(){return [...g.heroes,...g.nts,...g.minions];}
function makeGates(){const result=[];for(const team of [0,1])for(const y of LANES)for(const tier of [0,1])result.push({team,y,tier,x:team?(tier?14:12):(tier?1:3),hp:tier?400:300,max:tier?400:300,flash:0});return result;}
function gateOpen(b){return b.tier===0||g.gates.some(a=>a.team===b.team&&a.y===b.y&&a.tier===0&&a.hp===0);}
function breached(team,lane){return lane!==undefined&&g.gates.filter(b=>b.team===team&&b.y===lane).every(b=>b.hp===0);}
function buildTurnOrder(){return [g.heroes[0],g.heroes[2],g.heroes[1],g.heroes[3],g.nts[0],g.nts[1]];}
function currentTurnUnit(){return g.turnPos>=0&&g.turnPos<g.turnOrder.length?g.turnOrder[g.turnPos]:null;}
function reset(){
 g={teams:[teamState(),teamState()],get gold(){return this.teams[0].gold;},set gold(v){this.teams[0].gold=v;},get hits(){return this.teams[0].hits;},set hits(v){this.teams[0].hits=v;},get effect(){return this.teams[0].effect;},set effect(v){this.teams[0].effect=v;},phase:'strategy',cycle:1,waveIndex:0,active:0,kills:0,time:0,nt:$('nt').value,minions:[],traps:[],fx:[],floats:[],heroes:[champion(0,$('class0').value,5,4,0),champion(0,$('class1').value,5,11,1),champion(1,'ISTP',10,4,2),champion(1,'ENFJ',10,11,3)],nts:[strategist(0,$('nt').value),strategist(1,'ENTJ')],gates:makeGates(),winner:null};
 Object.assign(g,{committed:false,turnOrder:[],turnPos:-1,turnStep:null,pending:[],memoryStats:{avoided:0,hit:0,uninvolved:0}});
 started=false;paused=false;$('order').value='lane';$('intro').style.display='flex';
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
function lineCells(h,length){
 const d=cardinal(h),x=Math.round(h.x),y=Math.round(h.y),cells=[];
 for(let i=1;i<=length;i++){const cx=x+d.x*i,cy=y+d.y*i;if(cx<0||cx>=16||cy<0||cy>=16)break;cells.push([cx,cy]);}
 return cells;
}
function attackCells(h){
 if(h.kind==='NT')return lineCells(h,h.reach);
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
/** Résout l'action du tour courant : touche tout ennemi présent dans le champ. */
function resolveAction(h){
 const targets=[...units(),...g.gates].filter(t=>t.team!==h.team&&t.hp>0&&(!g.gates.includes(t)||gateOpen(t))&&inField(h,t));
 for(const t of targets){hit(t,33,h.team);g.fx.push({x:h.x,y:h.y,tx:t.x,ty:t.y,left:.6,team:h.team});}
 return targets.length>0;
}
function explode(t){
 for(const h of units())if(h.hp>0&&t.cells.some(([x,y])=>Math.abs(h.x-x)<.65&&Math.abs(h.y-y)<.65)){
  if(h.team!==t.team){hit(h,55,t.team);if(h.kind&&h.hp>0){
   if(t.kind==='SF'){const nx=h.x+(t.team===0?1:-1);if(!blocked(nx,h.y,h.team))h.x=nx;}
   if(t.kind==='NF')h.silence=2;if(t.kind==='ST')h.slow=2;
  }}else if(t.kind==='ST')h.shield=40;
 }
 for(const [x,y]of t.cells)g.fx.push({x,y,left:.7,team:t.team});
}
function ready(){
 if(!started||paused||g.phase!=='strategy'||g.committed||g.winner!==null)return;
 for(const h of g.heroes.filter(h=>h.team===0&&h.hp>0&&!h.manual&&!h.accepted))acceptSuggestion(h);
 g.committed=true;
 beginCombat();
 focusBoard();
}
function card(){if(activateCard(0))advanceTurn();}
function frontTarget(h){
 const lane=h.order==='gank'?h.gankLane:h.lane||(h.y<7.5?4:11),gate=g.gates.find(b=>b.team!==h.team&&b.y===lane&&b.hp>0&&gateOpen(b));
 return gate?{x:gate.x+(h.team?1:-1),y:lane}:{x:h.team?0:15,y:lane};
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
 for(const t of enemies)if(h.team===1?t.x>11:t.x<4)score+=Math.max(0,6-dist(t,pose))*2;
 for(const other of g.heroes)if(other!==h&&other.team===h.team&&other.hp>0){const p=other.path.at(-1)||other;if(dist(p,pose)<1)score-=8;}
 if(wounded<.3)score-=Math.max(0,5-Math.min(...enemies.map(t=>dist(t,pose)),16))*3;
 return score;
}
function beginStrategy(){
 g.phase='strategy';g.committed=false;g.traps=[];g.turnOrder=[];g.turnPos=-1;g.turnStep=null;
 for(const h of g.heroes){h.mp=PM_BY_KIND[h.kind];h.path=[];h.plan=null;h.aimAfter=null;h.manual=false;h.accepted=false;h.suggestion=null;}
 const next=g.waveIndex+1;
 for(const h of g.heroes.filter(h=>h.team===1&&h.hp>0)){
  chooseBotOrder(h,next);const saved=h.mp;if(next<=2)h.mp=Math.min(h.mp,3);const plan=suggestOrder(h);h.mp=saved;h.path=plan?.path||[];h.aimAfter=plan?.facing||cardinal(h);h.accepted=true;if(!h.path.length){h.fx=h.aimAfter.x;h.fy=h.aimAfter.y;}else{const dest=h.path.at(-1);h.x=dest.x;h.y=dest.y;h.fx=h.aimAfter.x;h.fy=h.aimAfter.y;h.path=[];}
 }
 for(const h of g.heroes.filter(h=>h.team===0&&h.hp>0))h.suggestion=suggestOrder(h);
 botShopping();
 message('Prends ton temps. Ajuste les ordres et les achats, puis clique sur Lancer le combat.');
}
/** Simule un pas de poussée des sbires — appelé une fois par tour qui passe. */
function stepMinions(){
 const strikes=[];
 for(const m of g.minions){
  if(m.hp<=0)continue;
  const foes=[...units(),...g.gates].filter(t=>t.team!==m.team&&t.hp>0&&targetDistance(m,t)<1.05&&(!g.gates.includes(t)||gateOpen(t)));
  if(foes.length)strikes.push(foes[0]);else advanceMinion(m,MINION_STEP_DT);
 }
 for(const t of strikes)damage(t,t.kind?12:25);
 g.minions=g.minions.filter(m=>m.hp>0);
 updateCardEffects();
}
function checkVictory(){
 const teams=new Set(units().filter(h=>h.hp>0&&(h.team===0?h.x>14.55:h.x<.45)&&breached(1-h.team,laneOf(h.y))).map(h=>h.team));
 if(!teams.size)return;
 g.winner=teams.size===2?2:[...teams][0];
 message(g.winner===2?'Égalité : les deux dernières lignes ont été franchies !':g.winner===0?'Victoire ! Une unité alliée a franchi la dernière ligne.':'Défaite : une unité ennemie a franchi ta dernière ligne.');
}
// ─────────────────────────── Tours de combat ───────────────────────────
function beginCombat(){
 spawnWave();g.phase='combat';g.pending=[];
 for(const side of g.teams){side.charges=1+(side.extraCharge?1:0);side.extraCharge=false;side.cooldown=0;}
 for(const h of g.heroes){h.plan=null;h.path=[];h.suggestion=null;if(h.aimAfter){h.fx=h.aimAfter.x;h.fy=h.aimAfter.y;}}
 prepareTraps();
 g.turnOrder=buildTurnOrder();g.turnPos=-1;
 message('Mémorise les 2 empreintes — elles se déclenchent au tour 3 et en fin de manche.');
 advanceTurn();
}
function advanceTurn(){
 checkVictory();if(g.winner!==null)return;
 g.turnPos++;
 resolveTrapsAt(g.turnPos);
 checkVictory();if(g.winner!==null)return;
 stepMinions();
 checkVictory();if(g.winner!==null)return;
 if(g.turnPos>=g.turnOrder.length){g.cycle++;beginStrategy();return;}
 const u=g.turnOrder[g.turnPos];
 if(u.hp<=0){advanceTurn();return;}
 for(const k of ['slow','silence','guardCd'])u[k]=Math.max(0,u[k]-1);
 u.mp=u.kind==='NT'?PM_BY_KIND.NT:PM_BY_KIND[u.kind];
 g.turnStep='move';
 message((u.team?'Tour adverse · ':'Ton tour · ')+u.type+(u.team?'.':' — clique sa destination.'));
 if(u.team===1)resolveBotTurn(u);
}
function turnMoveTo(x,y){
 if(g.phase!=='combat'||g.turnStep!=='move'||g.winner!==null)return false;
 const u=currentTurnUnit();if(!u||u.team!==0||u.hp<=0)return false;
 if(occupied(Math.round(x),Math.round(y),u))return false;
 const path=pathTo(u,x,y);if(path===null)return false;
 if(path.length){const dest=path.at(-1),dx=dest.x-u.x,dy=dest.y-u.y,n=Math.hypot(dx,dy)||1;u.fx=dx/n;u.fy=dy/n;u.x=dest.x;u.y=dest.y;u.mp-=path.length;}
 g.turnStep='action';
 message(u.type+' : clique une case de son champ pour attaquer, ou passe.');
 return true;
}
function skipMove(){if(g.phase==='combat'&&g.turnStep==='move'&&currentTurnUnit()?.team===0)g.turnStep='action';}
function turnActAt(x,y){
 if(g.phase!=='combat'||g.turnStep!=='action'||g.winner!==null)return false;
 const u=currentTurnUnit();if(!u||u.team!==0)return false;
 const inShape=attackCells(u).some(([cx,cy])=>cx===Math.round(x)&&cy===Math.round(y));
 if(!inShape)return false;
 resolveAction(u);advanceTurn();return true;
}
function skipAction(){if(g.phase==='combat'&&g.turnStep==='action'&&currentTurnUnit()?.team===0)advanceTurn();}
/** Tour d'une unité ennemie : se rapproche de sa meilleure position, agit, passe la main. */
function resolveBotTurn(u){
 let best={x:Math.round(u.x),y:Math.round(u.y),score:-Infinity};
 for(const node of reachable(u)){
  if(occupied(node.x,node.y,u))continue;
  const pose={...u,x:node.x,y:node.y};
  const score=(u.kind==='NT'?positionValue(u,pose):orderValue(u,pose))-node.path.length*.1;
  if(score>best.score)best={...node,score};
 }
 if(best.path?.length){const dx=best.x-u.x,dy=best.y-u.y,n=Math.hypot(dx,dy)||1;u.fx=dx/n;u.fy=dy/n;u.x=best.x;u.y=best.y;}
 resolveAction(u);
 advanceTurn();
}
