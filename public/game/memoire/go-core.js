/* Empreinte / Go MBTI. Règles pures, utilisables dans le navigateur et les tests. */
(function(root){
  'use strict';
  const SIZE=9,EMPTY=-1,GOAL=5,CAP=6,MAX_MOVES=80;
  const POWERS={
    INTJ:{type:'INTJ',name:'Prévision',identity:'Vision',cost:2,description:'Pose une pierre et annonce une seconde intersection. Au début de ton prochain tour, une pierre y apparaît si cette pose est légale à ce moment-là.',instruction:'Choisis une première pose, puis l’intersection annoncée.',short:'Une pose maintenant, une seconde annoncée.'},
    INTP:{type:'INTP',name:'Déconstruction',identity:'Détail',cost:1,description:'Retire une de tes pierres pour ouvrir une liberté ou modifier la forme de tes groupes.',instruction:'Choisis une de tes pierres à retirer.',short:'Retire une de tes propres pierres.'},
    ENTJ:{type:'ENTJ',name:'Offensive',identity:'Commande',cost:4,description:'Pose deux pierres sur des intersections voisines horizontalement ou verticalement. Chaque pose doit être légale.',instruction:'Choisis deux intersections libres, directement voisines.',short:'Deux poses voisines dans le même coup.'},
    ENTP:{type:'ENTP',name:'Permutation',identity:'Divergence',cost:3,description:'Déplace une de tes pierres sur une intersection voisine libre, horizontalement ou verticalement.',instruction:'Choisis une de tes pierres, puis une intersection libre voisine.',short:'Déplace une pierre vers une voisine libre.'}
  };
  const valid=i=>Number.isInteger(i)&&i>=0&&i<SIZE*SIZE;
  const neighbors=i=>[i%SIZE?i-1:-1,i%SIZE<SIZE-1?i+1:-1,i>=SIZE?i-SIZE:-1,i<SIZE*(SIZE-1)?i+SIZE:-1].filter(valid);
  const key=board=>board.map(v=>v+1).join('');
  const coordinate=i=>String.fromCharCode(65+i%SIZE)+(SIZE-Math.floor(i/SIZE));
  function group(board,start){
    if(!valid(start)||board[start]===EMPTY)return {stones:[],liberties:[]};
    const team=board[start],stones=[],seen=new Set([start]),liberties=new Set(),queue=[start];
    for(let j=0;j<queue.length;j++){const p=queue[j];stones.push(p);for(const n of neighbors(p)){if(board[n]===EMPTY)liberties.add(n);else if(board[n]===team&&!seen.has(n)){seen.add(n);queue.push(n);}}}
    return {stones,liberties:[...liberties],team};
  }
  function groups(board){const seen=new Set(),result=[];for(let i=0;i<board.length;i++)if(board[i]!==EMPTY&&!seen.has(i)){const g=group(board,i);g.stones.forEach(p=>seen.add(p));result.push(g);}return result;}
  function placement(board,point,team){
    const no=reason=>({ok:false,reason});
    if(!valid(point))return no('Choisis une intersection du plateau.');
    if(board[point]!==EMPTY)return no('Cette intersection est occupée.');
    const next=board.slice(),captured=[],visited=new Set();next[point]=team;
    for(const n of neighbors(point))if(next[n]===1-team&&!visited.has(n)){const g=group(next,n);g.stones.forEach(p=>visited.add(p));if(g.liberties.length===0){for(const p of g.stones)next[p]=EMPTY;captured.push(...g.stones);}}
    if(!group(next,point).liberties.length)return no('Cette pierre n’aurait aucune liberté et ne capturerait rien.');
    return {ok:true,board:next,captured};
  }
  function shuffle(items,random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function create(options={}){
    const random=options.random||Math.random,deck=options.deck||['INTJ','ENTJ','ENTP'];
    if(deck.length!==3||new Set(deck).size!==3||deck.some(t=>!POWERS[t]))throw Error('Choisir trois pouvoirs distincts.');
    const board=Array(SIZE*SIZE).fill(EMPTY);
    // Une petite ouverture centrale rapproche le premier contact.
    if(options.opening!==false){board[30]=0;board[40]=0;board[31]=1;board[39]=1;}
    const enemyDeck=options.enemyDeck||shuffle(Object.keys(POWERS),random).slice(0,3);
    if(enemyDeck.length!==3||new Set(enemyDeck).size!==3||enemyDeck.some(t=>!POWERS[t]))throw Error('Équipe adverse invalide.');
    return {board,player:0,ply:0,captured:[0,0],energy:[0,0],decks:[[...deck],[...enemyDeck]],forecasts:[null,null],history:new Set([key(board)]),passes:0,winner:null,reason:null,log:[],last:null,style:options.style||['offensif','patient','mobile'][Math.floor(random()*3)]};
  }
  function preview(g,action,team=g.player){
    const no=reason=>({ok:false,reason});
    if(g.winner!==null)return no('La partie est terminée.');
    if(team!==g.player)return no('Attends ton tour.');
    if(!action||!['place','power','pass'].includes(action.kind))return no('Coup inconnu.');
    if(action.kind==='pass')return {ok:true,board:g.board.slice(),captured:[],placed:[],removed:[],keys:[],cost:0,action:{kind:'pass'}};
    const points=action.points||[],type=action.type,power=action.kind==='power'?POWERS[type]:null;
    if(action.kind==='power'&&(!power||!g.decks[team].includes(type)))return no('Ce pouvoir n’est pas dans ton équipe.');
    if(power&&g.energy[team]<power.cost)return no('Il manque '+(power.cost-g.energy[team])+' point'+(power.cost-g.energy[team]>1?'s':'')+' de réserve.');
    const count=action.kind==='place'||type==='INTP'?1:2;
    if(points.length!==count||points.some(i=>!valid(i)))return no(count===1?'Choisis une intersection.':'Choisis les deux intersections du pouvoir.');
    if(count===2&&points[0]===points[1])return no('Choisis deux intersections différentes.');
    let board=g.board.slice(),captured=[],placed=[],removed=[],forecast=null;const keys=[];
    function accept(result){if(!result.ok)return result.reason;const k=key(result.board);if(g.history.has(k)||keys.includes(k))return 'Ce coup répéterait une position déjà jouée.';board=result.board;captured.push(...result.captured);keys.push(k);return null;}
    if(action.kind==='place'){
      const error=accept(placement(board,points[0],team));if(error)return no(error);placed=[points[0]];
    } else if(type==='INTJ'){
      if(g.forecasts[team])return no('Une prévision est déjà en attente.');
      if(board[points[1]]!==EMPTY)return no('L’intersection annoncée doit être libre.');
      const error=accept(placement(board,points[0],team));if(error)return no(error);placed=[points[0]];forecast={point:points[1],team};
    } else if(type==='INTP'){
      if(board[points[0]]!==team)return no('Choisis une de tes propres pierres.');
      board[points[0]]=EMPTY;const k=key(board);if(g.history.has(k))return no('Ce retrait répéterait une position déjà jouée.');keys.push(k);removed=[points[0]];
    } else if(type==='ENTJ'){
      if(!neighbors(points[0]).includes(points[1]))return no('Les deux intersections doivent se toucher horizontalement ou verticalement.');
      if(points.some(p=>board[p]!==EMPTY))return no('Les deux intersections doivent être libres avant le coup.');
      for(const point of points){const error=accept(placement(board,point,team));if(error)return no(error);placed.push(point);}
    } else if(type==='ENTP'){
      if(board[points[0]]!==team)return no('Choisis d’abord une de tes pierres.');
      if(!neighbors(points[0]).includes(points[1]))return no('La destination doit être une intersection voisine.');
      if(board[points[1]]!==EMPTY)return no('La destination doit être libre.');
      board[points[0]]=EMPTY;const error=accept(placement(board,points[1],team));if(error)return no(error);removed=[points[0]];placed=[points[1]];
    }
    return {ok:true,board,captured,placed,removed,forecast,keys,cost:power?.cost||0,action:{...action,points:[...points]}};
  }
  function log(g,message){g.log.unshift(message);g.log=g.log.slice(0,12);}
  function area(board){
    const scores=[0,0],seen=new Set();
    for(let i=0;i<board.length;i++){
      if(board[i]!==EMPTY){scores[board[i]]++;continue;}
      if(seen.has(i))continue;
      const empty=[i],borders=new Set();seen.add(i);
      for(let j=0;j<empty.length;j++)for(const n of neighbors(empty[j])){if(board[n]===EMPTY&&!seen.has(n)){seen.add(n);empty.push(n);}else if(board[n]!==EMPTY)borders.add(board[n]);}
      if(borders.size===1)scores[[...borders][0]]+=empty.length;
    }
    return scores;
  }
  function finish(g,reason){const space=area(g.board),diff=g.captured[0]-g.captured[1]||space[0]-space[1];g.winner=diff===0?'draw':diff>0?0:1;g.reason=reason;g.space=space;}
  function captureWin(g){for(const team of [0,1])if(g.captured[team]>=GOAL){g.winner=team;g.reason='captures';return true;}return false;}
  function apply(g,action){
    const p=preview(g,action);if(!p.ok)return p;
    const team=g.player,who=team?'IA':'Toi';
    g.board=p.board;for(const k of p.keys)g.history.add(k);
    g.energy[team]=action.kind==='place'?Math.min(CAP,g.energy[team]+1):g.energy[team]-p.cost;
    g.captured[team]+=p.captured.length;g.passes=action.kind==='pass'?g.passes+1:0;g.ply++;
    g.last={team,action:p.action,captured:[...p.captured],placed:[...p.placed],removed:[...p.removed],resolved:[]};
    if(p.forecast)g.forecasts[team]=p.forecast;
    if(action.kind==='pass')log(g,who+' passe.');
    else log(g,who+' : '+(action.kind==='place'?'pose en '+coordinate(action.points[0]):action.type+' / '+POWERS[action.type].name)+(p.captured.length?' / '+p.captured.length+' capture'+(p.captured.length>1?'s':''):'')+'.');
    if(captureWin(g))return p;
    if(g.passes>=2){finish(g,'passes');return p;}
    if(g.ply>=MAX_MOVES){finish(g,'limite');return p;}
    g.player=1-team;
    const forecast=g.forecasts[g.player];
    if(forecast){
      g.forecasts[g.player]=null;
      const result=placement(g.board,forecast.point,g.player);
      if(result.ok&&!g.history.has(key(result.board))){
        g.board=result.board;g.history.add(key(g.board));g.captured[g.player]+=result.captured.length;g.passes=0;
        g.last.resolved.push({team:g.player,point:forecast.point,captured:result.captured});
        log(g,(g.player?'INTJ adverse':'Ton INTJ')+' : la prévision en '+coordinate(forecast.point)+' se réalise'+(result.captured.length?' / '+result.captured.length+' capture'+(result.captured.length>1?'s':''):'')+'.');captureWin(g);
      }else log(g,(g.player?'INTJ adverse':'Ton INTJ')+' : prévision en '+coordinate(forecast.point)+' bloquée.');
    }
    return p;
  }
  function situation(board,team){let danger=0,pressure=0;for(const g of groups(board)){if(g.liberties.length===1){if(g.team===team)danger+=g.stones.length;else pressure+=g.stones.length;}}return {danger,pressure};}
  function legalPlaces(g){const result=[];for(let i=0;i<g.board.length;i++)if(g.board[i]===EMPTY){const action={kind:'place',points:[i]},p=preview(g,action);if(p.ok)result.push({action,preview:p});}return result;}
  function rate(g,action,p,before){
    const team=g.player,after=situation(p.board,team);let score=p.captured.length*18+(before.danger-after.danger)*5+(after.pressure-before.pressure)*2;
    if(g.captured[team]+p.captured.length>=GOAL)score+=1000;
    score-=p.cost*.65;
    for(const point of p.placed){const ns=neighbors(point),own=ns.filter(i=>g.board[i]===team).length,foe=ns.filter(i=>g.board[i]===1-team).length;score+=foe*(g.style==='offensif'?1.15:.8)+Math.min(own,2)*.35;score-=Math.abs(point%SIZE-4)*.06+Math.abs(Math.floor(point/SIZE)-4)*.06;if(g.forecasts[1-team]?.point===point)score+=3.5;}
    if(action.type==='INTJ'){const f=p.forecast.point,result=placement(p.board,f,team);if(result.ok){score+=1.8+result.captured.length*3;score+=neighbors(f).filter(i=>p.board[i]===1-team).length*.4;}}
    if(action.type==='ENTP'&&g.style==='mobile')score+=.8;
    if(g.style==='patient')score-=after.danger*2;
    return score;
  }
  function chooseBot(g,random=Math.random){
    if(g.winner!==null)return null;
    const team=g.player,before=situation(g.board,team),ranked=legalPlaces(g).map(c=>({...c,score:rate(g,c.action,c.preview,before)})),all=[...ranked];
    const offer=action=>{const p=preview(g,action);if(p.ok)all.push({action,preview:p,score:rate(g,action,p,before)});};
    for(const type of g.decks[team])if(g.energy[team]>=POWERS[type].cost){
      if(type==='INTP')for(let i=0;i<g.board.length;i++)if(g.board[i]===team)offer({kind:'power',type,points:[i]});
      if(type==='ENTP')for(let i=0;i<g.board.length;i++)if(g.board[i]===team)for(const n of neighbors(i))if(g.board[n]===EMPTY)offer({kind:'power',type,points:[i,n]});
      if(type==='ENTJ')for(let i=0;i<g.board.length;i++)if(g.board[i]===EMPTY)for(const n of neighbors(i))if(g.board[n]===EMPTY)offer({kind:'power',type,points:[i,n]});
      if(type==='INTJ'){
        const first=[...ranked].sort((a,b)=>b.score-a.score).slice(0,7),seconds=[...ranked].sort((a,b)=>b.score-a.score).slice(0,12);
        for(const a of first)for(const b of seconds)if(a.action.points[0]!==b.action.points[0])offer({kind:'power',type,points:[a.action.points[0],b.action.points[0]]});
      }
    }
    if(!all.length)return {kind:'pass'};
    // Une réponse normale adverse est examinée sur les meilleures options.
    all.sort((a,b)=>b.score-a.score);const finalists=all.slice(0,6);
    for(const c of finalists){let worst=0;for(let i=0;i<c.preview.board.length;i++)if(c.preview.board[i]===EMPTY){const r=placement(c.preview.board,i,1-team);if(r.ok&&!g.history.has(key(r.board)))worst=Math.max(worst,r.captured.length);}c.score-=worst*4;if(g.captured[1-team]+worst>=GOAL)c.score-=100;c.score+=random()*.9;}
    finalists.sort((a,b)=>b.score-a.score);return finalists[0].action;
  }
  const API={SIZE,EMPTY,GOAL,CAP,MAX_MOVES,POWERS,neighbors,coordinate,key,group,groups,placement,create,preview,apply,area,legalPlaces,chooseBot};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;root.EmpreinteGo=API;
})(typeof globalThis!=='undefined'?globalThis:this);
