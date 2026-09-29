(function(){
  'use strict';
  const T=EmpreinteTactics,$=id=>document.getElementById(id),canvas=$('tacticBoard'),ctx=canvas.getContext('2d');
  const familyNames={NT:'Stratège',SF:'Guerrier',NF:'Sorcier',ST:'Tank'},moveNames={ortho:'lignes et colonnes',diag:'diagonales',king:'toutes les directions',knight:'saut en L'};
  const ally='#7ce4c1',enemy='#ff9aa4',gold='#f4ce85';
  let game=T.create(),selected='0-ESTP',lastOwn=selected,mode='move',pending=null,botPreview=null,busy=false,generation=0,notice='Sélectionne un allié, puis une case.',zoom=false,view={x:0,y:0,n:16};
  let effects=[],effectFrame=0;
  const unit=()=>game.units.find(u=>u.id===selected);
  const ownTurn=()=>game.team===0&&game.winner===null&&!busy;
  function select(id){selected=id;const u=unit();if(u.team===0)lastOwn=id;pending=null;mode='move';notice=u.hp<=0?u.type+' est hors combat.':u.team===1?'Tu consultes '+u.type+' adverse.':u.type+' sélectionné. Choisis une case accessible.';if(zoom)center(u);render();}
  function center(p){view={n:8,x:Math.max(0,Math.min(8,p.x-3)),y:Math.max(0,Math.min(8,p.y-3))};}
  function tile(x,y){
    if(!ownTurn()||!Number.isInteger(x)||!Number.isInteger(y))return;
    const target=T.at(game,x,y),u=unit();
    if(target&&(mode==='move'||!u||u.team!==0||u.hp<=0)){select(target.id);return;}
    if(!u||u.team!==0){notice='Sélectionne d’abord un personnage de ton équipe.';render();return;}
    const p=T.preview(game,u.id,mode,x,y);
    if(!p.ok){pending=null;notice=p.reason;render();return;}
    if(pending&&pending.id===u.id&&pending.mode===mode&&pending.x===x&&pending.y===y){execute();return;}
    pending=p;notice=p.label+' — '+p.cost+' action'+(p.cost>1?'s':'')+'. Touche encore cette case ou confirme.';render();
  }
  function burst(){if(!game.last?.hits.length)return;const now=performance.now();effects=game.last.hits.map(h=>({...h,time:now}));if(!effectFrame)effectFrame=requestAnimationFrame(animate);}
  function animate(now){effects=effects.filter(e=>now-e.time<1100);draw();effectFrame=effects.length?requestAnimationFrame(animate):0;}
  function execute(){
    if(!pending||!ownTurn())return;
    const p=pending,result=T.apply(game,p.id,p.mode,p.x,p.y);pending=null;
    notice=result.ok?(game.ap?'Il reste '+game.ap+' action'+(game.ap>1?'s':'')+'.':'Tes trois actions sont utilisées. Termine ton tour.'):result.reason;
    burst();render();
  }
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function finishTurn(){
    if(!ownTurn())return;
    const token=generation;pending=null;busy=true;T.endTurn(game);burst();render();
    try {
      for(let i=0;i<3&&game.ap>0&&game.winner===null;i++) {
        const action=T.chooseBot(game);if(!action)break;
        botPreview=T.preview(game,action.id,action.mode,action.x,action.y);selected=action.id;
        if(zoom)center(unit());notice='L’IA prépare : '+T.ROSTER[unit().type].identity+'.';render();
        await delay(850);if(token!==generation)return;
        T.apply(game,action.id,action.mode,action.x,action.y);botPreview=null;burst();render();
        await delay(650);if(token!==generation)return;
      }
      if(game.winner===null)T.endTurn(game);
      burst();selected=game.units.find(u=>u.id===lastOwn&&u.hp>0)?.id||game.units.find(u=>u.team===0&&u.hp>0)?.id||lastOwn;
      if(zoom)center(unit());mode='move';notice='À toi. Trois actions, prends le temps de préparer ton tour.';
    } finally {if(token===generation){busy=false;botPreview=null;render();}}
  }
  function reset(){generation++;game=T.create();selected='0-ESTP';lastOwn=selected;mode='move';pending=null;botPreview=null;busy=false;effects=[];notice='Nouvelle équipe adverse. À toi de jouer.';if(zoom)center(unit());render();}
  function roster(team){
    const root=$(team?'enemyRoster':'ownRoster');root.replaceChildren();
    for(const type of Object.keys(T.ROSTER)){const u=game.units.find(u=>u.team===team&&u.type===type),b=document.createElement('button');b.type='button';b.className=(u.id===selected?'chosen ':'')+(u.hp<=0?'fallen':'');b.setAttribute('aria-label',type+', '+u.hp+' points de vie, '+(team?'adversaire':'allié'));b.setAttribute('aria-pressed',String(u.id===selected));b.append(type);const life=document.createElement('span');life.textContent=u.hp>0?u.hp+'/'+u.max+' PV':'Hors jeu';b.append(life);b.onclick=()=>select(u.id);root.append(b);}
  }
  function render(){
    const u=unit(),s=T.ROSTER[u.type],ours=u.team===0,playable=ownTurn()&&ours&&u.hp>0&&u.orders<2;
    $('turnLabel').textContent=game.winner!==null?'Partie terminée':busy?'L’adversaire joue':'À toi de jouer';
    $('turnMeta').textContent='Tour '+T.roundNumber(game)+' / '+game.ap+' action'+(game.ap>1?'s':'')+' restante'+(game.ap>1?'s':'');
    $('actions').setAttribute('aria-label',game.ap+' actions restantes');[...$('actions').children].forEach((e,i)=>e.classList.toggle('spent',i>=game.ap));
    $('endTurn').disabled=!ownTurn();$('endTurn').textContent=game.ap?'Fin du tour':'Laisser jouer l’IA';
    $('countAlly').textContent=game.units.filter(u=>u.hp>0&&u.team===0).length;$('countEnemy').textContent=game.units.filter(u=>u.hp>0&&u.team===1).length;
    $('ownAlive').textContent=$('countAlly').textContent+' en jeu';$('botStyle').textContent={assaut:'Assaut',siege:'Siège',prudent:'Prudence'}[game.style];
    $('family').textContent=s.family+' / '+familyNames[s.family];$('camp').textContent=ours?'Ton équipe':'Adversaire';$('unitName').textContent=u.type;$('unitRole').textContent=s.identity;
    $('health').replaceChildren();for(let i=0;i<u.max;i++){const pip=document.createElement('i');pip.className='pip'+(i>=u.hp?' lost':'');pip.setAttribute('aria-hidden','true');$('health').append(pip);}const health=document.createElement('span');health.textContent=u.hp+'/'+u.max+' PV'+(u.shield?' + '+u.shield+' bouclier':'');$('health').append(health);
    $('moveDescription').textContent='Déplacement : '+(s.move==='knight'?'saut en L':s.range+' cases maximum en '+moveNames[s.move])+'. Position : '+String.fromCharCode(65+u.x)+(u.y+1)+'.';
    $('skillName').textContent=s.name;$('skillDescription').textContent=s.description;
    $('cooldown').textContent=u.ready>game.turn?'Recharge : encore '+Math.ceil((u.ready-game.turn)/2)+' tour'+(u.ready-game.turn>2?'s':'')+' allié'+(u.ready-game.turn>2?'s':'')+'.':'Capacité disponible. Deux actions, puis un tour allié de recharge.';
    $('passiveBox').hidden=!s.passive;if(s.passive){$('passiveDescription').textContent=s.passive;const moves=['ESFP','ISFP','ESTP'].includes(u.type);$('passiveProgress').textContent='Rythme : '+((moves?u.moves:u.attacks)%2)+'/2 '+(moves?'déplacements':'attaques')+(u.cheapSwap?' / permutation chargée':'');}
    $('unitOrders').textContent=u.hp<=0?'Hors combat.':u.orders+'/2 ordres reçus ce tour'+(u.rootUntil>=game.turn?' / immobilisé':'')+(u.anchorUntil>=game.turn?' / ancré':'')+'.';
    document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('selected',mode===b.dataset.mode);b.setAttribute('aria-pressed',String(mode===b.dataset.mode));b.disabled=!playable||game.ap<T.cost(u,b.dataset.mode)||(b.dataset.mode==='skill'&&u.ready>game.turn);});
    $('skillCost').textContent=T.cost(u,'skill')+' action'+(T.cost(u,'skill')>1?'s':'');$('confirm').disabled=!pending||!ownTurn();$('notice').textContent=notice;
    $('previewTarget').disabled=!ownTurn();$('zoom').setAttribute('aria-pressed',String(zoom));$('zoom').textContent=zoom?'Vue entière':'Zoom ×2';$('pan').hidden=!zoom;
    roster(0);roster(1);$('history').replaceChildren();for(const entry of game.log){const li=document.createElement('li');li.textContent=entry;$('history').append(li);}
    $('result').hidden=game.winner===null;if(game.winner!==null){$('resultTitle').textContent=game.winner==='draw'?'Égalité':game.winner===0?'Passage ouvert.':'L’IA a trouvé l’ouverture.';$('resultText').textContent=(game.winner===0?'Victoire':'Fin de partie')+' au tour '+T.roundNumber(game)+'. Une nouvelle partie change la formation et le style de l’adversaire.';}
    draw();
  }
  function draw(){
    const scale=800/view.n,visible=p=>p.x>=view.x&&p.y>=view.y&&p.x<view.x+view.n&&p.y<view.y+view.n;
    const xy=p=>({x:(p.x-view.x)*scale,y:(p.y-view.y)*scale});
    ctx.clearRect(0,0,800,800);
    for(let y=view.y;y<view.y+view.n;y++)for(let x=view.x;x<view.x+view.n;x++){
      const p=xy({x,y});ctx.fillStyle=(x+y)%2?'#1d2a36':'#233340';ctx.fillRect(p.x,p.y,scale,scale);
      if(x===4||x===11){ctx.fillStyle='rgba(123,172,189,.06)';ctx.fillRect(p.x,p.y,scale,scale);}
      if(y===0||y===15){ctx.fillStyle=y===0?'rgba(255,154,164,.17)':'rgba(124,228,193,.17)';ctx.fillRect(p.x,p.y,scale,scale);}
      if((x===7||x===8)&&(y===6||y===9)){ctx.fillStyle='#59636c';ctx.fillRect(p.x+5,p.y+5,scale-10,scale-10);}
      if(y===2||y===13){ctx.strokeStyle=y===2?enemy:ally;ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(p.x,p.y+scale/2);ctx.lineTo(p.x+scale,p.y+scale/2);ctx.stroke();ctx.setLineDash([]);}
    }
    const mark=(cells,color,outline=false)=>{for(const p of cells){if(!visible(p))continue;const q=xy(p);ctx.fillStyle=color;ctx.fillRect(q.x+2,q.y+2,scale-4,scale-4);if(outline){ctx.strokeStyle=gold;ctx.lineWidth=2;ctx.strokeRect(q.x+3,q.y+3,scale-6,scale-6);}}};
    for(const zone of game.zones){mark(zone.cells,zone.team?'rgba(255,154,164,.14)':'rgba(124,228,193,.14)');for(const p of zone.cells){if(!visible(p))continue;const q=xy(p);ctx.strokeStyle=zone.team?enemy:ally;ctx.lineWidth=2;ctx.setLineDash(zone.kind==='echo'?[3,4]:[8,3]);ctx.strokeRect(q.x+6,q.y+6,scale-12,scale-12);ctx.setLineDash([]);}}
    for(const wall of game.walls){if(!visible(wall))continue;const p=xy(wall);ctx.fillStyle=wall.team?'#994d5a':'#3c826d';ctx.fillRect(p.x+5,p.y+5,scale-10,scale-10);ctx.strokeStyle=wall.team?enemy:ally;ctx.strokeRect(p.x+9,p.y+9,scale-18,scale-18);}
    const u=unit();if(!busy&&game.winner===null&&u.hp>0){if(u.team===1)mark(T.attackCells(game,u),'rgba(255,154,164,.24)');else if(mode==='move')mark(T.moves(game,u),'rgba(124,228,193,.13)');else if(mode==='attack')mark(T.attackCells(game,u),'rgba(244,206,133,.2)');}
    const p=botPreview||pending;
    if(p){mark(p.cells,p.team===1||busy?'rgba(255,154,164,.32)':'rgba(244,206,133,.28)',true);if(p.path.length){ctx.strokeStyle=gold;ctx.lineWidth=3;ctx.setLineDash([5,5]);ctx.beginPath();const source=xy(game.units.find(u=>u.id===p.id));ctx.moveTo(source.x+scale/2,source.y+scale/2);for(const step of p.path){const q=xy(step);ctx.lineTo(q.x+scale/2,q.y+scale/2);}ctx.stroke();ctx.setLineDash([]);}}
    for(const gate of game.gates){if(!visible(gate))continue;const p=xy(gate);ctx.fillStyle=gate.hp>0?(gate.team?'#7e4851':'#326556'):'#10251e';ctx.fillRect(p.x+3,p.y+7,scale-6,scale-14);ctx.strokeStyle=gate.team?enemy:ally;ctx.lineWidth=2;ctx.strokeRect(p.x+3,p.y+7,scale-6,scale-14);ctx.fillStyle='#f6f5eb';ctx.textAlign='center';ctx.font='600 '+Math.max(14,scale*.28)+'px system-ui';ctx.fillText(gate.hp>0?String(gate.hp):'↟',p.x+scale/2,p.y+scale*.61);}
    for(const v of game.units){if(v.hp<=0||!visible(v))continue;const p=xy(v),cx=p.x+scale/2,cy=p.y+scale*.45,r=scale*.32,col=v.team?enemy:ally,f=T.ROSTER[v.type].family;
      if(v.id===selected){ctx.strokeStyle=gold;ctx.lineWidth=3;ctx.strokeRect(p.x+2,p.y+2,scale-4,scale-4);}
      ctx.beginPath();if(f==='ST')ctx.rect(cx-r,cy-r*.8,r*2,r*1.6);else if(f==='NT'){ctx.moveTo(cx,cy-r);ctx.lineTo(cx+r,cy);ctx.lineTo(cx,cy+r);ctx.lineTo(cx-r,cy);ctx.closePath();}else if(f==='SF'){ctx.moveTo(cx,cy-r);ctx.lineTo(cx+r,cy+r*.8);ctx.lineTo(cx-r,cy+r*.8);ctx.closePath();}else ctx.arc(cx,cy,r,0,Math.PI*2);
      ctx.fillStyle=v.team?'#623640':'#255549';ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#f5faf9';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 '+Math.max(12,scale*.23)+'px system-ui';ctx.fillText(v.type,cx,cy+1);
      const hpW=scale*.68;ctx.fillStyle='#132029';ctx.fillRect(cx-hpW/2,p.y+scale*.84,hpW,4);ctx.fillStyle=col;ctx.fillRect(cx-hpW/2,p.y+scale*.84,hpW*v.hp/v.max,4);
      if(v.shield){ctx.fillStyle='#98c5ff';ctx.fillRect(cx-hpW/2,p.y+scale*.93,hpW*Math.min(v.shield/3,1),3);}
      if(v.rootUntil>=game.turn||v.anchorUntil>=game.turn){ctx.strokeStyle=gold;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x+6,p.y+scale-9);ctx.lineTo(p.x+scale-6,p.y+scale-9);ctx.stroke();}
    }
    const now=performance.now();for(const hit of effects){if(!visible(hit))continue;const p=xy(hit);ctx.globalAlpha=Math.max(0,1-(now-hit.time)/1100);ctx.fillStyle=gold;ctx.strokeStyle='#10151c';ctx.lineWidth=4;ctx.textAlign='center';ctx.font='800 '+Math.max(18,scale*.5)+'px system-ui';const y=p.y+scale*.3-(now-hit.time)*.025;ctx.strokeText('−'+hit.n,p.x+scale/2,y);ctx.fillText('−'+hit.n,p.x+scale/2,y);ctx.globalAlpha=1;}
    ctx.textBaseline='alphabetic';ctx.fillStyle='#becbd5';ctx.font='12px system-ui';ctx.textAlign='left';
    for(let i=0;i<view.n;i++){ctx.fillText(String.fromCharCode(65+view.x+i),i*scale+3,12);if(i)ctx.fillText(String(view.y+i+1),3,i*scale+12);}
  }
  canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();tile(view.x+Math.floor((e.clientX-r.left)/r.width*view.n),view.y+Math.floor((e.clientY-r.top)/r.height*view.n));});
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;pending=null;notice=mode==='move'?'Choisis une case éclairée.':mode==='attack'?'Choisis une direction : le champ de frappe apparaît.':T.ROSTER[unit().type].description;render();});
  $('confirm').onclick=execute;$('endTurn').onclick=finishTurn;$('newMatch').onclick=reset;$('again').onclick=reset;
  $('zoom').onclick=()=>{zoom=!zoom;if(zoom)center(unit());else view={x:0,y:0,n:16};render();};
  document.querySelectorAll('[data-pan]').forEach(b=>b.onclick=()=>{const d={left:[-3,0],right:[3,0],up:[0,-3],down:[0,3]}[b.dataset.pan];view.x=Math.max(0,Math.min(8,view.x+d[0]));view.y=Math.max(0,Math.min(8,view.y+d[1]));draw();});
  for(let i=0;i<16;i++){const f=new Option(String.fromCharCode(65+i),String(i)),r=new Option(String(i+1),String(i));$('targetFile').add(f);$('targetRank').add(r);}
  $('previewTarget').onclick=()=>tile(Number($('targetFile').value),Number($('targetRank').value));
  window.addEventListener('keydown',e=>{if(e.key==='Escape'){pending=null;notice='Action annulée.';render();}});
  // Accès en lecture et commandes ordinaires pour les vérifications du prototype.
  window.tactics={get state(){return game;},get selected(){return selected;},get mode(){return mode;},get pending(){return pending;},select,tile,render,reset};
  render();
})();
