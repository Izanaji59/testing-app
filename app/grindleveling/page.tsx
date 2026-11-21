// Accueil public de Grindleveling : une seule promesse, « ta personnalité te fait progresser ».
// La page reprend les pièces de l'application (fenêtre du Système, emblèmes de rang, barre d'XP,
// portail de donjon) pour montrer le jeu tel qu'il est. Un joueur déjà connecté est envoyé vers /cmd.

import Link from 'next/link';
import type { CSSProperties } from 'react';
import a from '@/components/allflix/allflix.module.css';
import s from '@/components/grindleveling/landing.module.css';
import { GrindHeader, GrindFooter } from '@/components/grindleveling/GrindFrame';
import { SessionRedirect } from '@/components/grindleveling/SessionRedirect';
import { RankLadder } from '@/components/grindleveling/RankLadder';
import { HudPanel } from '@/components/hud/HudPanel';
import { RankEmblem } from '@/components/hud/RankEmblem';
import { XpBar } from '@/components/hud/XpBar';
import { DungeonGate } from '@/components/hud/DungeonGate';

const SIGNUP = '/login/?mode=inscription';
const DIM = '#3A4E68';

// Exemple de semaine pour les défis communs (illustration, pas de vraies données).
const WEEK = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const CHALLENGES = [
  { name: '100 pompes par jour', done: [1, 1, 0, 1, 1, 1, 0] },
  { name: 'Coucher avant 23 h 30', done: [1, 1, 1, 1, 0, 1, 1] },
];

function Quest({ name, freq, done }: { name: string; freq: string; done?: boolean }) {
  return <li className={done ? s.done : undefined}>
    <span className={s.box} aria-hidden="true" />
    <span className={s.questName}>{name}{done && <span className={s.srOnly}> (terminée)</span>}</span>
    <em>{freq}</em>
  </li>;
}

export default function GrindlevelingHome() {
  return <div className={`${a.app} ${a.grind} ${s.page}`}>
    <SessionRedirect />
    <GrindHeader current="accueil" />
    <main id="main-content">

      {/* ——— Accueil ——— */}
      <section className={s.hero} aria-labelledby="gl-title">
        <div className={`${s.wrap} ${s.heroGrid}`}>
          <div>
            <p className={s.kicker}>SYSTÈME DENSHIKU · VERSION BÊTA</p>
            <h1 id="gl-title">Ta personnalité <em>te fait progresser.</em></h1>
            <p className={s.lead}>Pars de ton type MBTI et de la personne que tu veux devenir. Grindleveling en fait des quêtes du quotidien : chaque quête terminée te donne de l’XP et te fait monter en rang.</p>
            <div className={s.actions}>
              <Link href={SIGNUP} className={s.primary}>CRÉER MON COMPTE</Link>
              <Link href="/login/" className={s.secondary}>J’AI DÉJÀ UN COMPTE</Link>
            </div>
            <ul className={s.facts}>
              <li><strong>16</strong>TYPES MBTI</li>
              <li><strong>6</strong>RANGS, DE E À S</li>
              <li><strong>0 €</strong>GRATUIT</li>
            </ul>
          </div>

          <HudPanel label="FENÊTRE DU SYSTÈME" glow={0.7} corner={16}>
            <div className={s.sheet}>
              <div className={s.sheetTop}>
                <RankEmblem letter="C" size={62} />
                <div>
                  <span className={s.sheetKicker}>RANG C · PRATIQUE SOLIDE</span>
                  <strong className={s.sheetTitle}>Éclaireur</strong>
                  <span className={s.sheetType}>INFJ · AVOCAT</span>
                </div>
              </div>
              <XpBar current={18400} max={30000} height={6} showLabel label="XP JUSQU’AU RANG B" />
              <div className={s.sheetSep} />
              <p className={s.sheetLabel}>DONJON · IDENTITÉ</p>
              <p className={s.identity}>« Je suis quelqu’un qui prend soin de son corps. »</p>
              <ul className={s.questList}>
                <Quest name="Marcher 8 000 pas" freq="CHAQUE JOUR" done />
                <Quest name="Préparer mes repas de la semaine" freq="UNE FOIS" done />
                <Quest name="Coucher avant 23 h 30" freq="CHAQUE JOUR" />
              </ul>
              <p className={s.sheetNote}>Exemple de fiche de joueur.</p>
            </div>
          </HudPanel>
        </div>
      </section>

      {/* ——— Comment ça marche ——— */}
      <section className={s.section} aria-labelledby="gl-how">
        <div className={s.wrap}>
          <div className={s.head}>
            <p className={s.kicker}>COMMENT ÇA MARCHE</p>
            <h2 id="gl-how">L’identité d’abord, les objectifs ensuite.</h2>
            <p>Les objectifs découlent de qui tu veux être. Le moyen compte plus que le résultat : une quête faite chaque jour vaut mieux qu’un grand plan jamais commencé.</p>
          </div>
          <ol className={s.flow}>
            <li>
              <span className={s.flowNum}><span>01</span></span>
              <h3>Crée un donjon</h3>
              <p>Un donjon part d’une phrase. Des modèles t’aident à démarrer : remise en forme, sommeil, routine du matin, lecture, concentration.</p>
              <div className={s.mini}><p className={s.miniIdentity}>« Je suis quelqu’un qui lit chaque soir. »</p></div>
            </li>
            <li>
              <span className={s.flowNum}><span>02</span></span>
              <h3>Remplis-le de quêtes</h3>
              <p>Une quête se fait une fois, ou chaque jour jusqu’à la fin de transmission du donjon. Le minuteur de concentration s’y rattache.</p>
              <div className={s.mini}>
                <div className={s.miniQuest}><span>Lire 20 pages</span><em>CHAQUE JOUR</em></div>
                <div className={s.miniQuest}><span>Finir mon roman en cours</span><em>UNE FOIS</em></div>
              </div>
            </li>
            <li>
              <span className={s.flowNum}><span>03</span></span>
              <h3>Monte en rang</h3>
              <p>Chaque quête terminée donne de l’expérience et fait grandir tes statistiques. Tu passes de E à S, avec un titre propre à ton type.</p>
              <div className={`${s.mini} ${s.miniRanks}`} aria-label="Rangs E, D, C, B, A et S">
                {['E', 'D', 'C', 'B', 'A', 'S'].map((l, i) => <RankEmblem key={l} letter={l} size={34} color={i < 3 ? undefined : DIM} glow={i < 3 ? 0.6 : 0} />)}
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* ——— Rangs par type ——— */}
      <section className={s.section} aria-labelledby="gl-ranks">
        <div className={s.wrap}>
          <div className={s.head}>
            <p className={s.kicker}>TON TYPE NOMME TES RANGS</p>
            <h2 id="gl-ranks">Seize types, seize façons de grandir.</h2>
            <p>Tout le monde monte de E à S, mais personne ne porte les mêmes titres. Choisis un type pour voir le chemin qui l’attend.</p>
          </div>
          <RankLadder />
        </div>
      </section>

      {/* ——— Communauté ——— */}
      <section className={s.section} aria-labelledby="gl-community">
        <div className={`${s.wrap} ${s.split}`}>
          <div>
            <div className={s.headTight}>
              <p className={s.kicker}>LA COMMUNAUTÉ</p>
              <h2 id="gl-community">Une communauté MBTI, pas un réseau de plus.</h2>
            </div>
            <ul className={s.features}>
              <li>
                <h3>Le tchat commun</h3>
                <p>Mentionne un joueur ou un personnage avec @, partage une quête ou un défi en un lien. Chacun choisit ce que son profil montre.</p>
                <Link href="/regles/" className={s.link}>LIRE LES RÈGLES →</Link>
              </li>
              <li>
                <h3>Les personnages</h3>
                <p>Vote le type MBTI et l’ennéagramme des personnages de films, séries et animés, et garde tes favoris sur ton profil.</p>
                <Link href="/personnages/" className={s.link}>VOIR LES PERSONNAGES →</Link>
              </li>
              <li>
                <h3>Les événements</h3>
                <p>Propose une rencontre, en ligne ou en vrai, et inscris-toi à celles des autres.</p>
                <Link href={SIGNUP} className={s.link}>REJOINDRE →</Link>
              </li>
            </ul>
          </div>

          <HudPanel label="SALLE COMMUNE · EXEMPLE" thin glow={0.4}>
            <div className={s.chat}>
              <div className={s.msg} style={{ '--c': '#5CFFB2' } as CSSProperties}>
                <span className={s.avatar} aria-hidden="true">M</span>
                <div><p className={s.msgHead}><strong>Mira</strong><span className={s.msgTag}>INFJ</span></p>
                  <p>Qui fait le défi « Coucher avant 23 h 30 » avec moi cette semaine ?</p></div>
              </div>
              <div className={s.msg} style={{ '--c': '#9B7CFF' } as CSSProperties}>
                <span className={s.avatar} aria-hidden="true">K</span>
                <div><p className={s.msgHead}><strong>Kaito</strong><span className={s.msgTag}>ENTP</span></p>
                  <p><span className={s.mention}>@Mira</span> je suis dedans. Je le partage ici :</p>
                  <div className={s.embed}><span>DÉFI COMMUN</span><strong>Coucher avant 23 h 30</strong><span>QUÊTE DU JOUR · REJOINDRE →</span></div></div>
              </div>
              <div className={s.msg} style={{ '--c': '#FFB23D' } as CSSProperties}>
                <span className={s.avatar} aria-hidden="true">S</span>
                <div><p className={s.msgHead}><strong>Sol</strong><span className={s.msgTag}>ISTP</span></p>
                  <p>Bien joué <span className={s.mention}>@Kaito</span>, rang C atteint.</p></div>
              </div>
            </div>
          </HudPanel>
        </div>
      </section>

      {/* ——— Défis communs ——— */}
      <section className={s.section} aria-labelledby="gl-challenges">
        <div className={`${s.wrap} ${s.split} ${s.splitReverse}`}>
          <div>
            <div className={s.headTight}>
              <p className={s.kicker} style={{ color: '#FFB23D' }}>LES DÉFIS COMMUNS</p>
              <h2 id="gl-challenges">À plusieurs, on tient plus longtemps.</h2>
              <p>Rejoins un défi partagé : il ajoute sa quête du jour à ton Commandement. Le classement ne montre que les pseudos et les jours réussis.</p>
            </div>
            <Link href={SIGNUP} className={s.secondary}>REJOINDRE UN DÉFI</Link>
          </div>

          <HudPanel label="DÉFIS · SEMAINE EN COURS" thin glow={0.3}>
            <div className={s.challenges}>
              {CHALLENGES.map(c => <div key={c.name} className={s.challenge}>
                <div className={s.challengeHead}><strong>{c.name}</strong><em>QUÊTE DU JOUR</em></div>
                <ol className={s.week} aria-label={`${c.done.filter(Boolean).length} jours réussis sur 7`}>
                  {WEEK.map((d, i) => <li key={i} className={c.done[i] ? s.dayDone : undefined} aria-hidden="true">{d}</li>)}
                </ol>
              </div>)}
              <p className={s.sheetNote}>Exemple de semaine.</p>
            </div>
          </HudPanel>
        </div>
      </section>

      {/* ——— Dernier appel ——— */}
      <section className={s.final} aria-labelledby="gl-final">
        <div className={s.wrap}>
          <div className={s.gate}><DungeonGate tier="HARD" intensity={0.8} width={150} height={190} /></div>
          <h2 id="gl-final">Deviens qui tu es, une quête après l’autre.</h2>
          <p>Gratuit, en version bêta.</p>
          <div className={s.actions}>
            <Link href={SIGNUP} className={s.primary}>CRÉER MON COMPTE</Link>
            <Link href="/login/" className={s.secondary}>ME CONNECTER</Link>
          </div>
        </div>
      </section>
    </main>
    <GrindFooter />
  </div>;
}
