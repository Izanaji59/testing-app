(function(){
  'use strict';
  const G=EmpreinteGo,$=id=>document.getElementById(id),points=[],powerButtons={},enemyButtons={};
  let chosen=['INTJ','ENTJ','ENTP'],game=G.create({deck:chosen}),started=false,busy=false,mode='place',draft=[],pending=null,inspected=null,hovered=null,focusPoint=40,generation=0,notice='Deux pierres par camp sont déjà au centre. À toi de construire la suite.',flashes=[],flashTimer=null;
  const mine=()=>started&&!busy&&game.player===0&&game.winner===null;
  const delay=ms=>new Promise(r=>setTimeout(r,ms));
  const plain=i=>({kind:'place',points:[i]});
  function cancel(){mode='place';draft=[];pending=null;notice='Pose une pierre sur une intersection libre.';render();}
  function choosePower(type){
    if(!started){
      if(chosen.includes(type))chosen=chosen.filter(t=>t!==type);
      else if(chosen.length<3)chosen.push(type);
      else {notice='Désélectionne un de tes trois pouvoirs pour choisir '+type+'.';render();return;}
      notice=chosen.length===3?'Ton équipe est prête. Lance le duel.':'Choisis encore '+(3-chosen.length)+' pouvoir'+(chosen.length<2?'s':'')+'.';render();return;
    }
    if(!mine()||!chosen.includes(type))return;
    if(game.energy[0]<G.POWERS[type].cost){notice='Il manque de la réserve. Une pose normale en rapporte un point.';render();return;}
    mode=mode===type?'place':type;draft=[];pending=null;inspected=null;
    notice=mode==='place'?'Pose une pierre sur une intersection libre.':G.POWERS[type].instruction;render();
  }
  function inspect(i){inspected=i;hovered=null;drawBoard();}
  function pressPoint(i){
    if(!started){if(game.board[i]!==G.EMPTY)inspect(i);else {notice='Choisis trois pouvoirs, puis lance le duel.';render();}return;}
    if(!mine()){if(!busy&&game.board[i]!==G.EMPTY)inspect(i);return;}
    if(pending&&pending.action.points?.[pending.action.points.length-1]===i){commit(pending.action);return;}
    if(mode==='place'){
      if(game.board[i]!==G.EMPTY){inspect(i);return;}
      const p=G.preview(game,plain(i));if(!p.ok){notice=p.reason;render();return;}
      if($('confirmPlacements').checked){pending=p;notice='Pose en '+G.coordinate(i)+(p.captured.length?' / '+p.captured.length+' capture'+(p.captured.length>1?'s':''):'')+'. Confirme pour jouer.';render();}
      else commit(p.action);
      return;
    }
    if(pending){pending=null;draft=[];}
    const power=G.POWERS[mode];
    if(mode==='INTP'){
      const p=G.preview(game,{kind:'power',type:mode,points:[i]});if(!p.ok){notice=p.reason;render();return;}pending=p;
    }else if(draft.length===0){
      if(mode==='ENTP'){
        if(game.board[i]!==0){notice='Sélectionne une de tes propres pierres.';render();return;}
      }else{const p=G.preview(game,plain(i));if(!p.ok){notice=p.reason;render();return;}}
      draft=[i];pending=null;notice=mode==='INTJ'?'Pose prévue en '+G.coordinate(i)+'. Choisis maintenant l’intersection annoncée.':mode==='ENTJ'?'Première pose en '+G.coordinate(i)+'. Choisis une intersection libre voisine.':'Pierre sélectionnée en '+G.coordinate(i)+'. Choisis sa destination voisine.';render();return;
    }else{
      if(draft[0]===i){draft=[];notice=power.instruction;render();return;}
      const p=G.preview(game,{kind:'power',type:mode,points:[draft[0],i]});if(!p.ok){notice=p.reason;render();return;}pending=p;
    }
    notice=power.name+' / '+power.cost+' point'+(power.cost>1?'s':'')+' de réserve'+(pending.captured.length?' / '+pending.captured.length+' capture'+(pending.captured.length>1?'s':''):'')+'. Confirme pour jouer.';render();
  }
  function flash(){
    clearTimeout(flashTimer);flashes=[...(game.last?.captured||[]),...(game.last?.resolved||[]).flatMap(f=>f.captured)];
    if(flashes.length)flashTimer=setTimeout(()=>{flashes=[];drawBoard();},750);
  }
  function commit(action){
    if(!mine())return;
    const result=G.apply(game,action);if(!result.ok){notice=result.reason;render();return;}
    mode='place';draft=[];pending=null;inspected=null;hovered=null;flash();
    if(game.winner!==null){notice=game.winner===0?'Tu as gagné ce duel.':'Le duel est terminé.';render();return;}
    busy=true;notice='L’IA réfléchit à son prochain coup.';render();runBot(generation);
  }
  async function runBot(token){
    await delay(220);if(token!==generation)return;
    const action=G.chooseBot(game);if(!action){busy=false;render();return;}
    notice=action.kind==='power'?'L’IA joue '+action.type+' / '+G.POWERS[action.type].name+'.':action.kind==='pass'?'L’IA passe son tour.':'L’IA choisit sa pose.';render();
    await delay(500);if(token!==generation)return;
    const result=G.apply(game,action);busy=false;flash();
    if(!result.ok)notice='Le coup de l’IA a été refusé : '+result.reason;
    else if(game.winner!==null)notice=game.winner===0?'Tu as gagné ce duel.':'Le duel est terminé.';
    else notice=game.last.resolved.length?'La prévision s’est réalisée. À toi de jouer.':result.captured.length?'L’IA a capturé '+result.captured.length+' pierre'+(result.captured.length>1?'s':'')+'. À toi de jouer.':'À toi de jouer. Observe les libertés avant de poser.';
    render();
  }
  function start(){if(chosen.length!==3)return;game=G.create({deck:chosen,enemyDeck:game.decks[1],style:game.style});started=true;notice='À toi. Touche une intersection libre pour poser une pierre.';render();}
  function reset(autostart=false){generation++;clearTimeout(flashTimer);game=G.create({deck:chosen.length===3?chosen:undefined});started=false;busy=false;mode='place';draft=[];pending=null;inspected=null;hovered=null;flashes=[];notice='Nouvel adversaire. Choisis tes trois pouvoirs.';render();if(autostart)start();}
  function describePower(type,enemy=false){notice=(enemy?'Pouvoir adverse : ':'')+type+' / '+G.POWERS[type].description+' Coût : '+G.POWERS[type].cost+'.';render();}
  function render(){
    document.body.dataset.playing=String(started);
    $('yourScore').replaceChildren(String(game.captured[0])+' ');const s0=document.createElement('small');s0.textContent='/ '+G.GOAL;$('yourScore').append(s0);
    $('theirScore').replaceChildren(String(game.captured[1])+' ');const s1=document.createElement('small');s1.textContent='/ '+G.GOAL;$('theirScore').append(s1);
    $('goTurn').textContent=game.winner!==null?'Duel terminé':!started?'Choisis tes trois pouvoirs':busy?'L’adversaire joue':'À toi de jouer';
    $('goMove').textContent=started?'Coup '+Math.min(game.ply+1,G.MAX_MOVES)+' / '+G.MAX_MOVES+'  —  Réserve '+game.energy[0]+'/6':'Réflexion libre';
    $('yourEnergy').textContent=game.energy[0]+' / '+G.CAP;$('theirEnergy').textContent='Réserve '+game.energy[1]+' / '+G.CAP;
    [...$('reserveTrack').children].forEach((e,i)=>e.classList.toggle('filled',i<game.energy[0]));
    $('startGo').hidden=started;$('startGo').disabled=chosen.length!==3;$('passGo').hidden=!started||game.winner!==null;$('passGo').disabled=!mine();
    $('confirmGo').hidden=!pending;$('confirmGo').disabled=!mine();$('cancelGo').hidden=mode==='place'&&!pending;$('cancelGo').disabled=!mine();
    $('goNotice').textContent=notice;$('powersTitle').textContent=started?'Tes trois pouvoirs':'Choisis trois pouvoirs';$('deckCount').textContent=chosen.length+' / 3';
    $('powerHelp').textContent=started?'Les pouvoirs consomment un coup et ne rechargent pas la réserve.':'Désélectionne un pouvoir pour en essayer un autre.';
    for(const [type,b]of Object.entries(powerButtons)){
      b.hidden=started&&!chosen.includes(type);b.classList.toggle('selected',!started&&chosen.includes(type));b.classList.toggle('active',started&&mode===type);b.classList.toggle('locked',started&&game.energy[0]<G.POWERS[type].cost);
      b.setAttribute('aria-pressed',String(started?mode===type:chosen.includes(type)));b.disabled=started&&(!mine()||game.energy[0]<G.POWERS[type].cost);
      b.querySelector('.selection').textContent=started?(mode===type?'Sélectionné':game.energy[0]<G.POWERS[type].cost?'Réserve insuffisante':'Disponible'):(chosen.includes(type)?'Dans ton équipe':'Choisir ce pouvoir');
    }
    $('quickPowers').hidden=!started||game.winner!==null;$('quickPowers').replaceChildren();
    for(const type of ['place',...chosen]){const b=document.createElement('button');b.textContent=type==='place'?'Pose':type;b.setAttribute('aria-label',type==='place'?'Pose normale':type+', '+G.POWERS[type].name);b.setAttribute('aria-pressed',String(mode===type));if(type!=='place'){const c=document.createElement('small');c.textContent=String(G.POWERS[type].cost);b.append(c);}b.disabled=!mine()||(type!=='place'&&game.energy[0]<G.POWERS[type].cost);b.onclick=()=>type==='place'?cancel():choosePower(type);$('quickPowers').append(b);}
    $('goBotStyle').textContent={offensif:'Cherche les captures et le contact.',patient:'Protège ses groupes avant de fermer les tiens.',mobile:'Cherche les changements de forme et les ouvertures.'}[game.style];
    for(const [type,b]of Object.entries(enemyButtons))b.hidden=!game.decks[1].includes(type);
    $('forecastInfo').textContent=game.forecasts.filter(Boolean).map(f=>(f.team?'Prévision adverse':'Ta prévision')+' : '+G.coordinate(f.point)+(game.board[f.point]===G.EMPTY?' au prochain tour.':' est occupée.')).join(' ');
    $('goHistory').replaceChildren();for(const text of game.log){const li=document.createElement('li');li.textContent=text;$('goHistory').append(li);}
    $('goResult').hidden=game.winner===null;
    if(game.winner!==null){$('goResultTitle').textContent=game.winner==='draw'?'Égalité.':game.winner===0?'Tu as trouvé l’ouverture.':'L’IA a fermé le passage.';const scores=game.captured[0]+' capture'+(game.captured[0]>1?'s':'')+' pour toi, '+game.captured[1]+' pour l’IA.';$('goResultDetail').textContent=game.reason==='captures'?scores+' Objectif de cinq captures atteint.':scores+' '+(game.reason==='passes'?'Les deux camps ont passé.':'La limite de 80 coups est atteinte.')+(game.captured[0]===game.captured[1]?' Espace occupé ou entouré : '+game.space[0]+' contre '+game.space[1]+'.':'');}
    drawBoard();
  }
  function drawBoard(){
    const inspectedPoint=hovered!==null?hovered:inspected,selectedGroup=inspectedPoint!==null?G.group(game.board,inspectedPoint):{stones:[],liberties:[]};
    const ownGroups=G.groups(game.board),groupsByPoint=new Map();for(const g of ownGroups)for(const i of g.stones)groupsByPoint.set(i,g);
    $('groupInfo').textContent=selectedGroup.stones.length?(selectedGroup.team?'Groupe adverse':'Ton groupe')+' : '+selectedGroup.stones.length+' pierre'+(selectedGroup.stones.length>1?'s':'')+', '+selectedGroup.liberties.length+' liberté'+(selectedGroup.liberties.length>1?'s':'')+'.':'Les groupes se relient par les côtés.';
    const shown=pending,last=[...(game.last?.placed||[]),...(game.last?.resolved||[]).map(f=>f.point)];
    for(let i=0;i<points.length;i++){
      const b=points[i],stone=game.board[i];b.dataset.stone=String(stone);b.className='point'+(stone===G.EMPTY?' empty':'');b.disabled=busy;b.tabIndex=i===focusPoint?0:-1;
      const mark=b.querySelector('.mark');mark.textContent='';
      b.classList.toggle('grouped',selectedGroup.stones.includes(i));b.classList.toggle('liberty',selectedGroup.liberties.includes(i));b.classList.toggle('last',last.includes(i)&&stone!==G.EMPTY);b.classList.toggle('flash',flashes.includes(i));
      const forecast=game.forecasts.find(f=>f?.point===i);
      if(forecast&&stone===G.EMPTY){b.classList.add('forecast');b.classList.toggle('foe',forecast.team===1);mark.textContent='P';}
      if(shown){if(shown.placed.includes(i)){b.classList.add('preview');mark.textContent=shown.placed.length>1?String(shown.placed.indexOf(i)+1):'';}if(shown.removed.includes(i))b.classList.add('removing');if(shown.captured.includes(i))b.classList.add('capture');if(shown.forecast?.point===i){b.classList.add('forecast');mark.textContent='P';}}
      else if(draft.includes(i)){if(mode==='ENTP')b.classList.add('removing');else b.classList.add('preview');mark.textContent='1';}
      if(mode==='ENTJ'||mode==='ENTP')if(draft.length&&G.neighbors(draft[0]).includes(i)&&stone===G.EMPTY)b.classList.add('spotlight');
      const grp=groupsByPoint.get(i);b.setAttribute('aria-label',G.coordinate(i)+', '+(stone===G.EMPTY?'intersection libre':(stone?'pierre adverse':'ta pierre')+', '+grp.liberties.length+' liberté'+(grp.liberties.length>1?'s':''))+(forecast?', prévision '+(forecast.team?'adverse':'alliée'):''));
    }
  }
  function init(){
    const ns='http://www.w3.org/2000/svg';for(let i=0;i<9;i++){
      const col=document.createElement('span');col.textContent=String.fromCharCode(65+i);$('columnLabels').append(col);const row=document.createElement('span');row.textContent=String(9-i);$('rowLabels').append(row);
      for(const horizontal of [true,false]){const line=document.createElementNS(ns,'line');line.setAttribute('x1',String(horizontal?50:50+100*i));line.setAttribute('x2',String(horizontal?850:50+100*i));line.setAttribute('y1',String(horizontal?50+100*i:50));line.setAttribute('y2',String(horizontal?50+100*i:850));$('gridLines').append(line);}
    }
    for(const point of [20,24,40,56,60]){const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',String(50+point%9*100));dot.setAttribute('cy',String(50+Math.floor(point/9)*100));dot.setAttribute('r','4');$('gridLines').append(dot);}
    for(let i=0;i<81;i++){
      const b=document.createElement('button');b.type='button';b.className='point';b.dataset.point=String(i);const stone=document.createElement('span');stone.className='pebble';stone.setAttribute('aria-hidden','true');const mark=document.createElement('span');mark.className='mark';mark.setAttribute('aria-hidden','true');b.append(stone,mark);b.onclick=()=>{focusPoint=i;pressPoint(i);};
      b.onpointerenter=e=>{if(e.pointerType==='mouse'){hovered=i;drawBoard();}};b.onpointerleave=e=>{if(e.pointerType==='mouse'){hovered=null;drawBoard();}};
      b.onkeydown=e=>{const dx={ArrowLeft:-1,ArrowRight:1,ArrowUp:-9,ArrowDown:9}[e.key];if(dx){e.preventDefault();let next=i+dx;if(dx===-1&&i%9===0||dx===1&&i%9===8)next=i;if(next>=0&&next<81){focusPoint=next;drawBoard();points[next].focus();}}};
      points.push(b);$('intersections').append(b);
    }
    for(let i=0;i<6;i++)$('reserveTrack').append(document.createElement('i'));
    for(const power of Object.values(G.POWERS)){
      const b=document.createElement('button');b.type='button';b.className='power-card';b.dataset.power=power.type;
      const type=document.createElement('span');type.className='type';type.textContent=power.type;
      const copy=document.createElement('span');copy.className='copy';const name=document.createElement('strong');name.textContent=power.name;const desc=document.createElement('span');desc.className='description';desc.textContent=power.short;const selected=document.createElement('span');selected.className='selection';copy.append(name,desc,selected);
      const cost=document.createElement('span');cost.className='cost';cost.textContent=String(power.cost);b.append(type,copy,cost);b.setAttribute('aria-label',power.type+', '+power.name+', coût '+power.cost);b.onclick=()=>choosePower(power.type);powerButtons[power.type]=b;$('powerCards').append(b);
      const enemy=document.createElement('button');enemy.textContent=power.type;enemy.setAttribute('aria-label','Voir le pouvoir '+power.type+' adverse');enemy.onclick=()=>describePower(power.type,true);enemyButtons[power.type]=enemy;$('enemyPowers').append(enemy);
    }
    $('startGo').onclick=start;$('newGo').onclick=()=>reset();$('againGo').onclick=()=>reset(true);$('confirmGo').onclick=()=>pending&&commit(pending.action);$('cancelGo').onclick=cancel;$('passGo').onclick=()=>commit({kind:'pass'});
    window.addEventListener('keydown',e=>{if(e.key==='Escape'&&mine())cancel();});
    render();
  }
  init();
})();
