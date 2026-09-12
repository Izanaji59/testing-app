// Shared economy and order planning for both camps. No function here reads g.traps.
const prices={reinforce:250,fortify:200,charge:250};
function teamState(){return {gold:0,hits:0,spent:0,firstGate:false,charges:0,extraCharge:false,cooldown:0,effect:null,reinforce:{4:0,11:0},fortify:{4:false,11:false}};}
function occupied(x,y,self,enemyOnly=false){
 return units().some(t=>t!==self&&t.hp>0&&(!enemyOnly||t.team!==self.team)&&Math.round(t.x)===x&&Math.round(t.y)===y);
}
function shopAllowed(team,item,lane){
 if(!started||paused||g.phase!=='strategy'||g.committed||g.winner!==null||![0,1].includes(team))return false;
 const state=g.teams[team],price=prices[item];
 if(state.gold<price)return false;
 if(item==='charge')return !state.extraCharge;
 if(!LANES.includes(lane))return false;
 if(item==='reinforce')return state.reinforce[lane]===0;
 if(item==='fortify')return !state.fortify[lane]&&g.gates.some(b=>b.team===team&&b.y===lane&&b.hp>0);
 return false;
}
function purchase(team,item,lane){
 if(!shopAllowed(team,item,lane))return false;
 const state=g.teams[team],price=prices[item];state.gold-=price;state.spent+=price;
 if(item==='charge')state.extraCharge=true;
 if(item==='reinforce')state.reinforce[lane]=FORMATION_SIZE;
 if(item==='fortify')state.fortify[lane]=true;
 if(team===0)message(item==='charge'?'Seconde activation NT achetée pour le prochain cycle.':item==='reinforce'?'Les 8 prochains sbires de cette voie recevront chacun 25 de bouclier.':'La première porte vivante de cette voie recevra 150 de bouclier pour la prochaine action.');
 return true;
}
function activateCard(team){
 const side=g.teams[team],nt=g.nts[team];
 if(!started||paused||g.phase!=='action'||g.winner!==null||nt.hp<=0||nt.silence>0||side.charges<=0||side.cooldown>0||side.effect)return false;
 const p=forward(nt);side.charges--;side.cooldown=1;
 side.effect={team,type:nt.type,x:Math.round(p.x),y:Math.round(p.y),left:6,affected:new Set()};
 message((team?'Adversaire · ':'')+nt.type+' : carte activée.');return true;
}
function updateCards(dt){
 for(const team of [0,1]){
  const side=g.teams[team];side.cooldown=Math.max(0,side.cooldown-dt);const effect=side.effect;if(!effect)continue;
  effect.left-=dt;
  if(effect.type==='INTJ')for(const h of units())if(h.team===team&&h.hp>0&&!effect.affected.has(h)&&Math.abs(h.x-effect.x)<2&&Math.abs(h.y-effect.y)<2){h.shield=Math.max(h.shield,40);effect.affected.add(h);}
  if(effect.type==='INTP'){
   const m=g.minions.find(m=>m.team!==team&&m.hp>0&&Math.round(m.x)===effect.x&&Math.round(m.y)===effect.y);
   if(m){damage(m,m.hp+(m.shield||0));reward(m,team,false);effect.left=0;}
  }
  if(effect.left<=0)side.effect=null;
 }
}
function orderLane(h){return h.order==='gank'?h.gankLane:h.lane;}
function orderTarget(h){return [...g.heroes,...g.nts].find(t=>t.id===h.targetId&&t.team!==h.team&&t.hp>0);}
function orderValue(h,pose){
 const nt=g.nts[h.team],lane=orderLane(h),foes=units().filter(t=>t.team!==h.team&&t.hp>0);
 let score=positionValue(h,pose)*.2;
 if(h.order==='attack'){
  const target=orderTarget(h);
  if(target){score-=dist(pose,target)*3;score+=inField(pose,target)?35:0;}
  else score-=dist(pose,{x:h.x,y:h.y});
 }
 if(h.order==='stack'){
  const own=g.minions.filter(m=>m.team===h.team&&m.lane===lane&&m.hp>0),front=own.length?(h.team?Math.min(...own.map(m=>m.x)):Math.max(...own.map(m=>m.x))):(h.team?9:6);
  const anchor={x:front+(h.team?1:-1),y:lane};score-=dist(pose,anchor)*3;
  for(const t of foes){if(t.kind&&inField(pose,t))score+=12;if(!t.kind&&t.hp<=33&&inField(pose,t))score+=7;}
  score-=Math.abs(pose.y-lane)*2;
 }
 if(h.order==='guard'){
  if(nt.hp>0){score-=dist(pose,nt)*9;for(const t of foes)if(dist(t,nt)<3.5&&inField(pose,t))score+=25;}
  else score-=dist(pose,{x:h.team?11:4,y:lane})*3;
 }
 if(h.order==='lane'||h.order==='gank'){
  const own=g.minions.filter(m=>m.team===h.team&&m.lane===lane&&m.hp>0),push=own.length?(h.team?Math.min(...own.map(m=>m.x)):Math.max(...own.map(m=>m.x))):(h.team?9:6);
  score-=Math.abs(pose.y-lane)*(h.order==='gank'?6:4);
  score-=Math.abs(pose.x-push)*1.5;
  for(const t of foes)if(laneOf(t.y)===lane&&inField(pose,t))score+=t.kind?14:5;
  if(h.order==='gank'){const mate=g.heroes.find(t=>t!==h&&t.team===h.team&&t.hp>0&&laneOf(t.y)===lane);if(mate&&Math.abs(pose.y-mate.y)>=1)score+=4;}
 }
 return score;
}
function suggestOrder(h){
 if(h.hp<=0)return null;let best=null;
 const lane=orderLane(h),alreadyInLane=laneOf(h.y)===lane;
 for(const node of reachable(h)){
  if(occupied(node.x,node.y,h))continue;
  if(h.order==='lane'&&alreadyInLane&&laneOf(node.y)!==lane)continue;
  // Reserve distinct allied destinations, including proposals not yet executed.
  if(g.heroes.some(other=>other!==h&&other.team===h.team&&other.hp>0&&[other.path.at(-1),other.suggestion].some(p=>p&&p.x===node.x&&p.y===node.y)))continue;
  for(const [x,y]of [[1,0],[-1,0],[0,1],[0,-1]]){
   const pose={...h,x:node.x,y:node.y,fx:x,fy:y},score=orderValue(h,pose)-node.path.length*.2;
   if(!best||score>best.score)best={...node,score,facing:{x,y}};
  }
 }
 return best;
}
function acceptSuggestion(h=g.heroes[g.active]){
 if(!started||paused||g.phase!=='strategy'||g.committed||g.winner!==null||h.hp<=0||h.manual)return false;
 const plan=h.suggestion||suggestOrder(h);h.accepted=true;
 if(!plan)return false;
 if(occupied(plan.x,plan.y,h)){h.suggestion=suggestOrder(h);return false;}
 h.path=plan.path.map(p=>({...p}));h.plan=h.path;h.aimAfter=plan.facing;h.suggestion=null;
 if(!h.path.length){h.fx=plan.facing.x;h.fy=plan.facing.y;}
 return true;
}
function setOrder(order){
 if(!orders[order]||paused||g.committed||g.winner!==null||started&&g.phase!=='strategy')return;
 const h=g.heroes[g.active];
 if(h.order!==order&&order==='gank')h.gankLane=h.lane===4?11:4;
 h.order=order;h.manual=false;h.accepted=false;h.path=[];h.plan=null;h.suggestion=null;h.suggestion=suggestOrder(h);
 if(started)message(h.type+' · '+orders[order]+'. Tu peux ajuster le trajet au clic.');
}
function manualPlacement(){
 if(!started||paused||g.phase!=='strategy'||g.committed)return;
 const h=g.heroes[g.active];h.manual=true;h.path=[];h.plan=null;h.suggestion=null;
 message(h.type+' : placement manuel pour ce cycle. Son ordre reste mémorisé.');
}
function displayPath(h){return h.path.length?h.path:!h.manual&&h.suggestion?h.suggestion.path:[];}
function chooseBotOrder(h,wave){
 const nt=g.nts[h.team],opponents=[...g.heroes,...g.nts].filter(t=>t.team!==h.team&&t.hp>0);
 if(nt.hp>0&&(nt.hp<nt.max*.35||opponents.some(t=>dist(t,nt)<2.5))){h.order='guard';return;}
 const invader=opponents.find(t=>h.team?t.x>11:t.x<4);
 if(invader){h.order='attack';h.targetId=invader.id;return;}
 if(wave<=2){h.order=h.id%2?'lane':'stack';return;}
 if(wave<=5){const target=opponents.filter(t=>t.kind!=='NT'||t.hp<t.max*.5).sort((a,b)=>dist(a,h)-dist(b,h))[0];h.order=target?'attack':'lane';if(target)h.targetId=target.id;return;}
 if(h.id%2){h.order='gank';const strengths=LANES.map(lane=>({lane,hp:opponents.filter(t=>laneOf(t.y)===lane).reduce((sum,t)=>sum+t.hp,0)}));h.gankLane=strengths.sort((a,b)=>a.hp-b.hp)[0].lane;}
 else{h.order='attack';const target=opponents.sort((a,b)=>a.hp-b.hp)[0];if(target)h.targetId=target.id;}
}
function botShopping(){
 const team=1,side=g.teams[team],nt=g.nts[team];
 const danger=LANES.find(lane=>units().some(t=>t.team===0&&t.hp>0&&laneOf(t.y)===lane&&t.x>10));
 if(danger!==undefined)purchase(team,'fortify',danger);
 const lane=nt.y<7.5?4:11;purchase(team,'reinforce',lane);
 if(g.waveIndex>=4)purchase(team,'charge');
 if(side.gold>=prices.reinforce)purchase(team,'reinforce',lane===4?11:4);
}

function advanceMinion(m,dt){
 const dir=m.team?-1:1,speed=g.teams[m.team].effect?.type==='ENTJ'?1.5:.75;
 const row=m.spawnRow??m.y,goalY=m.lane+(m.file??0),progress=m.team?15-m.x:m.x;
 // Keep all sixteen rows through midfield, then converge without crossing files.
 const slope=progress>=8&&progress<11?(goalY-row)/3:0;
 const nx=m.x+dir*speed*dt/Math.hypot(1,slope),nextProgress=m.team?15-nx:nx;
 const ny=row+(goalY-row)*Math.max(0,Math.min(1,(nextProgress-8)/3));
 if(blocked(nx,ny,m.team))return;
 // Yield to the unit ahead. A stable row priority resolves simultaneous merges;
 // trailing allies never prevent a leading unit from moving out of their way.
 if(g.minions.some(other=>{
  if(other===m||other.team!==m.team||other.hp<=0)return false;
  const ahead=dir*(other.x-m.x);
  return (ahead>.001||Math.abs(ahead)<=.001&&(other.spawnRow??other.y)<row)&&dist(other,{x:nx,y:ny})<.78;
 }))return;
 m.x=nx;m.y=ny;
}
