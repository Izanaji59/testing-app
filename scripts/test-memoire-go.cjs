const assert=require('node:assert/strict');
const G=require('../public/game/memoire/go-core.js');
const full=['INTJ','ENTJ','ENTP'];
const put=(g,team,positions)=>positions.forEach(i=>g.board[i]=team);
function fixture(black=[],white=[],deck=full){const g=G.create({opening:false,deck,enemyDeck:['INTP','ENTJ','ENTP']});put(g,0,black);put(g,1,white);g.history=new Set([G.key(g.board)]);return g;}
const snapshot=g=>JSON.stringify({...g,history:[...g.history]});
const place=(g,i)=>G.apply(g,{kind:'place',points:[i]});
let g=G.create();assert.equal(g.board.filter(x=>x===0).length,2);assert.equal(g.board.filter(x=>x===1).length,2);assert.equal(g.decks[0].length,3);
assert.deepEqual(G.neighbors(0),[1,9]);assert.deepEqual(G.neighbors(80),[79,71]);assert.equal(G.coordinate(0),'A9');
g=fixture([0,1,10]);assert.equal(G.group(g.board,0).stones.length,3);assert.equal(new Set(G.group(g.board,0).liberties).size,G.group(g.board,0).liberties.length);assert.equal(G.group(fixture([0,10]).board,0).stones.length,1);
g=fixture([1,9,11],[10]);assert.ok(place(g,19).ok);assert.equal(g.board[10],G.EMPTY);assert.equal(g.captured[0],1);assert.equal(g.energy[0],1);assert.equal(g.player,1);
g=fixture([1,2,9,12,19],[10,11]);assert.ok(place(g,20).ok);assert.equal(g.captured[0],2);
g=fixture([2,10,18],[1,9]);assert.ok(place(g,0).ok);assert.equal(g.captured[0],2,'Une capture qui ouvre des libertés est légale.');
g=fixture([],[1,9,11,19]);let before=snapshot(g);assert.equal(place(g,10).ok,false);assert.equal(snapshot(g),before);
g=fixture([1,9,11],[10,18,20,28]);assert.ok(place(g,19).ok);before=snapshot(g);assert.equal(place(g,10).ok,false,'Reprise de ko immédiate interdite');assert.equal(snapshot(g),before);
g=fixture();assert.equal(G.preview(g,{kind:'place',points:[0]},1).ok,false);assert.equal(place(g,81).ok,false);
// Les pouvoirs sont atomiques, payants et réservés au choix de trois du joueur.
g=fixture();g.energy[0]=4;assert.equal(G.preview(g,{kind:'power',type:'INTP',points:[0]}).ok,false);
g=fixture();before=snapshot(g);assert.equal(G.apply(g,{kind:'power',type:'ENTJ',points:[20,21]}).ok,false);assert.equal(snapshot(g),before);
g=fixture([],[11,19,29,22,12,30]);g.energy[0]=4;before=snapshot(g);assert.equal(G.apply(g,{kind:'power',type:'ENTJ',points:[20,21]}).ok,false);assert.equal(snapshot(g),before,'Un second placement illégal annule toute l’offensive.');
g=fixture([1,9,11],[10]);g.energy[0]=4;assert.ok(G.apply(g,{kind:'power',type:'ENTJ',points:[19,20]}).ok);assert.equal(g.board[19],0);assert.equal(g.board[20],0);assert.equal(g.captured[0],1);assert.equal(g.energy[0],0);
g=fixture();g.energy[0]=2;assert.ok(G.apply(g,{kind:'power',type:'INTJ',points:[40,41]}).ok);assert.equal(g.board[41],G.EMPTY);assert.equal(g.forecasts[0].point,41);assert.ok(place(g,0).ok);assert.equal(g.board[41],0);assert.equal(g.forecasts[0],null);assert.equal(g.energy[0],0,'La prévision ne génère pas de réserve.');
g=fixture();g.energy[0]=2;G.apply(g,{kind:'power',type:'INTJ',points:[40,41]});assert.ok(place(g,41).ok);assert.equal(g.board[41],1);assert.equal(g.forecasts[0],null);assert.ok(g.log[0].includes('bloquée'));
g=fixture([1,9,11],[10]);g.forecasts[0]={point:19,team:0};g.player=1;g.captured[0]=4;place(g,80);assert.equal(g.winner,0,'Une prévision peut gagner avant le coup manuel.');assert.equal(g.captured[0],5);
g=fixture([40,41],[],['INTP','ENTJ','ENTP']);g.energy[0]=1;assert.ok(G.apply(g,{kind:'power',type:'INTP',points:[40]}).ok);assert.equal(g.board[40],G.EMPTY);assert.equal(g.energy[0],0);assert.deepEqual(g.captured,[0,0]);
g=fixture([40,41],[],['INTP','ENTJ','ENTP']);const earlier=g.board.slice();earlier[40]=G.EMPTY;g.history.add(G.key(earlier));g.energy[0]=1;before=snapshot(g);assert.equal(G.apply(g,{kind:'power',type:'INTP',points:[40]}).ok,false);assert.equal(snapshot(g),before);
g=fixture([40]);g.energy[0]=3;assert.ok(G.apply(g,{kind:'power',type:'ENTP',points:[40,41]}).ok);assert.equal(g.board[40],G.EMPTY);assert.equal(g.board[41],0);assert.equal(g.energy[0],0);
g=fixture([40],[41]);g.energy[0]=3;assert.equal(G.apply(g,{kind:'power',type:'ENTP',points:[40,41]}).ok,false);
g=fixture([40]);g.energy[0]=3;assert.equal(G.apply(g,{kind:'power',type:'ENTP',points:[40,50]}).ok,false,'Pas de permutation diagonale');
g=fixture();g.energy[0]=6;assert.ok(place(g,40).ok);assert.equal(g.energy[0],6);G.apply(g,{kind:'pass'});assert.equal(g.energy[1],0);
g=fixture();G.apply(g,{kind:'pass'});G.apply(g,{kind:'pass'});assert.equal(g.winner,'draw');assert.equal(g.reason,'passes');assert.equal(place(g,0).ok,false);
g=fixture([0],[80]);g.captured=[2,1];g.ply=79;assert.ok(place(g,40).ok);assert.equal(g.winner,0);assert.equal(g.reason,'limite');
g=fixture([1,9,11],[10]);g.captured[0]=4;place(g,19);assert.equal(g.winner,0);assert.equal(g.reason,'captures');
assert.deepEqual(G.area(Array(81).fill(G.EMPTY)),[0,0]);assert.deepEqual(G.area(fixture([40]).board),[81,0]);
// Parties complètes : les deux camps utilisent le même moteur, sans mutation par l’aperçu.
let seed=97531;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);let actions=0,captures=0,powers=new Set(),maxMs=0;
for(let n=0;n<12;n++){
 g=G.create({random,deck:n%2?['INTP','ENTJ','ENTP']:full});
 while(g.winner===null){const now=Date.now(),old=snapshot(g),a=G.chooseBot(g,random);maxMs=Math.max(maxMs,Date.now()-now);assert.equal(snapshot(g),old,'L’analyse de l’IA ne modifie pas le jeu');assert.ok(a);const p=G.preview(g,a);assert.ok(p.ok,JSON.stringify(a));assert.equal(snapshot(g),old);assert.ok(G.apply(g,a).ok);if(a.type)powers.add(a.type);actions++;
  assert.ok(g.ply<=80);assert.ok(g.energy.every(v=>v>=0&&v<=6));assert.ok(g.board.every(v=>[-1,0,1].includes(v)));for(const gr of G.groups(g.board))assert.ok(gr.liberties.length>0,'Aucun groupe capturé ne reste sur le plateau');
 }
 if(g.reason==='captures')captures++;
}
assert.ok(captures>=6,'La majorité des parties doit finir par des captures.');
console.log(JSON.stringify({result:'Go rules OK',simulatedMatches:12,actions,endedByCapture:captures,powersUsed:[...powers],slowestBotMs:maxMs}));
