function ui(){
 const strategy=g.phase==='strategy'&&!g.committed,nt=g.nts[0],h=g.heroes[g.active],side=g.teams[0],lane=Number($('shopLane').value)||4,editable=(!started||strategy)&&!paused&&g.winner===null;
 const turnUnit=currentTurnUnit(),yourTurn=g.phase==='combat'&&turnUnit&&turnUnit.team===0&&g.winner===null&&!paused;
 $('phase').textContent=!started?'PRÊT À JOUER':g.winner!==null?['VICTOIRE','DÉFAITE','ÉGALITÉ'][g.winner]:paused?'PAUSE':strategy?'PLACEMENT · CLIC':g.phase==='combat'?(yourTurn?(g.turnStep==='move'?'TON TOUR · DÉPLACE':'TON TOUR · AGIS'):'TOUR ADVERSE'):'';
 $('timer').textContent=g.phase==='strategy'?(g.committed?'EN PLACE…':'À TON RYTHME'):g.phase==='combat'&&turnUnit?turnUnit.type+(turnUnit.team?' (adv.)':'')+' · '+turnUnit.mp+' PM':'—';
 $('round').textContent='VAGUE '+g.waveIndex+' / CYCLE '+g.cycle;
 $('gold').textContent=g.gold+' G';
 for(const team of [0,1])$('base'+team).textContent=g.gates.filter(b=>b.team===team&&b.hp>0).length+' PORTES';
 $('stats').textContent=g.hits+' last-hits · '+g.kills+' éliminations';
 $('pause').textContent=paused?'Reprendre':'Pause';
 $('identity').textContent=profiles[g.nt][0];$('cardText').textContent=profiles[g.nt][1];
 $('card').disabled=!started||paused||g.phase!=='combat'||g.turnStep!=='action'||turnUnit!==nt||side.charges<=0||side.cooldown>0||nt.hp<=0||nt.silence>0||g.winner!==null;
 $('card').textContent='A · Carte NT · '+side.charges+' disponible(s)';
 $('ready').hidden=g.phase!=='strategy';$('ready').disabled=!started||paused||!strategy||g.winner!==null;
 $('skipStep').hidden=!yourTurn;$('skipStep').textContent=g.turnStep==='move'?'Passer le déplacement':'Passer l\'action';
 $('reinforce').disabled=!shopAllowed(0,'reinforce',lane);$('fortify').disabled=!shopAllowed(0,'fortify',lane);$('extraCard').disabled=!shopAllowed(0,'charge');
 $('purchaseStatus').textContent=(side.reinforce[lane]?side.reinforce[lane]+' sbire(s) attendent leur bouclier. ':'')+(side.fortify[lane]?'Porte protégée à la reprise. ':'')+(side.extraCharge?'Seconde activation réservée.':'');
 $('enemyEconomy').textContent='Or adverse : '+g.teams[1].gold+' G · dépensé : '+g.teams[1].spent+' G';
 $('aiStage').textContent='IA · '+(g.waveIndex<2?'Installation : farm et défense.':g.waveIndex<5?'Pression : cibles et portes.':'Coordination : ganks et protection.');
 for(const team of [0,1])$('army'+team).textContent=(team?'Adversaire':'Alliés')+' · Gauche '+g.minions.filter(m=>m.team===team&&m.lane===4&&m.hp>0).length+'/16 · Droite '+g.minions.filter(m=>m.team===team&&m.lane===11&&m.hp>0).length+'/16';
 for(let i=0;i<2;i++){
  const c=g.heroes[i],status=c.hp>0?Math.ceil(c.hp)+' PV':'Retour : '+Math.max(0,c.respawnWave-g.waveIndex)+' vagues';
  $('c'+i).textContent=(i+1)+' · '+c.type+' · '+status+' · '+orders[c.order];$('c'+i).className=g.active===i?'selected':'';
  $('c'+i).disabled=started&&!strategy;
 }
 $('order').disabled=!editable;
 $('orderTarget').hidden=$('targetLabel').hidden=h.order!=='attack';$('orderTarget').disabled=!editable;
 $('orderLane').hidden=$('laneLabel').hidden=!['lane','stack','gank'].includes(h.order);$('orderLane').disabled=!editable;
 const target=g.heroes.find(t=>t.id===h.targetId)||g.nts.find(t=>t.id===h.targetId);
 const descriptions={attack:'Cherche un angle contre '+(target?.type||'la cible')+'.',stack:'Protège la formation et attend les last-hits. Priorité aux personnages.',guard:'Priorité au NT. Un ST proche intercepte la moitié d’un impact par seconde.',lane:'Défend la voie '+(h.lane===4?'gauche':'droite')+' sans poursuivre ailleurs.',gank:'Traverse vers la voie '+(h.gankLane===4?'gauche':'droite')+' pour créer le surnombre.'};
 $('orderDescription').textContent=descriptions[h.order];
 $('planStatus').textContent=h.hp<=0?'En attente de réapparition.':h.manual?'Placement manuel ce cycle.':h.path.length?'En route · '+h.path.length+' pas restants.':h.suggestion?'Proposition · '+h.suggestion.path.length+' pas.':'En position · '+orders[h.order];
 $('applyOrder').disabled=!started||!strategy||paused||h.hp<=0||h.accepted&&h.path.length>0||g.winner!==null;
 $('manual').disabled=!started||!strategy||paused||g.winner!==null;

 $('heroDetail').textContent=h.type+' · '+names[h.kind]+' · Motif '+h.shape+' · '+h.mp+' points de déplacement restants';
 $('cooldowns').textContent=nt.hp>0?nt.type+' · '+Math.ceil(nt.hp)+' / '+nt.max+' PV':nt.type+' : retour dans '+(nt.respawnWave-g.waveIndex)+' vagues. Tes champions continuent !';
 $('nextWave').textContent=g.phase==='strategy'?(g.committed?'Déplacements en cours, puis mémorisation.':'Aucun départ automatique · 1 / 2, clic et ordres · Entrée pour valider'):g.phase==='combat'?(yourTurn?(g.turnStep==='move'?'Clique une case atteignable, ou passe.':'Clique une case de ton champ pour toucher, ou passe.'):'L\'adversaire joue son tour…'):'';
 $('phaseHint').textContent=g.phase==='strategy'?'PRÉPARE · SANS CHRONO':g.phase==='combat'?(g.turnPos<=1?'MÉMORISE LES EMPREINTES':'TOUR PAR TOUR · PM + 1 ACTION'):'';
 $('phaseTrack').dataset.phase=g.phase==='strategy'?'strategy':g.turnPos<=1?'observe':'action';
 $('ready').textContent=g.committed?'Ordres validés':'Lancer le combat ↵';
 $('memoryScore').textContent='Dernier combat : '+g.memoryStats.avoided+' empreinte(s) quittée(s), '+g.memoryStats.hit+' subie(s).';
 const d=cardinal(h);
 $('attackRule').textContent=h.kind==='SF'?'Quatre cases : les côtés et leurs diagonales avant.':h.kind==='NF'?'Deux diagonales avant, deux cases chacune.':'Quatre cases adjacentes : devant, derrière et côtés.';
 for(const [id,x,y]of facingControls){$(id).disabled=!started||!strategy||paused||h.hp<=0||g.winner!==null;$(id).className=d.x===x&&d.y===y?'selected':'';}
 const preview=attackCells({...h,x:3,y:3}).map(([x,y])=>[y,6-x]),signature=h.kind+','+d.x+','+d.y;
 if($('attackPreview').dataset.pattern!==signature){$('attackPreview').dataset.pattern=signature;$('attackPreview').innerHTML=Array.from({length:49},(_,i)=>{const x=i%7,y=Math.floor(i/7);return '<span class="'+(x===3&&y===3?'origin':preview.some(([cx,cy])=>cx===x&&cy===y)?'strike':'')+'">'+(x===3&&y===3?'●':'')+'</span>';}).join('');}

}
function boardText(text,x,y,stroke=false){
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/2);if(stroke)ctx.strokeText(text,0,0);else ctx.fillText(text,0,0);ctx.restore();
}
function bar(t,w){
 ctx.save();ctx.translate((t.x+.5)*C,(t.y+.5)*C);ctx.rotate(Math.PI/2);
 ctx.fillStyle='#03060D';ctx.fillRect(-w/2,22,w,5);
 ctx.fillStyle=colors[t.team];ctx.fillRect(-w/2,22,w*t.hp/t.max,5);ctx.restore();
}
function draw(){
 if(window.board3d?.enabled){window.board3d.draw();return;}
 ctx.clearRect(0,0,800,800);ctx.save();ctx.transform(0,-1,1,0,0,800);
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){
  ctx.fillStyle=laneOf(y)!==undefined?'#0F2A3D':(x+y)%2?'#08111C':'#0A151F';
  if(x===0||x===15)ctx.fillStyle=x===0?'#123A4A':'#3A1420';
  ctx.fillRect(x*C,y*C,C-1,C-1);
 }
 // Final lines and protected passages are always visible; hidden traps never are.
 for(const team of [0,1])for(let y=0;y<16;y++){
  ctx.fillStyle=breached(team,laneOf(y))?'#FFB23D':colors[team];
  ctx.fillRect((team?15:1)*C-2,y*C,4,C-1);
 }
 if(started&&g.phase==='strategy'&&g.winner===null){
  const h=g.heroes[g.active];
  if(h.hp>0){
   ctx.fillStyle='#4ECDFF0d';const range=h.mp;
   for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(Math.abs(x-Math.round(h.x))+Math.abs(y-Math.round(h.y))<=range&&!blocked(x,y,h.team))ctx.fillRect(x*C+2,y*C+2,46,46);
  }
  for(const c of g.heroes.filter(c=>c.team===0&&c.hp>0&&displayPath(c).length)){
   ctx.strokeStyle='#FFB23D';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo((c.x+.5)*C,(c.y+.5)*C);
   for(const p of displayPath(c))ctx.lineTo((p.x+.5)*C,(p.y+.5)*C);ctx.stroke();ctx.setLineDash([]);
   const end=displayPath(c).at(-1);ctx.strokeRect(end.x*C+5,end.y*C+5,40,40);
   ctx.fillStyle='#FFB23D';ctx.font='bold 11px "JetBrains Mono",monospace';ctx.textAlign='center';boardText(c.type,(end.x+.5)*C,(end.y+.5)*C);
  }
  if(g.heroes[g.active].hp>0){ctx.strokeStyle='#ffcf7f';ctx.fillStyle='#ffcf7f20';ctx.lineWidth=2;for(const [x,y]of attackCells(g.heroes[g.active])){ctx.fillRect(x*C+3,y*C+3,44,44);ctx.strokeRect(x*C+5,y*C+5,40,40);}}
 }
 // Tour de combat en cours : la case atteignable (déplacement) ou le champ (action) de l'unité active.
 if(g.phase==='combat'&&g.winner===null){
  const u=currentTurnUnit();
  if(u&&u.hp>0&&u.team===0){
   if(g.turnStep==='move'){
    ctx.fillStyle='#4ECDFF22';const range=u.mp;
    for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(Math.abs(x-Math.round(u.x))+Math.abs(y-Math.round(u.y))<=range&&!blocked(x,y,u.team)&&!occupied(x,y,u))ctx.fillRect(x*C+2,y*C+2,46,46);
   }else if(g.turnStep==='action'){
    ctx.strokeStyle='#FF5577';ctx.fillStyle='#FF557733';ctx.lineWidth=2;
    for(const [x,y]of attackCells(u)){ctx.fillRect(x*C+3,y*C+3,44,44);ctx.strokeRect(x*C+5,y*C+5,40,40);}
   }
  }
 }
 for(const t of g.traps)if(visibleTrap(t)){
  ctx.fillStyle=memoryColor(t)+'99';ctx.strokeStyle=memoryColor(t);ctx.lineWidth=2;
  for(const [x,y]of t.cells){ctx.fillRect(x*C+2,y*C+2,C-4,C-4);ctx.strokeRect(x*C+4,y*C+4,C-8,C-8);ctx.font='bold 18px "JetBrains Mono",monospace';ctx.textAlign='center';boardText(t.slot===1?'I':'II',(x+.5)*C,(y+.5)*C);}
 }
 for(const b of g.gates){
  if(b.hp<=0){ctx.strokeStyle='#526576';ctx.strokeRect(b.x*C+7,(b.y-1)*C+4,36,142);continue;}
  ctx.fillStyle=b.flash>0?'#fff':colors[b.team];ctx.globalAlpha=gateOpen(b)?1:.5;
  ctx.fillRect(b.x*C+7,(b.y-1)*C+4,36,142);ctx.globalAlpha=1;
  ctx.fillStyle='#08141e';ctx.font='bold 12px "JetBrains Mono",monospace';ctx.textAlign='center';boardText(Math.ceil(b.hp),b.x*C+25,b.y*C+29);if(b.shield>0){ctx.font='10px "JetBrains Mono",monospace';boardText('+'+Math.ceil(b.shield),b.x*C+25,b.y*C+45);}
  boardText(gateOpen(b)?'I':'◆',b.x*C+25,b.y*C+8);
 }
 for(const m of g.minions){
  ctx.fillStyle=m.flash>0?'#fff':colors[m.team];ctx.beginPath();ctx.arc((m.x+.5)*C,(m.y+.5)*C,9,0,Math.PI*2);ctx.fill();bar(m,22);
  ctx.fillStyle=m.hp<=33?'#ffe292':'#fff';ctx.font='11px "JetBrains Mono",monospace';ctx.textAlign='center';boardText(Math.ceil(m.hp),(m.x+.5)*C,(m.y+.5)*C-17);
 }
 for(const h of [...g.heroes,...g.nts]){
  if(h.hp<=0)continue;
  if(h.team===1&&!isSpotted(h)){
   // Repéré nulle part : rien à montrer. Sinon, fantôme sur la dernière position mémorisée.
   if(h.lastSeen){
    const gx=(h.lastSeen.x+.5)*C,gy=(h.lastSeen.y+.5)*C;
    ctx.globalAlpha=.35;ctx.strokeStyle=colors[1];ctx.lineWidth=2;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.arc(gx,gy,18,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.font='9px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.fillStyle=colors[1];boardText('?',gx,gy+3);
    ctx.globalAlpha=1;
   }
   continue;
  }
  const x=(h.x+.5)*C,y=(h.y+.5)*C;
  ctx.fillStyle=h.flash>0?'#fff':h.kind==='NT'?'#4A3410':h.team?'#3D1620':'#0E2E42';
  ctx.strokeStyle=h.kind==='NT'?'#FFB23D':colors[h.team];ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(x,y,h.kind==='ST'?21:18,0,Math.PI*2);ctx.fill();ctx.stroke();
  if(g.phase==='combat'?h===currentTurnUnit():h.id===g.active){ctx.strokeStyle='#fff';ctx.beginPath();ctx.arc(x,y,25,0,Math.PI*2);ctx.stroke();}
  ctx.fillStyle='#fff';ctx.font='bold 11px "JetBrains Mono",monospace';ctx.textAlign='center';boardText(h.type,x,y+4);bar(h,38);
  ctx.font='10px "JetBrains Mono",monospace';boardText(h.silence>0?'SILENCE':h.slow>0?'RALENTI':h.shield>0?'BOUCLIER':h.kind==='NT'?'NT':'',x,y-30);
 }
 for(const f of g.fx){
  ctx.strokeStyle=colors[f.team];ctx.fillStyle=colors[f.team]+'88';ctx.lineWidth=2;
  if(f.tx!==undefined){ctx.beginPath();ctx.moveTo((f.x+.5)*C,(f.y+.5)*C);ctx.lineTo((f.tx+.5)*C,(f.ty+.5)*C);ctx.stroke();}
  else ctx.fillRect(f.x*C,f.y*C,C,C);
 }
 for(const f of g.floats){
  const x=(f.x+.5)*C,y=(f.y+.5)*C-25-(1.1-f.left)*30-(f.gold?22:0),text=f.gold?'+'+f.value+' G':'−'+Math.round(f.value);
  ctx.font='bold '+(f.gold?17:15)+'px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#08121c';boardText(text,x,y,true);ctx.fillStyle=f.gold?'#ffdc7c':'#fff';boardText(text,x,y);
 }
 const nt=g.nts[0];if(nt.hp>0){ctx.strokeStyle='#FFB23D';ctx.beginPath();ctx.moveTo((nt.x+.5)*C,(nt.y+.5)*C);ctx.lineTo((nt.x+.5+nt.fx*.8)*C,(nt.y+.5+nt.fy*.8)*C);ctx.stroke();}
 ctx.restore();ctx.fillStyle='#a3baca';ctx.font='11px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.fillText('VOIE GAUCHE',225,792);ctx.fillText('VOIE DROITE',575,792);
 if(g.winner!==null){ctx.fillStyle='#03060Ddd';ctx.fillRect(0,300,800,170);ctx.textAlign='center';ctx.font='bold 40px "JetBrains Mono",monospace';ctx.fillStyle=g.winner===0?colors[0]:colors[1];ctx.fillText(['VICTOIRE','DÉFAITE','ÉGALITÉ'][g.winner],400,365);ctx.fillStyle='#fff';ctx.font='17px "JetBrains Mono",monospace';ctx.fillText('La dernière ligne a été franchie.',400,405);}
}
function syncOrderControls(){const h=g.heroes[g.active];$('order').value=h.order;$('orderTarget').value=String(h.targetId);$('orderLane').value=String(orderLane(h));}
function select(i){if(!started||g.phase==='strategy'){g.active=i;syncOrderControls();}focusBoard();}
$('start').onclick=()=>{started=true;$('intro').style.display='none';for(const id of ['nt','class0','class1'])$(id).disabled=true;beginStrategy();focusBoard();};
$('restart').onclick=reset;$('pause').onclick=()=>{paused=!paused;focusBoard();};
$('c0').onclick=()=>select(0);$('c1').onclick=()=>select(1);$('ready').onclick=ready;$('card').onclick=card;
$('skipStep').onclick=()=>{if(g.turnStep==='move')skipMove();else skipAction();focusBoard();};
$('order').onchange=()=>{setOrder($('order').value);syncOrderControls();focusBoard();};
 $('orderTarget').onchange=()=>{const h=g.heroes[g.active];h.targetId=Number($('orderTarget').value);setOrder(h.order);focusBoard();};
 $('orderLane').onchange=()=>{const h=g.heroes[g.active];if(h.order==='gank')h.gankLane=Number($('orderLane').value);else h.lane=Number($('orderLane').value);setOrder(h.order);focusBoard();};
 $('applyOrder').onclick=()=>{const h=g.heroes[g.active];h.manual=false;h.suggestion=suggestOrder(h);acceptSuggestion(h);focusBoard();};
 $('manual').onclick=()=>{manualPlacement();focusBoard();};

for(const [id,item]of [['reinforce','reinforce'],['fortify','fortify'],['extraCard','charge']])$(id).onclick=()=>{purchase(0,item,Number($('shopLane').value));focusBoard();};
for(const id of ['nt','class0','class1'])$(id).onchange=reset;
function focusBoard(){if(window.board3d?.enabled)window.board3d.focus();else canvas.focus();}
canvas.onclick=e=>{
 focusBoard();
 const r=canvas.getBoundingClientRect();
 const {x,y}=boardPick(Math.floor((e.clientX-r.left)/r.width*16),Math.floor((e.clientY-r.top)/r.height*16));
 if(g.phase==='strategy'){
  const hero=g.heroes.find(h=>h.team===0&&h.hp>0&&Math.round(h.x)===x&&Math.round(h.y)===y);
  if(hero)select(hero.id);else planMove(x,y);
  return;
 }
 if(g.phase==='combat'){
  if(g.turnStep==='move')turnMoveTo(x,y);
  else if(g.turnStep==='action')turnActAt(x,y);
 }
};
window.addEventListener('keydown',e=>{
 if(['SELECT','INPUT','BUTTON'].includes(document.activeElement?.tagName))return;const k=e.key.toLowerCase();
 if(['1','2','escape','enter','r','arrowup','arrowright','arrowdown','arrowleft'].includes(k))e.preventDefault();
 if(k==='escape'&&!e.repeat){paused=!paused;return;}
 if(g.phase==='strategy'&&!e.repeat){if(k==='r')rotateFacing();if(k==='arrowup')face(1,0);if(k==='arrowright')face(0,1);if(k==='arrowdown')face(-1,0);if(k==='arrowleft')face(0,-1);}
 if(k==='enter'&&!e.repeat)ready();if(k==='1'||k==='2')select(Number(k)-1);
});
window.addEventListener('blur',()=>{if(started)paused=true;});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started){paused=true;}});
for(const [id,x,y]of facingControls)$(id).onclick=()=>face(x,y);
 $('view3d').onclick=()=>window.board3d?.setMode(true);$('view2d').onclick=()=>window.board3d?.setMode(false);
 for(const id of ['class0','class1']){$(id).innerHTML=Object.entries(roster).map(([type,spec])=>'<option value="'+type+'">'+type+' · '+names[spec.kind]+' · '+spec.shape+'</option>').join('');$(id).value=id==='class0'?'ESFP':'ISTJ';}

/** Décroît les éléments purement visuels (flash, dégâts flottants) — jamais la logique de jeu, qui n'avance qu'au clic. */
function visualTick(dt){
 g.time+=dt;
 for(const h of [...g.heroes,...g.nts])h.flash=Math.max(0,h.flash-dt);
 for(const m of g.minions)m.flash=Math.max(0,m.flash-dt);
 for(const b of g.gates)b.flash=Math.max(0,b.flash-dt);
 for(const f of [...g.fx,...g.floats])f.left-=dt;
 g.fx=g.fx.filter(f=>f.left>0);g.floats=g.floats.filter(f=>f.left>0);
}
function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;visualTick(dt);ui();draw();requestAnimationFrame(frame);}
reset();requestAnimationFrame(frame);
