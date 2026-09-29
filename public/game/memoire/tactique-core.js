/* Empreinte : règles du duel tactique, sans dépendance au navigateur. */
(function (root) {
  'use strict';
  const N = 16;
  const DATA = [
    ['INTJ','NT','Vision','ortho',3,'mur','Plan directeur','Dresse trois obstacles pour un tour.',null],
    ['INTP','NT','Détail','diag',3,'precision','Point faible','Frappe une cible à travers son bouclier.','Chaque deuxième attaque gagne 1 dégât sur sa première cible.'],
    ['ENTJ','NT','Commande','king',2,'command','Ralliement','Les alliés proches gagnent 1 dégât à leur prochaine attaque.',null],
    ['ENTP','NT','Divergence','knight',1,'swap','Permutation','Échange sa position avec un ennemi proche.','Deux attaques chargent une permutation à 1 action.'],
    ['ESFP','SF','Élan','king',3,'dance','Tourbillon','Un pas, puis une frappe autour de soi.','Chaque deuxième déplacement repousse les ennemis voisins.'],
    ['ISFP','SF','Contre-pied','diag',3,'retreat','Décrochement','Frappe ses flancs puis recule vers une case choisie.','Deux déplacements renforcent la prochaine attaque de 1 dégât.'],
    ['ESFJ','SF','Cohésion','ortho',3,'shield','Cercle protecteur','Protège les alliés autour de la case ciblée.',null],
    ['ISFJ','SF','Interposition','king',2,'rescue','Relève','Prend la place d’un allié et lui donne un bouclier.',null],
    ['ENFP','NF','Rebond','knight',1,'bounce','Étincelles','Frappe une cible puis rebondit sur deux ennemis proches.','Chaque deuxième attaque rebondit sur un ennemi supplémentaire.'],
    ['INFP','NF','Résonance','diag',3,'echo','Anneau d’écho','Annonce un anneau qui frappe au début du prochain tour allié.','Chaque deuxième attaque laisse un écho visible de 1 dégât.'],
    ['ENFJ','NF','Attraction','king',2,'pull','Rapprochement','Attire un ennemi de deux cases et inflige 1 dégât.',null],
    ['INFJ','NF','Convergence','diag',3,'root','Point d’arrêt','Immobilise un ennemi pendant son prochain tour.',null],
    ['ESTP','ST','Percée','ortho',4,'charge','Charge','Fonce en ligne, frappe et repousse le premier ennemi.', 'Chaque deuxième déplacement donne 2 points de bouclier.'],
    ['ISTP','ST','Angle','king',2,'ricochet','Ricochet','Un tir droit se divise à angle droit après son premier impact.','Chaque deuxième attaque inflige 1 dégât de plus aux portes.'],
    ['ESTJ','ST','Barrage','ortho',3,'watch','Ligne de garde','Annonce une zone : le premier ennemi qui y entre est frappé et arrêté.',null],
    ['ISTJ','ST','Ancrage','king',2,'anchor','Forteresse','Gagne 3 points de bouclier et résiste aux déplacements forcés.',null]
  ];
  const ROSTER = Object.fromEntries(DATA.map(([type,family,identity,move,range,skill,name,description,passive]) => [type,{type,family,identity,move,range,skill,name,description,passive,hp:family==='ST'?8:family==='NF'?5:6}]));
  const ORTH = [[0,-1],[1,0],[0,1],[-1,0]], DIAG = [[1,-1],[1,1],[-1,1],[-1,-1]], KING = [...ORTH,...DIAG];
  const KNIGHT = [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
  const inBoard=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<N&&y<N;
  const dist=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
  const same=(a,b)=>a.x===b.x&&a.y===b.y;
  const at=(g,x,y)=>g.units.find(u=>u.hp>0&&u.x===x&&u.y===y);
  const gateAt=(g,x,y)=>g.gates.find(v=>v.hp>0&&v.x===x&&v.y===y);
  const copy=p=>({x:p.x,y:p.y});
  const cellsAround=(p,dirs)=>dirs.map(([x,y])=>({x:p.x+x,y:p.y+y})).filter(p=>inBoard(p.x,p.y));
  const roundNumber=g=>Math.floor(g.turn/2)+1;
  function create(random=Math.random) {
    const g={turn:0,team:0,ap:3,units:[],gates:[],zones:[],walls:[],winner:null,log:[],last:null,style:['assaut','siege','prudent'][Math.floor(random()*3)]};
    for(let team=0;team<2;team++) {
      for(const [family,row] of [['ST',10],['SF',11],['NF',12],['NT',14]]) {
        const specs=DATA.filter(d=>d[1]===family).map(d=>d[0]);
        if(team)for(let i=specs.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[specs[i],specs[j]]=[specs[j],specs[i]];}
        specs.forEach((type,i)=>g.units.push({id:team+'-'+type,type,team,x:[2,6,9,13][i],y:team?15-row:row,hp:ROSTER[type].hp,max:ROSTER[type].hp,shield:0,shieldUntil:-1,buff:0,buffUntil:-1,facing:team?2:0,orders:0,attacks:0,moves:0,rootUntil:-1,anchorUntil:-1,cheapSwap:false,ready:-1}));
      }
      for(const x of [4,11])g.gates.push({id:'gate-'+team+'-'+x,team,x,y:team?2:13,hp:8,max:8});
    }
    return g;
  }
  function addLog(g,text){g.log.unshift(text);g.log=g.log.slice(0,8);}
  function terrain(g,u,x,y) {
    if(!inBoard(x,y))return false;
    if((x===7||x===8)&&(y===6||y===9))return false;
    if(g.walls.some(w=>w.team!==u.team&&same(w,{x,y})))return false;
    const line=u.team===0?2:13;
    if(y===line&&!g.gates.some(v=>v.team!==u.team&&v.x===x&&v.hp<=0))return false;
    return true;
  }
  function empty(g,u,x,y){return terrain(g,u,x,y)&&!at(g,x,y);}
  function line(a,b) {
    // Cases traversées par un rayon ou par un saut.
    const out=[],dx=b.x-a.x,dy=b.y-a.y,steps=Math.max(Math.abs(dx),Math.abs(dy));
    for(let i=1;i<=steps;i++){const p={x:Math.round(a.x+dx*i/steps),y:Math.round(a.y+dy*i/steps)};if(!out.some(q=>same(p,q)))out.push(p);}
    return out;
  }
  function sight(g,u,p,unitsBlock=false) {
    const points=line(u,p);
    for(let i=0;i<points.length;i++) {
      const q=points[i],end=i===points.length-1;
      if(!terrain(g,u,q.x,q.y)&&!(end&&gateAt(g,q.x,q.y)?.team!==u.team&&gateAt(g,q.x,q.y)))return false;
      if(unitsBlock&&!end&&at(g,q.x,q.y))return false;
    }
    return true;
  }
  function crossBarrier(g,u,p) {
    return line(u,p).every(q=>terrain(g,u,q.x,q.y));
  }
  function moves(g,u) {
    if(u.hp<=0||u.rootUntil>=g.turn||u.anchorUntil>=g.turn)return [];
    const s=ROSTER[u.type],result=[];
    if(s.move==='knight') {
      for(const [dx,dy] of KNIGHT){const p={x:u.x+dx,y:u.y+dy};if(empty(g,u,p.x,p.y)&&crossBarrier(g,u,p))result.push({...p,path:[p]});}
      return result;
    }
    const dirs=s.move==='ortho'?ORTH:s.move==='diag'?DIAG:KING;
    for(const [dx,dy] of dirs) {
      const path=[];
      for(let k=1;k<=s.range;k++) {
        const p={x:u.x+dx*k,y:u.y+dy*k},prev=k===1?u:path[path.length-1];
        if(!empty(g,u,p.x,p.y))break;
        if(dx&&dy&&(!terrain(g,u,prev.x+dx,prev.y)||!terrain(g,u,prev.x,prev.y+dy)))break;
        path.push(p);result.push({...p,path:path.map(copy)});
      }
    }
    return result;
  }
  function facingTo(u,p) {const dx=p.x-u.x,dy=p.y-u.y;return Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?2:0);}
  function rotate(dx,dy,f){for(let i=0;i<f;i++)[dx,dy]=[-dy,dx];return [dx,dy];}
  function attackCells(g,u,facing=u.facing) {
    const family=ROSTER[u.type].family;
    const offsets=family==='SF'?[[-1,0],[1,0],[-1,-1],[1,-1]]:family==='NF'?[[-1,-1],[-2,-2],[1,-1],[2,-2]]:family==='ST'?ORTH:[[0,-1],[0,-2],[0,-3]];
    return offsets.map(([x,y])=>rotate(x,y,facing)).map(([x,y])=>({x:u.x+x,y:u.y+y})).filter(p=>inBoard(p.x,p.y)&&sight(g,u,p,true));
  }
  const cost=(u,mode)=>mode==='skill'?(u.type==='ENTP'&&u.cheapSwap?1:2):1;
  function available(g,u){return u&&u.hp>0&&u.team===g.team&&u.orders<2&&g.winner===null;}
  function preview(g,id,mode,x,y) {
    const u=g.units.find(u=>u.id===id),p={x,y},no=reason=>({ok:false,reason,cells:[],path:[]});
    if(!available(g,u))return no('Ce personnage a déjà reçu deux ordres, ou ce n’est pas son tour.');
    const price=cost(u,mode);
    if(g.ap<price)return no('Il manque des actions pour cet ordre.');
    if(!inBoard(x,y))return no('Choisis une case du plateau.');
    let result={ok:true,id,mode,x,y,cost:price,cells:[],path:[],label:''};
    if(mode==='move') {
      const m=moves(g,u).find(q=>same(p,q));
      if(!m)return no(u.rootUntil>=g.turn?'Immobilisé pour ce tour.':'Cette case n’est pas accessible avec ce déplacement.');
      return {...result,path:m.path,cells:[p],label:'Déplacer '+u.type};
    }
    if(mode==='attack') {
      if(same(u,p))return no('Choisis une direction de frappe.');
      const facing=facingTo(u,p),cells=attackCells(g,u,facing);
      if(!cells.some(q=>at(g,q.x,q.y)?.team===1-u.team||gateAt(g,q.x,q.y)?.team===1-u.team))return no('Aucun ennemi dans ce champ d’attaque.');
      return {...result,facing,cells,label:'Frappe de '+u.type};
    }
    if(mode!=='skill')return no('Ordre inconnu.');
    if(u.ready>g.turn)return no('Cette capacité sera prête au prochain tour allié.');
    const s=ROSTER[u.type],target=at(g,x,y),gate=gateAt(g,x,y),reach=r=>dist(u,p)<=r&&sight(g,u,p),enemy=target?.team===1-u.team;
    result.label=s.name;result.skill=s.skill;
    switch(s.skill) {
      case 'mur': {
        if(!reach(4)||y<4||y>11)return no('Choisis une case centrale à quatre cases maximum.');
        const f=facingTo(u,p),dirs=f%2?[[0,-1],[0,0],[0,1]]:[[-1,0],[0,0],[1,0]];
        result.cells=dirs.map(([dx,dy])=>({x:x+dx,y:y+dy})).filter(q=>empty(g,u,q.x,q.y)&&q.y>=4&&q.y<=11&&!g.walls.some(w=>same(w,q)));
        if(!result.cells.length)return no('Pas de place pour le mur.');break;
      }
      case 'precision': if(!reach(4)||(!enemy&&gate?.team!==1-u.team))return no('Choisis un ennemi ou une porte à quatre cases maximum.');result.cells=[p];break;
      case 'command': case 'shield': {
        if(!reach(3))return no('Choisis une case à trois cases maximum.');
        result.cells=[p,...cellsAround(p,s.skill==='shield'?ORTH:KING)];
        if(!result.cells.some(q=>at(g,q.x,q.y)?.team===u.team))return no('Place cette zone sur un allié.');break;
      }
      case 'swap': case 'rescue': {
        if(!reach(s.skill==='swap'?3:3)||!target||target.id===id||target.team!==(s.skill==='swap'?1-u.team:u.team))return no(s.skill==='swap'?'Choisis un ennemi à trois cases maximum.':'Choisis un allié à trois cases maximum.');
        if(u.rootUntil>=g.turn||u.anchorUntil>=g.turn||target.anchorUntil>=g.turn||target.rootUntil>=g.turn||!crossBarrier(g,u,target)||!crossBarrier(g,target,u))return no('Cet échange est bloqué par une défense ou une immobilisation.');
        result.cells=[copy(u),p];result.target=target.id;break;
      }
      case 'dance': case 'retreat': {
        const m=moves(g,u).find(q=>same(p,q));
        if(!m||(s.skill==='dance'&&dist(u,p)!==1))return no(s.skill==='dance'?'Choisis une case libre voisine.':'Choisis une case accessible en diagonale.');
        result.path=m.path;
        result.cells=s.skill==='dance'?cellsAround(p,KING).filter(q=>sight(g,{...u,...p},q)):attackCells(g,u,u.facing);break;
      }
      case 'bounce': if(!enemy||!reach(4))return no('Choisis un ennemi à quatre cases maximum.');result.cells=[p];result.target=target.id;break;
      case 'echo': if(!reach(3))return no('Choisis un centre à trois cases maximum.');result.cells=cellsAround(p,KING).filter(q=>sight(g,u,q));break;
      case 'pull': case 'root': if(!enemy||!reach(4))return no('Choisis un ennemi à quatre cases maximum.');result.cells=[p];result.target=target.id;break;
      case 'charge': {
        if(u.rootUntil>=g.turn||u.anchorUntil>=g.turn)return no('Immobilisé pour ce tour.');
        if((x!==u.x&&y!==u.y)||same(u,p)||dist(u,p)>3)return no('Choisis une case en ligne droite, à trois cases maximum.');
        for(const q of line(u,p)) {const hit=at(g,q.x,q.y)||gateAt(g,q.x,q.y);if(hit){if(hit.team!==u.team)result.cells=[q];break;}if(!terrain(g,u,q.x,q.y))break;result.path.push(q);}
        if(!result.path.length&&!result.cells.length)return no('La charge est bloquée.');break;
      }
      case 'ricochet': {
        if((x!==u.x&&y!==u.y)||same(u,p)||!reach(4))return no('Vise en ligne droite à quatre cases maximum.');
        const first=line(u,p).find(q=>at(g,q.x,q.y)||gateAt(g,q.x,q.y));
        if(!first||(at(g,first.x,first.y)||gateAt(g,first.x,first.y)).team===u.team)return no('Le premier impact doit toucher un ennemi.');
        result.cells=[first];const dirs=x===u.x?[[-1,0],[1,0]]:[[0,-1],[0,1]];
        for(const [dx,dy]of dirs)for(let k=1;k<=3;k++){const q={x:first.x+dx*k,y:first.y+dy*k};if(!inBoard(q.x,q.y)||!sight(g,{...u,...first},q,true))break;result.cells.push(q);if(at(g,q.x,q.y)||gateAt(g,q.x,q.y))break;}break;
      }
      case 'watch': if(!reach(3))return no('Choisis une case à trois cases maximum.');result.cells=[p,...cellsAround(p,ORTH)].filter(q=>terrain(g,u,q.x,q.y));break;
      case 'anchor': if(!same(u,p))return no('Confirme sur la case de ce personnage.');result.cells=[p];break;
    }
    return result;
  }
  function damage(g,target,n,ignore=false) {
    if(!target||target.hp<=0)return 0;
    if(!ignore&&target.shield){const absorbed=Math.min(target.shield,n);target.shield-=absorbed;n-=absorbed;}
    const actual=Math.min(n,target.hp);target.hp-=actual;
    if(actual)g.last.hits.push({x:target.x,y:target.y,n:actual,id:target.id});
    if(target.hp===0)addLog(g,target.type?target.type+' '+(target.team?'adverse':'allié')+' hors combat.':'Une porte est ouverte.');
    return actual;
  }
  function hitCells(g,u,cells,n,ignore=false) {
    const hit=[];
    for(const p of cells) {
      const target=at(g,p.x,p.y)||gateAt(g,p.x,p.y);
      if(target&&target.team!==u.team&&!hit.includes(target)){damage(g,target,n,ignore);hit.push(target);}
    }
    return hit;
  }
  function shield(g,u,n){u.shield=Math.max(u.shield,n);u.shieldUntil=g.turn+2;}
  function intercept(g,u){
    const zone=g.zones.find(z=>z.kind==='watch'&&z.team!==u.team&&!z.used&&z.cells.some(q=>same(q,u)));
    if(!zone)return false;
    zone.used=true;damage(g,u,2);return true;
  }
  function push(g,u,dx,dy,steps=1) {
    if(!u||u.hp<=0||u.anchorUntil>=g.turn)return;
    for(let i=0;i<steps;i++){const p={x:u.x+dx,y:u.y+dy};if(!empty(g,u,p.x,p.y))break;u.x=p.x;u.y=p.y;if(intercept(g,u))break;}
  }
  function checkWinner(g) {
    const breach=team=>g.units.some(u=>u.hp>0&&u.team===team&&u.y===(team?15:0));
    if(breach(0)&&breach(1))g.winner='draw';else if(breach(0)||!g.units.some(u=>u.team===1&&u.hp>0))g.winner=0;else if(breach(1)||!g.units.some(u=>u.team===0&&u.hp>0))g.winner=1;
  }
  function walk(g,u,path) {
    const old=copy(u);
    for(const p of path) {
      if(!empty(g,u,p.x,p.y))break;
      u.facing=facingTo(u,p);u.x=p.x;u.y=p.y;
      if(intercept(g,u))break;
    }
    if(same(old,u))return;
    u.moves++;
    if(u.moves%2===0){
      if(u.type==='ESFP')for(const p of cellsAround(u,KING)){const v=at(g,p.x,p.y);if(v?.team===1-u.team)push(g,v,Math.sign(v.x-u.x),Math.sign(v.y-u.y));}
      if(u.type==='ISFP')u.buff=Math.max(u.buff,1);
      if(u.type==='ESTP')shield(g,u,2);
    }
  }
  function apply(g,id,mode,x,y) {
    const p=preview(g,id,mode,x,y);if(!p.ok)return p;
    const u=g.units.find(u=>u.id===id),s=ROSTER[u.type];
    g.last={id,mode,label:p.label,cells:p.cells,path:p.path,hits:[],team:g.team};
    g.ap-=p.cost;u.orders++;
    if(mode==='move')walk(g,u,p.path);
    else if(mode==='attack') {
      u.facing=p.facing;u.attacks++;
      const bonus=u.buff;u.buff=0;
      const hit=hitCells(g,u,p.cells,2+bonus);
      if(u.attacks%2===0) {
        if(u.type==='INTP'&&hit[0]?.hp>0)damage(g,hit[0],1);
        if(u.type==='ISTP')for(const v of hit)if(!v.type&&v.hp>0)damage(g,v,1);
        if(u.type==='ENFP'&&hit.length){const v=g.units.find(v=>v.hp>0&&v.team!==u.team&&!hit.includes(v)&&dist(v,hit[0])<=2&&sight(g,u,v));if(v)damage(g,v,1);}
        if(u.type==='INFP')g.zones.push({kind:'echo',team:u.team,cells:p.cells.map(copy),due:g.turn+2,damage:1,type:u.type});
        if(u.type==='ENTP')u.cheapSwap=true;
      }
    } else {
      u.ready=g.turn+4;
      const target=g.units.find(v=>v.id===p.target);
      switch(s.skill) {
        case 'mur':g.walls.push(...p.cells.map(q=>({...q,team:u.team,due:g.turn+2})));break;
        case 'precision':hitCells(g,u,p.cells,3,true);break;
        case 'command':for(const q of p.cells){const v=at(g,q.x,q.y);if(v?.team===u.team){v.buff=Math.max(v.buff,1);v.buffUntil=g.turn+4;}}break;
        case 'shield':for(const q of p.cells){const v=at(g,q.x,q.y);if(v?.team===u.team)shield(g,v,2);}break;
        case 'swap':case 'rescue':{const old=copy(u);u.x=target.x;u.y=target.y;target.x=old.x;target.y=old.y;if(s.skill==='rescue')shield(g,target,2);else u.cheapSwap=false;intercept(g,u);intercept(g,target);break;}
        case 'dance':walk(g,u,p.path);if(u.hp>0)hitCells(g,u,cellsAround(u,KING).filter(q=>sight(g,u,q)),2);break;
        case 'retreat':hitCells(g,u,p.cells,2);walk(g,u,p.path);break;
        case 'bounce':{
          const hit=[target];damage(g,target,2);let from=target;
          for(let i=0;i<2;i++){const v=g.units.filter(v=>v.hp>0&&v.team!==u.team&&!hit.includes(v)&&dist(v,from)<=2&&sight(g,{...u,x:from.x,y:from.y},v)).sort((a,b)=>dist(a,from)-dist(b,from))[0];if(!v)break;damage(g,v,1);hit.push(v);from=v;}break;
        }
        case 'echo':g.zones.push({kind:'echo',team:u.team,cells:p.cells.map(copy),due:g.turn+2,damage:2,type:u.type});break;
        case 'pull':damage(g,target,1);for(let i=0;i<2;i++)push(g,target,Math.sign(u.x-target.x),Math.sign(u.y-target.y));break;
        case 'root':damage(g,target,1);target.rootUntil=g.turn+1;break;
        case 'charge':walk(g,u,p.path);if(u.hp>0){const hits=hitCells(g,u,p.cells.filter(q=>dist(u,q)<=1),2);for(const v of hits)if(v.type)push(g,v,Math.sign(v.x-u.x),Math.sign(v.y-u.y));}break;
        case 'ricochet':p.cells.forEach((q,i)=>hitCells(g,u,[q],i?1:2));break;
        case 'watch':g.zones.push({kind:'watch',team:u.team,cells:p.cells.map(copy),due:g.turn+2,damage:2,type:u.type});break;
        case 'anchor':shield(g,u,3);u.anchorUntil=g.turn+1;break;
      }
    }
    addLog(g,(u.team?'IA : ':'Toi : ')+u.type+' — '+p.label+'.');checkWinner(g);return p;
  }
  function endTurn(g) {
    if(g.winner!==null)return;
    g.turn++;g.team=1-g.team;g.ap=3;
    g.last={hits:[],cells:[],path:[],label:'Début du tour',team:g.team};
    for(const u of g.units)if(u.team===g.team){u.orders=0;if(u.shieldUntil<=g.turn)u.shield=0;if(u.buffUntil>=0&&u.buffUntil<=g.turn)u.buff=0;}
    g.walls=g.walls.filter(w=>w.due>g.turn);
    for(const z of g.zones)if(z.due<=g.turn&&z.kind==='echo')hitCells(g,{team:z.team},z.cells,z.damage);
    g.zones=g.zones.filter(z=>z.due>g.turn&&!z.used);checkWinner(g);
  }
  function candidates(g,u) {
    const out=[];
    if(!available(g,u))return out;
    if(g.ap>=1){for(const m of moves(g,u))out.push({id:u.id,mode:'move',x:m.x,y:m.y});for(const [dx,dy]of ORTH){const p={x:u.x+dx,y:u.y+dy};if(preview(g,u.id,'attack',p.x,p.y).ok)out.push({id:u.id,mode:'attack',...p});}}
    if(g.ap>=cost(u,'skill')&&u.ready<=g.turn)for(let y=Math.max(0,u.y-4);y<=Math.min(15,u.y+4);y++)for(let x=Math.max(0,u.x-4);x<=Math.min(15,u.x+4);x++)if(preview(g,u.id,'skill',x,y).ok)out.push({id:u.id,mode:'skill',x,y});
    return out;
  }
  function chooseBot(g,random=Math.random) {
    let best=null,highest=-Infinity;
    const foes=g.units.filter(u=>u.hp>0&&u.team!==g.team);
    for(const u of g.units.filter(u=>u.team===g.team&&u.hp>0))for(const action of candidates(g,u)) {
      const p=preview(g,u.id,action.mode,action.x,action.y);let score=random()*.3;
      if(action.mode==='move') {
        const old=foes.length?Math.min(...foes.map(v=>dist(u,v))):10;
        const next=foes.length?Math.min(...foes.map(v=>dist(action,v))):10;
        const progress=(action.y-u.y)*(u.team?1:-1);
        score+=(old-next)*.85+progress*.22;
        const nearestGate=g.gates.filter(v=>v.team!==u.team&&v.hp>0).sort((a,b)=>dist(u,a)-dist(u,b))[0];
        if(nearestGate)score+=(dist(u,nearestGate)-dist(action,nearestGate))*(g.style==='siege'?.55:.18);
        const positioned={...u,x:action.x,y:action.y};
        let threats=0;for(let f=0;f<4;f++)threats=Math.max(threats,attackCells(g,positioned,f).filter(q=>at(g,q.x,q.y)?.team===1-u.team).length);
        score+=Math.min(2,threats)*.65;
        if(foes.some(v=>dist(action,v)<=1)&&u.hp<=2)score-=g.style==='prudent'?3:1;
        for(const z of g.zones)if(z.team!==u.team&&z.cells.some(q=>same(q,action)))score-=3;
        if(action.y===(u.team?15:0))score+=100;
      } else {
        let damageScore=0;
        for(const q of p.cells){const v=at(g,q.x,q.y)||gateAt(g,q.x,q.y);if(v&&v.team!==u.team)damageScore+=v.type?(v.hp<=2?5:2.6):(g.style==='siege'?4:2.8);}
        if(action.mode==='attack')score+=damageScore;
        else {
          const skill=ROSTER[u.type].skill;
          if(['precision','dance','retreat','bounce','pull','root','charge','ricochet'].includes(skill))score+=damageScore*.75+(skill==='precision'?.6:0);
          if(skill==='echo')score+=damageScore*.6;
          if(skill==='shield'||skill==='command')score+=p.cells.reduce((n,q)=>{const v=at(g,q.x,q.y);return n+(v?.team===u.team&&foes.some(f=>dist(v,f)<=3)?(skill==='shield'&&v.hp<=3?1.8:.6):0);},0);
          if(skill==='anchor')score+=u.hp<=4&&foes.some(v=>dist(u,v)<=2)?2.4:-2;
          if(skill==='watch')score+=p.cells.filter(q=>foes.some(v=>dist(q,v)<=1)).length*.5;
          if(skill==='mur')score+=u.hp<=3&&foes.some(v=>dist(u,v)<=3)?.8:-1;
          if(skill==='swap')score+=(action.y-u.y)*(u.team?1:-1)*.25-.5;
          if(skill==='rescue'){const v=at(g,action.x,action.y);score+=v&&v.hp<=2&&foes.some(f=>dist(v,f)<=2)?2:-1;}
          score-=.25;
        }
      }
      if(score>highest){best=action;highest=score;}
    }
    return best;
  }
  const API={N,ROSTER,ORTH,DIAG,KING,create,at,gateAt,terrain,moves,attackCells,preview,apply,endTurn,candidates,chooseBot,cost,roundNumber,checkWinner,dist};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
  root.EmpreinteTactics=API;
})(typeof globalThis!=='undefined'?globalThis:this);
