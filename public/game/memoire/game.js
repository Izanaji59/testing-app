"use strict";
const $=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d');
const C=50,colors=['#4ECDFF','#FF5577'],names={SF:'Guerrier',NF:'Sorcier',ST:'Tank',NT:'Stratège'};
// PM (points de mouvement par tour) inversement lié à la portée du champ d'attaque :
// courte portée (ST) → très mobile ; longue portée (NF, NT) → reste en retrait.
const PM_BY_KIND={ST:5,SF:4,NF:3,NT:3};
const roster={
 ESFP:{kind:'SF',hp:400},ISFP:{kind:'SF',hp:420},ESFJ:{kind:'SF',hp:440},ISFJ:{kind:'SF',hp:460},
 ENFP:{kind:'NF',hp:360},INFP:{kind:'NF',hp:380},ENFJ:{kind:'NF',hp:400},INFJ:{kind:'NF',hp:380},
 ESTP:{kind:'ST',hp:560},ISTP:{kind:'ST',hp:580},ESTJ:{kind:'ST',hp:600},ISTJ:{kind:'ST',hp:640}
};
const familyNames={SF:'Flancs proches',NF:'Diagonales × 2',ST:'Croix proche'};
for(const spec of Object.values(roster))spec.shape=familyNames[spec.kind];
// Offsets transcribed from the user's grey squares; the white circle is the owner.
const familyOffsets={SF:[[0,-1],[0,1],[1,-1],[1,1]],NF:[[1,-1],[2,-2],[1,1],[2,2]],ST:[[1,0],[-1,0],[0,-1],[0,1]]};
const orders={attack:'Attaquer une cible',stack:'Stacker les sbires',guard:'Protéger le NT',lane:'Tenir sa voie',gank:'Gank agressif'};
