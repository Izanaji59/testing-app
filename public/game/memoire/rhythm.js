// World coordinates remain stable; the player's advance now points up on screen.
function boardView(x,y){return {x:y,y:15-x};}
function boardPick(x,y){return {x:15-y,y:x};}
const facingControls=[['faceUp',1,0],['faceRight',0,1],['faceDown',-1,0],['faceLeft',0,-1]];

/** Empreintes : posées au début du combat, visibles aux 2 premiers tours du
 * round, puis cachées jusqu'à leur détonation (tour 3 et fin de manche). */
function prepareTraps(){
 g.traps=[];g.memoryStats={avoided:0,hit:0,uninvolved:0};
 for(const h of g.heroes){
  if(h.hp<=0||h.silence>0)continue;
  const nt=g.nts[1-h.team],focus=nt.hp>0?nt:g.heroes.find(t=>t.team!==h.team&&t.hp>0);
  if(!focus)continue;
  const slot=h.id%2+1,dir=focus.team?-1:1;
  const target={x:Math.round(focus.x+dir*(slot===1?1:3)),y:Math.round(focus.y+(slot===1?-1:1))};
  const offset=familyOffsets[h.kind][0],d=cardinal(h);
  const pose={...h,x:Math.max(2,Math.min(13,target.x-d.x*offset[0]+d.y*offset[1])),y:Math.max(2,Math.min(13,target.y-d.y*offset[0]-d.x*offset[1]))};
  g.traps.push({owner:h.id,team:h.team,kind:h.kind,cells:attackCells(pose),slot,fireAtPos:slot===1?3:6,exposed:false,done:false});
 }
}
function visibleTrap(t){return g.phase==='combat'&&!t.done&&g.turnPos<=1;}
function memoryColor(t){return t.team===0?'#4ECDFF':t.slot===1?'#ff637e':'#9B7CFF';}
function resolveTrapsAt(pos){
 const nt=g.nts[0];
 for(const t of g.traps){
  if(t.done)continue;
  if(t.team===1&&nt.hp>0&&t.cells.some(([x,y])=>Math.hypot(nt.x-x,nt.y-y)<1.6))t.exposed=true;
  if(pos!==t.fireAtPos)continue;
  const struck=nt.hp>0&&t.cells.some(([x,y])=>Math.abs(nt.x-x)<.65&&Math.abs(nt.y-y)<.65);
  explode(t);t.done=true;
  if(t.team===1){
   if(struck){g.memoryStats.hit++;message('Empreinte '+t.slot+' subie. Les cases avaient été fixées avant le combat.');}
   else if(t.exposed){g.memoryStats.avoided++;message('Empreinte '+t.slot+' évitée ! La zone est maintenant libre.');}
   else g.memoryStats.uninvolved++;
  }
 }
}
