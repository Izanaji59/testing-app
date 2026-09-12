'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SlumbywiseStyles, useSlumbywiseBody, WHATSAPP_ORDER_URL } from './SlumbywiseStyles';
import { SlumbywiseNav } from './SlumbywiseNav';
import { SlumbywiseFooter } from './SlumbywiseFooter';
import { BracketCorners } from '@/components/hud/BracketCorners';

const MESSAGES: Record<string, string[]> = {
  deep_night: [
    "Tu es en pleine veille. Bienvenue.",
    "L'heure du carnet, de la ronde, du silence.",
    "L'heure de bascule est passée. Tu es dans ta vraie fenêtre.",
  ],
  dawn: [
    "Fin de service, ou début de journée. Selon lequel des deux tu es.",
    "L'heure grise. Les veilleurs rentrent, les matinaux se lèvent.",
  ],
  morning: [
    "Si tu as veillé cette nuit, tu vas bientôt dormir. Bonne nuit.",
    "L'heure du sas de sortie. Rideaux tirés, température basse.",
  ],
  afternoon: [
    "Tu prépares peut-être ta prochaine nuit.",
    "L'heure creuse. Bonne pour la sieste réglée.",
    "Le monde diurne est en pleine course. Toi, tu reprends des forces.",
  ],
  evening: [
    "Le sas de bascule s'approche.",
    "L'heure où le veilleur s'installe. Repas, lumière chaude, préparation.",
    "Bientôt la nuit. La vraie.",
  ],
  late_evening: [
    "L'heure où beaucoup commencent. Bienvenue.",
    "Poste de nuit dans quelques instants. Bonne veille.",
    "Les diurnes s'endorment. Ton monde s'éveille.",
  ],
};

function poolFor(hour: number): string[] {
  if (hour < 5) return MESSAGES.deep_night;
  if (hour < 8) return MESSAGES.dawn;
  if (hour < 12) return MESSAGES.morning;
  if (hour < 17) return MESSAGES.afternoon;
  if (hour < 21) return MESSAGES.evening;
  return MESSAGES.late_evening;
}

export function SlumbywiseLanding() {
  const [clock, setClock] = useState('--:--');
  const [message, setMessage] = useState("— chargement de l'heure —");

  useSlumbywiseBody();

  useEffect(() => {
    function tick() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setClock(`${h}:${m}`);

      const pool = poolFor(now.getHours());
      const stableIndex = Math.floor(now.getMinutes() / 20) % pool.length;
      setMessage(`— ${pool[stableIndex]}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const [h, m] = clock.split(':');

  return (
    <>
      <SlumbywiseStyles />

      <div className="sw-root">
        <SlumbywiseNav />

        <section className="sw-hero">
          <div className="sw-time-block">
            <BracketCorners size={8} color="var(--gl-cyan)" thickness={1} opacity={0.6} inset={-8} />
            <span className="sw-time-label">Il est actuellement</span>
            <span className="sw-time-clock">{h}<span className="sw-time-blink">:</span>{m}</span>
          </div>
          <div className="sw-hero-message">{message}</div>
          <h1 className="sw-hero-headline">
            Le sommeil n&apos;est pas un luxe. <em>C&apos;est ton terrain de jeu.</em>
          </h1>
          <p className="sw-hero-sub">
            Le livre, le carnet, la lettre. Une bibliothèque associative pour apprendre à dompter ta nuit — que tu sois travailleur posté, soignant, boulanger, insomniaque ou créatif noctambule. Portée par l&apos;association Denshiku, entièrement au bénéfice de l&apos;éducation des enfants orphelins.
          </p>
          <div className="sw-hero-actions">
            <a href={WHATSAPP_ORDER_URL} target="_blank" rel="noopener noreferrer" className="sw-btn-primary">Découvrir le livre</a>
            <Link href="/carnet" className="sw-btn-ghost">Lire le carnet</Link>
          </div>
        </section>

        <section className="sw-book" id="livre">
          <div className="sw-section-inner sw-book-inner">
            <img
              src="/images/slumbywise/carnet-du-concierge-cover.jpg"
              alt="Couverture du Carnet du Concierge — photo thermique d'une piscine, Denshiku"
              className="sw-book-cover"
            />
            <div className="sw-book-content">
              <div className="sw-eyebrow">Le livre</div>
              <h2 className="sw-section-title">Le carnet d&apos;un homme <em>immobile</em>, écrit pour ceux qui veillent debout.</h2>
              <blockquote className="sw-book-quote">
                « Ce que j&apos;avais appris en marchant, je l&apos;ai compris en restant immobile. »
              </blockquote>
              <div className="sw-book-desc">
                <p>Élias Morel a dirigé pendant vingt-six ans la piscine Ronsard. Un accident vasculaire cérébral l&apos;a laissé en fauteuil. La municipalité lui a offert de rester, comme concierge de nuit, de 22h à 6h.</p>
                <p>C&apos;est dans ces nuits qu&apos;il a rédigé ce carnet — quarante-trois lectiones ancrées dans la chronobiologie, la neurologie, la philosophie et l&apos;histoire longue de la nuit humaine. Pour ceux qui subissent la nuit et voudraient l&apos;habiter. Pour ceux qui l&apos;habitent seuls et voudraient la partager.</p>
              </div>
              <div className="sw-book-meta">
                <div className="sw-meta-item">
                  <span className="sw-meta-label">Lectiones</span>
                  <span className="sw-meta-value"><em>43</em></span>
                </div>
                <div className="sw-meta-item">
                  <span className="sw-meta-label">Pages</span>
                  <span className="sw-meta-value">≈ 200</span>
                </div>
                <div className="sw-meta-item">
                  <span className="sw-meta-label">Mouvements</span>
                  <span className="sw-meta-value">III</span>
                </div>
              </div>
              <div className="sw-book-buy">
                <div className="sw-book-price">
                  <span className="sw-price-amount">19</span>
                  <span className="sw-price-currency">EUR</span>
                </div>
                <a href={WHATSAPP_ORDER_URL} target="_blank" rel="noopener noreferrer" className="sw-btn-primary">Commander l&apos;exemplaire</a>
              </div>
            </div>
          </div>
        </section>

        <section className="sw-promise">
          <div className="sw-section-inner sw-promise-inner">
            <div>
              <div className="sw-eyebrow">La promesse</div>
              <h2 className="sw-section-title">La nuit protège <em>la nuit.</em></h2>
              <p className="sw-book-desc">Slumbywise est un projet associatif porté par Denshiku. Chaque exemplaire vendu, chaque don reçu, chaque abonnement finance directement l&apos;accès à l&apos;éducation d&apos;un enfant orphelin — parce que les enfants qui ont un toit, un savoir, une place, dorment mieux la nuit.</p>
              <p className="sw-book-desc" style={{ color: 'var(--pool-teal)', fontStyle: 'italic', fontFamily: "'Instrument Serif', serif", fontSize: 20, marginTop: 24 }}>Le veilleur qui achète ce livre reçoit un guide pour mieux vivre sa nuit. Ce qu&apos;il paie finance un enfant orphelin qui, lui, dort mieux parce qu&apos;il a une place dans le monde.</p>
            </div>
            <div className="sw-promise-flow">
              <div className="sw-flow-step">
                <div className="sw-flow-num">01</div>
                <div className="sw-flow-text">Le lecteur achète, s&apos;abonne ou fait un don.</div>
              </div>
              <div className="sw-flow-step">
                <div className="sw-flow-num">02</div>
                <div className="sw-flow-text">100 % des recettes reviennent à l&apos;association <em>Denshiku</em>.</div>
              </div>
              <div className="sw-flow-step">
                <div className="sw-flow-num">03</div>
                <div className="sw-flow-text">L&apos;association finance la scolarité, la santé et l&apos;accompagnement d&apos;enfants orphelins.</div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── GRINDLEVELING ──────────────────────────────────────────── */}
        <section className="sw-book" id="grindleveling">
          <div className="sw-section-inner sw-promise-inner">
            <div>
              <div className="sw-eyebrow">Grindleveling</div>
              <h2 className="sw-section-title">Ta nuit a une valeur. <em>Fais-la monter de niveau.</em></h2>
              <p className="sw-book-desc">Ce que tu accomplis pendant que les autres dorment ne devrait pas disparaître avec le jour. Grindleveling transforme chaque tâche réelle en quête, chaque effort en statistique qui progresse, chaque euro gagné en preuve visible.</p>
              <p className="sw-book-desc" style={{ color: 'var(--pool-teal)', fontStyle: 'italic', fontFamily: "'Instrument Serif', serif", fontSize: 20, marginTop: 24 }}>Le veilleur qui doute de sa nuit peut enfin la voir progresser, palier après palier.</p>
              <Link href="/grindleveling" className="sw-btn-primary" style={{ marginTop: 8 }}>Entrer en jeu</Link>
            </div>
            <div className="sw-promise-flow">
              <div className="sw-flow-step">
                <div className="sw-flow-num">→</div>
                <div className="sw-flow-text">Quêtes, projets, rangs — ta <em>progression réelle</em>, mesurée.</div>
              </div>
              <div className="sw-flow-step">
                <div className="sw-flow-num">→</div>
                <div className="sw-flow-text">Un revenu suivi, une stat qui monte à chaque euro généré.</div>
              </div>
              <div className="sw-flow-step">
                <div className="sw-flow-num">→</div>
                <div className="sw-flow-text">Une salle d&apos;opérateurs pour ne plus veiller <em>seul</em>.</div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── CHESS ──────────────────────────────────────────────────── */}
        <section className="sw-promise" id="chess">
          <div className="sw-section-inner sw-promise-inner">
            <div>
              <div className="sw-eyebrow">Chess</div>
              <h2 className="sw-section-title">Une partie, <em>une vraie pause.</em></h2>
              <p className="sw-book-desc">Entre deux rondes, le temps d&apos;une partie d&apos;échecs — le silence du plateau remplace celui de l&apos;attente. Seul contre un bot, ou avec quelqu&apos;un qui veille comme toi, où qu&apos;il soit.</p>
              <p className="sw-book-desc" style={{ color: 'var(--pool-teal)', fontStyle: 'italic', fontFamily: "'Instrument Serif', serif", fontSize: 20, marginTop: 24 }}>Pas besoin d&apos;être deux au même endroit pour partager un moment. Juste un lien, et la nuit devient un peu moins longue.</p>
              <Link href="/chess" className="sw-btn-primary" style={{ marginTop: 8 }}>Jouer maintenant</Link>
            </div>
            <div className="sw-promise-flow">
              <div className="sw-flow-step">
                <div className="sw-flow-num">→</div>
                <div className="sw-flow-text">Aucune installation — une partie commence en <em>un clic</em>.</div>
              </div>
              <div className="sw-flow-step">
                <div className="sw-flow-num">→</div>
                <div className="sw-flow-text">Un lien à partager, et la partie se joue à deux, où que vous soyez.</div>
              </div>
              <div className="sw-flow-step">
                <div className="sw-flow-num">→</div>
                <div className="sw-flow-text">Seul ? Un bot t&apos;attend, à toute heure.</div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── EMPREINTE ──────────────────────────────────────────────── */}
        <section className="sw-book" id="empreinte">
          <div className="sw-section-inner sw-promise-inner">
            <div>
              <div className="sw-eyebrow">Empreinte</div>
              <h2 className="sw-section-title">Ta mémoire, <em>ton arme dans la nuit.</em></h2>
              <p className="sw-book-desc">Une arène tactique où chaque type MBTI incarne une classe de champion. Observe le plateau, mémorise les zones qui vont s&apos;embraser, place tes champions à ton rythme, puis traverse au bon moment.</p>
              <p className="sw-book-desc" style={{ color: 'var(--pool-teal)', fontStyle: 'italic', fontFamily: "'Instrument Serif', serif", fontSize: 20, marginTop: 24 }}>Aucun chrono pendant la préparation. Juste toi, ton plan, et ce que tu es capable de retenir.</p>
              <a href="/game/memoire/" className="sw-btn-primary" style={{ marginTop: 8 }}>Entrer dans l&apos;arène</a>
            </div>
            <div className="sw-promise-flow">
              <div className="sw-flow-step">
                <div className="sw-flow-num">→</div>
                <div className="sw-flow-text">Deux champions autonomes, un stratège <em>piloté par toi</em>.</div>
              </div>
              <div className="sw-flow-step">
                <div className="sw-flow-num">→</div>
                <div className="sw-flow-text">Deux empreintes cachées à retenir, avant qu&apos;elles n&apos;explosent.</div>
              </div>
              <div className="sw-flow-step">
                <div className="sw-flow-num">→</div>
                <div className="sw-flow-text">Vue du dessus ou plateau 3D — à toi de choisir.</div>
              </div>
            </div>
          </div>
        </section>

        <SlumbywiseFooter />
      </div>
    </>
  );
}
