"use strict";
const $=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d');
const C=50,colors=['#4ECDFF','#FF5577'],names={SF:'Guerrier',NF:'Sorcier',ST:'Tank',NT:'Stratège'};
const roster={
 ESFP:{kind:'SF',hp:400,speed:3.1,reach:2,dash:3},ISFP:{kind:'SF',hp:420,speed:2.9,reach:2,dash:2.5},ESFJ:{kind:'SF',hp:440,speed:2.7,reach:2,dash:2.5},ISFJ:{kind:'SF',hp:460,speed:2.6,reach:2,dash:2},
 ENFP:{kind:'NF',hp:360,speed:2.8,reach:2,dash:2.5},INFP:{kind:'NF',hp:380,speed:2.6,reach:2,dash:2},ENFJ:{kind:'NF',hp:400,speed:2.6,reach:2,dash:2},INFJ:{kind:'NF',hp:380,speed:2.5,reach:2,dash:2},
 ESTP:{kind:'ST',hp:560,speed:2.5,reach:1,dash:2},ISTP:{kind:'ST',hp:580,speed:2.4,reach:1,dash:2},ESTJ:{kind:'ST',hp:600,speed:2.3,reach:1,dash:1.5},ISTJ:{kind:'ST',hp:640,speed:2.1,reach:1,dash:1.5}
};
const familyNames={SF:'Flancs proches',NF:'Diagonales × 2',ST:'Croix proche'};
for(const spec of Object.values(roster))spec.shape=familyNames[spec.kind];
// Offsets transcribed from the user's grey squares; the white circle is the owner.
const familyOffsets={SF:[[0,-1],[0,1],[1,-1],[1,1]],NF:[[1,-1],[2,-2],[1,1],[2,2]],ST:[[1,0],[-1,0],[0,-1],[0,1]]};
const orders={attack:'Attaquer une cible',stack:'Stacker les sbires',guard:'Protéger le NT',lane:'Tenir sa voie',gank:'Gank agressif'};
