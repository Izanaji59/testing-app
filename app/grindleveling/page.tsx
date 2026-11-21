// Accueil public de Grindleveling : une seule promesse, « ta personnalité te fait progresser ».
// Un joueur déjà connecté est envoyé vers /cmd (SessionRedirect) ; le contenu reste dans le HTML statique.

import Link from 'next/link';
import a from '@/components/allflix/allflix.module.css';
import s from '@/components/grindleveling/landing.module.css';
import { GrindHeader, GrindFooter } from '@/components/grindleveling/GrindFrame';
import { SessionRedirect } from '@/components/grindleveling/SessionRedirect';

const SIGNUP = '/login/?mode=inscription';

export default function GrindlevelingHome() {
  return <div className={`${a.app} ${a.grind}`}>
    <SessionRedirect />
    <GrindHeader current="accueil" />
    <main id="main-content" className={s.main}>
      <section className={s.hero} aria-labelledby="gl-title">
        <div>
          <p className={s.eyebrow}>GRINDLEVELING · PAR DENSHIKU</p>
          <h1 id="gl-title">Ta personnalité <em>te fait progresser.</em></h1>
          <p className={s.lead}>Tu pars de qui tu es, ton type MBTI et la personne que tu veux devenir. Grindleveling transforme cette identité en quêtes du quotidien, et chaque quête terminée te fait monter de niveau.</p>
          <div className={s.actions}>
            <Link href={SIGNUP} className={s.primary}>CRÉER MON COMPTE</Link>
            <Link href="/login/" className={s.secondary}>J’AI DÉJÀ UN COMPTE</Link>
          </div>
        </div>
        <div className={s.sheet} aria-label="Exemple de fiche de joueur">
          <p className={s.sheetLabel}>DONJON · IDENTITÉ</p>
          <p className={s.identity}>« Je suis quelqu’un qui prend soin de son corps. »</p>
          <div className={s.quest}><span>Marcher 8 000 pas</span><span>CHAQUE JOUR</span></div>
          <div className={s.quest}><span>Préparer mes repas sains de la semaine</span><span>UNE FOIS</span></div>
          <div className={s.quest}><span>Coucher avant 23 h 30</span><span>CHAQUE JOUR</span></div>
          <div className={s.rank}><strong>RANG C</strong><span>INFJ · ÉCLAIREUR</span></div>
          <p className={s.sheetNote}>Exemple. Les titres de rang changent selon ton type MBTI.</p>
        </div>
      </section>

      <section className={s.section} aria-labelledby="gl-how">
        <div className={s.sectionHead}>
          <span className={s.kicker}>COMMENT ÇA MARCHE</span>
          <h2 id="gl-how">L’identité d’abord, les objectifs ensuite.</h2>
          <p>Les objectifs existent, mais ils découlent de qui tu veux être. Le moyen compte plus que le résultat : une quête faite chaque jour vaut mieux qu’un grand plan jamais commencé.</p>
        </div>
        <ol className={s.steps}>
          <li><h3>Crée un donjon</h3><p>Un donjon part d’une phrase : « Je suis quelqu’un qui… ». Des modèles t’aident à démarrer : remise en forme, sommeil, routine du matin, lecture, concentration.</p></li>
          <li><h3>Remplis-le de quêtes</h3><p>Une quête se fait une fois, ou chaque jour jusqu’à la fin de transmission du donjon. Le minuteur de concentration se rattache à une quête.</p></li>
          <li><h3>Monte en rang</h3><p>Chaque quête terminée donne de l’expérience et fait grandir tes statistiques. Les rangs vont de E à S, avec un titre propre à ton type MBTI.</p></li>
        </ol>
      </section>

      <section className={s.section} aria-labelledby="gl-community">
        <div className={s.sectionHead}>
          <span className={s.kicker}>LA COMMUNAUTÉ</span>
          <h2 id="gl-community">Une communauté MBTI, pas un réseau de plus.</h2>
          <p>Un tchat commun, des profils que chacun règle comme il veut, et des personnages de fiction à typer ensemble.</p>
        </div>
        <div className={s.cards}>
          <article className={s.card}><h3>Les personnages</h3><p>Vote le type MBTI et l’ennéagramme des personnages de films, séries et animés, donne tes arguments et garde tes favoris sur ton profil.</p><Link href="/personnages/">VOIR LES PERSONNAGES →</Link></article>
          <article className={s.card}><h3>Le tchat</h3><p>Une salle commune où tu mentionnes un joueur ou un personnage avec @, et où tu partages une quête ou un défi en un lien.</p><Link href="/regles/">LIRE LES RÈGLES →</Link></article>
          <article className={s.card}><h3>Les événements</h3><p>Propose une rencontre, en ligne ou en vrai, et inscris-toi à celles des autres. Tu es prévenu si un événement change.</p><Link href={SIGNUP}>REJOINDRE →</Link></article>
        </div>
      </section>

      <section className={s.section} aria-labelledby="gl-challenges">
        <div className={s.sectionHead}>
          <span className={s.kicker}>LES DÉFIS COMMUNS</span>
          <h2 id="gl-challenges">À plusieurs, on tient plus longtemps.</h2>
          <p>Rejoins un défi partagé : il ajoute sa quête du jour à ton Commandement, et le classement ne montre que les pseudos et les jours réussis.</p>
        </div>
        <ul className={s.challenges}>
          <li>100 pompes par jour</li>
          <li>Coucher avant 23 h 30</li>
        </ul>
      </section>

      <section className={s.section} aria-labelledby="gl-bonus">
        <div className={s.bonus}>
          <div><span className={s.kicker}>EN BONUS</span><h2 id="gl-bonus">Empreinte</h2><p>Un duel de capture sur un plateau 9 × 9, avec trois pouvoirs MBTI, contre une IA. Sans compte.</p></div>
          <a href="/game/memoire/" className={s.secondary}>JOUER À EMPREINTE</a>
        </div>
      </section>

      <section className={s.final} aria-labelledby="gl-final">
        <h2 id="gl-final">Deviens qui tu es, une quête après l’autre.</h2>
        <p>Gratuit, en version bêta.</p>
        <div className={s.actions}>
          <Link href={SIGNUP} className={s.primary}>CRÉER MON COMPTE</Link>
          <Link href="/login/" className={s.secondary}>ME CONNECTER</Link>
        </div>
      </section>
    </main>
    <GrindFooter />
  </div>;
}
