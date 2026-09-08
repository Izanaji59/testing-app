'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

  useEffect(() => {
    document.body.classList.add('slumbywise-body');
    return () => document.body.classList.remove('slumbywise-body');
  }, []);

  function handleNewsletterSubmit(e: React.FormEvent) {
    e.preventDefault();
    alert('Merci — dès que le site est en ligne, tu seras parmi les premiers avertis.');
  }

  const [h, m] = clock.split(':');

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --night-deep: #0b1220;
          --night-mid: #131c2e;
          --night-light: #1c2740;
          --warm-white: #f2e9d8;
          --warm-white-dim: #b8b0a2;
          --amber: #e8a54a;
          --amber-soft: #c88a3a;
          --pool-teal: #4a9b8e;
          --slate: #6b7a8c;
          --hairline: rgba(242, 233, 216, 0.08);
          --hairline-strong: rgba(242, 233, 216, 0.16);
        }

        body.slumbywise-body {
          background: var(--night-deep);
          color: var(--warm-white);
          font-family: 'Inter', -apple-system, sans-serif;
          font-weight: 300;
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        .sw-root {
          position: relative;
        }

        .sw-root::before {
          content: '';
          position: fixed;
          top: -20vh;
          right: -20vw;
          width: 80vw;
          height: 80vh;
          background: radial-gradient(circle at center, rgba(232, 165, 74, 0.12) 0%, rgba(232, 165, 74, 0.04) 30%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }

        .sw-root::after {
          content: '';
          position: fixed;
          bottom: -30vh;
          left: -20vw;
          width: 90vw;
          height: 90vh;
          background: radial-gradient(circle at center, rgba(74, 155, 142, 0.08) 0%, rgba(74, 155, 142, 0.02) 40%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .sw-root nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          padding: 22px 48px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          background: rgba(11, 18, 32, 0.7);
          border-bottom: 1px solid var(--hairline);
        }

        .sw-brand { display: flex; align-items: baseline; gap: 10px; }
        .sw-brand-mark { font-family: 'Instrument Serif', serif; font-size: 26px; font-weight: 400; letter-spacing: -0.02em; color: var(--warm-white); }
        .sw-brand-mark em { font-style: italic; color: var(--amber); }
        .sw-brand-by { font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--slate); }

        .sw-nav-links { display: flex; gap: 32px; align-items: center; }
        .sw-nav-links a { color: var(--warm-white-dim); text-decoration: none; font-size: 13px; letter-spacing: 0.02em; transition: color 0.2s; }
        .sw-nav-links a:hover { color: var(--amber); }
        .sw-nav-cta { padding: 9px 18px; border: 1px solid var(--hairline-strong); border-radius: 2px; color: var(--warm-white) !important; font-size: 12px !important; letter-spacing: 0.06em !important; text-transform: uppercase; transition: all 0.2s !important; }
        .sw-nav-cta:hover { background: var(--amber); color: var(--night-deep) !important; border-color: var(--amber); }

        .sw-hero { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; padding: 140px 48px 100px; max-width: 1400px; margin: 0 auto; position: relative; z-index: 1; }
        .sw-time-block { display: flex; align-items: baseline; gap: 24px; margin-bottom: 60px; opacity: 0; animation: sw-fade-up 1.2s ease 0.2s forwards; }
        .sw-time-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--slate); }
        .sw-time-clock { font-family: 'JetBrains Mono', monospace; font-size: 15px; color: var(--amber); letter-spacing: 0.04em; }
        .sw-time-blink { display: inline-block; animation: sw-blink 1s infinite; }
        @keyframes sw-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.3; } }

        .sw-hero-message { font-family: 'Instrument Serif', serif; font-size: 15px; font-style: italic; color: var(--pool-teal); margin-bottom: 12px; opacity: 0; animation: sw-fade-up 1.2s ease 0.4s forwards; }
        .sw-hero-headline { font-family: 'Instrument Serif', serif; font-size: clamp(48px, 8vw, 108px); font-weight: 400; line-height: 1.02; letter-spacing: -0.03em; margin-bottom: 48px; max-width: 1100px; opacity: 0; animation: sw-fade-up 1.2s ease 0.6s forwards; }
        .sw-hero-headline em { font-style: italic; color: var(--amber); }
        .sw-hero-sub { font-size: 18px; line-height: 1.6; color: var(--warm-white-dim); max-width: 560px; margin-bottom: 56px; opacity: 0; animation: sw-fade-up 1.2s ease 0.8s forwards; }
        .sw-hero-actions { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; opacity: 0; animation: sw-fade-up 1.2s ease 1s forwards; }

        .sw-btn-primary { display: inline-flex; align-items: center; gap: 12px; padding: 16px 30px; background: var(--amber); color: var(--night-deep); text-decoration: none; font-size: 14px; font-weight: 500; letter-spacing: 0.02em; border-radius: 2px; transition: all 0.25s; border: 1px solid var(--amber); }
        .sw-btn-primary:hover { background: transparent; color: var(--amber); }
        .sw-btn-primary::after { content: '→'; font-size: 16px; }
        .sw-btn-ghost { padding: 15px 24px; color: var(--warm-white); text-decoration: none; font-size: 14px; letter-spacing: 0.02em; border-bottom: 1px solid var(--hairline-strong); transition: border-color 0.25s, color 0.25s; }
        .sw-btn-ghost:hover { color: var(--amber); border-color: var(--amber); }

        @keyframes sw-fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .sw-root section { position: relative; z-index: 1; }
        .sw-section-inner { max-width: 1200px; margin: 0 auto; padding: 120px 48px; }
        .sw-eyebrow { display: flex; align-items: center; gap: 16px; font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.22em; color: var(--slate); margin-bottom: 32px; }
        .sw-eyebrow::before { content: ''; width: 40px; height: 1px; background: var(--slate); }
        .sw-section-title { font-family: 'Instrument Serif', serif; font-size: clamp(36px, 5vw, 60px); font-weight: 400; line-height: 1.1; letter-spacing: -0.02em; margin-bottom: 32px; max-width: 850px; }
        .sw-section-title em { font-style: italic; color: var(--amber); }

        .sw-book { border-top: 1px solid var(--hairline); }
        .sw-book-inner { display: grid; grid-template-columns: 5fr 6fr; gap: 80px; align-items: center; }
        .sw-book-cover { aspect-ratio: 2/3; background: linear-gradient(135deg, var(--night-mid) 0%, var(--night-light) 100%); border: 1px solid var(--hairline-strong); position: relative; padding: 50px 40px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px var(--hairline); transition: transform 0.4s; }
        .sw-book-cover:hover { transform: translateY(-4px) rotate(-0.5deg); }
        .sw-book-cover::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--amber), transparent); opacity: 0.5; }
        .sw-cover-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--pool-teal); }
        .sw-cover-title { font-family: 'Instrument Serif', serif; font-size: 40px; line-height: 1.05; color: var(--warm-white); letter-spacing: -0.02em; }
        .sw-cover-title em { font-style: italic; color: var(--amber); }
        .sw-cover-sub { font-family: 'Instrument Serif', serif; font-style: italic; font-size: 15px; color: var(--warm-white-dim); line-height: 1.4; }
        .sw-cover-author { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--slate); }
        .sw-book-content .sw-eyebrow { margin-bottom: 24px; }
        .sw-book-quote { font-family: 'Instrument Serif', serif; font-style: italic; font-size: 26px; line-height: 1.4; color: var(--warm-white); margin: 32px 0; padding-left: 24px; border-left: 2px solid var(--amber); }
        .sw-book-desc { font-size: 16px; line-height: 1.75; color: var(--warm-white-dim); margin-bottom: 40px; }
        .sw-book-desc p + p { margin-top: 18px; }
        .sw-book-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; padding: 28px 0; margin-bottom: 40px; border-top: 1px solid var(--hairline); border-bottom: 1px solid var(--hairline); }
        .sw-meta-item { display: flex; flex-direction: column; gap: 6px; }
        .sw-meta-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--slate); }
        .sw-meta-value { font-family: 'Instrument Serif', serif; font-size: 22px; color: var(--warm-white); }
        .sw-meta-value em { font-style: italic; color: var(--amber); }
        .sw-book-buy { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
        .sw-book-price { display: flex; align-items: baseline; gap: 8px; }
        .sw-price-amount { font-family: 'Instrument Serif', serif; font-size: 42px; color: var(--warm-white); }
        .sw-price-currency { font-family: 'JetBrains Mono', monospace; font-size: 14px; color: var(--slate); }

        .sw-promise { background: var(--night-mid); border-top: 1px solid var(--hairline); border-bottom: 1px solid var(--hairline); position: relative; overflow: hidden; }
        .sw-promise::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent 20%, var(--amber) 50%, transparent 80%); opacity: 0.4; }
        .sw-promise-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 100px; align-items: center; }
        .sw-promise-flow { display: flex; flex-direction: column; gap: 32px; }
        .sw-flow-step { display: grid; grid-template-columns: 60px 1fr; gap: 24px; align-items: start; padding: 24px 0; border-bottom: 1px solid var(--hairline); }
        .sw-flow-step:last-child { border-bottom: none; }
        .sw-flow-num { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--amber); padding-top: 4px; letter-spacing: 0.08em; }
        .sw-flow-text { font-family: 'Instrument Serif', serif; font-size: 22px; line-height: 1.4; color: var(--warm-white); }
        .sw-flow-text em { font-style: italic; color: var(--pool-teal); }

        .sw-blog { border-top: 1px solid var(--hairline); }
        .sw-blog-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 64px; flex-wrap: wrap; gap: 24px; }
        .sw-blog-title-block { max-width: 640px; }
        .sw-blog-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 48px; }
        .sw-blog-card { display: flex; flex-direction: column; padding: 40px 0; border-top: 1px solid var(--hairline-strong); cursor: pointer; transition: all 0.3s; position: relative; text-decoration: none; color: inherit; }
        .sw-blog-card:hover { border-top-color: var(--amber); }
        .sw-blog-meta { display: flex; gap: 20px; align-items: center; margin-bottom: 28px; font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--slate); }
        .sw-blog-meta .sw-num { color: var(--amber); }
        .sw-blog-cardtitle { font-family: 'Instrument Serif', serif; font-size: 28px; line-height: 1.2; color: var(--warm-white); margin-bottom: 20px; letter-spacing: -0.01em; transition: color 0.25s; }
        .sw-blog-card:hover .sw-blog-cardtitle { color: var(--amber); }
        .sw-blog-cardtitle em { font-style: italic; }
        .sw-blog-excerpt { font-size: 15px; line-height: 1.65; color: var(--warm-white-dim); margin-bottom: 28px; flex: 1; }
        .sw-blog-read { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--amber); display: flex; align-items: center; gap: 10px; }
        .sw-blog-read::after { content: '→'; transition: transform 0.25s; }
        .sw-blog-card:hover .sw-blog-read::after { transform: translateX(4px); }

        .sw-letter { border-top: 1px solid var(--hairline); position: relative; }
        .sw-letter-inner { max-width: 720px; margin: 0 auto; padding: 140px 48px; text-align: center; }
        .sw-letter-eyebrow { justify-content: center; }
        .sw-letter-eyebrow::before, .sw-letter-eyebrow::after { content: ''; width: 40px; height: 1px; background: var(--slate); }
        .sw-letter-title { font-family: 'Instrument Serif', serif; font-size: clamp(36px, 5vw, 54px); line-height: 1.15; margin-bottom: 24px; letter-spacing: -0.02em; }
        .sw-letter-title em { font-style: italic; color: var(--amber); }
        .sw-letter-desc { color: var(--warm-white-dim); font-size: 17px; line-height: 1.65; margin-bottom: 48px; max-width: 520px; margin-left: auto; margin-right: auto; }
        .sw-letter-form { display: flex; gap: 0; max-width: 480px; margin: 0 auto; border: 1px solid var(--hairline-strong); border-radius: 2px; overflow: hidden; transition: border-color 0.25s; }
        .sw-letter-form:focus-within { border-color: var(--amber); }
        .sw-letter-form input { flex: 1; padding: 18px 22px; background: transparent; border: none; color: var(--warm-white); font-family: 'Inter', sans-serif; font-size: 14px; outline: none; }
        .sw-letter-form input::placeholder { color: var(--slate); }
        .sw-letter-form button { padding: 0 28px; background: var(--amber); color: var(--night-deep); border: none; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; cursor: pointer; transition: background 0.2s; }
        .sw-letter-form button:hover { background: var(--amber-soft); }
        .sw-letter-note { margin-top: 20px; font-size: 12px; color: var(--slate); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.04em; }

        .sw-footer { background: var(--night-mid); border-top: 1px solid var(--hairline); padding: 80px 48px 40px; position: relative; z-index: 1; }
        .sw-footer-inner { max-width: 1200px; margin: 0 auto; }
        .sw-footer-top { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px; padding-bottom: 60px; border-bottom: 1px solid var(--hairline); margin-bottom: 40px; }
        .sw-footer-brand-block { max-width: 340px; }
        .sw-footer-brand { font-family: 'Instrument Serif', serif; font-size: 34px; margin-bottom: 8px; letter-spacing: -0.02em; }
        .sw-footer-brand em { font-style: italic; color: var(--amber); }
        .sw-footer-by { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--slate); margin-bottom: 22px; }
        .sw-footer-mission { font-size: 14px; line-height: 1.6; color: var(--warm-white-dim); }
        .sw-footer-mission em { font-style: italic; color: var(--pool-teal); }
        .sw-footer-col-title { font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--slate); margin-bottom: 20px; }
        .sw-footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 12px; padding: 0; margin: 0; }
        .sw-footer-col a { color: var(--warm-white-dim); text-decoration: none; font-size: 14px; transition: color 0.2s; }
        .sw-footer-col a:hover { color: var(--amber); }
        .sw-footer-bottom { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--slate); letter-spacing: 0.06em; }
        .sw-footer-bottom a { color: var(--slate); text-decoration: none; }
        .sw-footer-bottom a:hover { color: var(--amber); }

        @media (max-width: 900px) {
          .sw-root nav { padding: 18px 24px; }
          .sw-nav-links { gap: 22px; }
          .sw-nav-links a:not(.sw-nav-cta) { display: none; }
          .sw-hero { padding: 120px 24px 80px; }
          .sw-section-inner, .sw-letter-inner { padding: 80px 24px; }
          .sw-book-inner, .sw-promise-inner { grid-template-columns: 1fr; gap: 60px; }
          .sw-book-cover { max-width: 320px; margin: 0 auto; }
          .sw-blog-grid { grid-template-columns: 1fr; gap: 8px; }
          .sw-book-meta { grid-template-columns: 1fr; gap: 16px; }
          .sw-footer-top { grid-template-columns: 1fr 1fr; gap: 32px; }
          .sw-footer { padding: 60px 24px 30px; }
        }

        @media (max-width: 500px) {
          .sw-footer-top { grid-template-columns: 1fr; }
          .sw-hero-actions { flex-direction: column; align-items: stretch; }
          .sw-btn-primary, .sw-btn-ghost { text-align: center; justify-content: center; }
          .sw-book-buy { flex-direction: column; align-items: stretch; }
          .sw-book-buy .sw-btn-primary { justify-content: center; }
        }

        @media (prefers-reduced-motion: reduce) {
          .sw-root * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      ` }} />

      <div className="sw-root">
        <nav>
          <div className="sw-brand">
            <div>
              <div className="sw-brand-mark">Slumby<em>wise</em></div>
              <div className="sw-brand-by">by Denshiku</div>
            </div>
          </div>
          <div className="sw-nav-links">
            <a href="#livre">Le livre</a>
            <a href="#blog">Le carnet</a>
            <a href="#letter">La lettre</a>
            <Link href="/grindleveling">Grindleveling</Link>
            <Link href="/chess">Chess</Link>
            <a href="#livre" className="sw-nav-cta">Commander</a>
          </div>
        </nav>

        <section className="sw-hero">
          <div className="sw-time-block">
            <span className="sw-time-label">Il est actuellement</span>
            <span className="sw-time-clock">{h}<span className="sw-time-blink">:</span>{m}</span>
          </div>
          <div className="sw-hero-message">{message}</div>
          <h1 className="sw-hero-headline">
            Un site pour ceux qui <em>vivent la nuit.</em>
          </h1>
          <p className="sw-hero-sub">
            Le livre, le carnet, la lettre. Une bibliothèque associative pour les veilleurs — travailleurs postés, soignants, boulangers, insomniaques, créatifs noctambules. Portée par l&apos;association Denshiku, entièrement au bénéfice de l&apos;éducation des enfants orphelins.
          </p>
          <div className="sw-hero-actions">
            <a href="#livre" className="sw-btn-primary">Découvrir le livre</a>
            <a href="#blog" className="sw-btn-ghost">Lire le carnet</a>
          </div>
        </section>

        <section className="sw-book" id="livre">
          <div className="sw-section-inner sw-book-inner">
            <div className="sw-book-cover">
              <div className="sw-cover-eyebrow">Édition 2026 · Denshiku</div>
              <div>
                <div className="sw-cover-title">Le Carnet<br />du <em>concierge</em></div>
              </div>
              <div>
                <div className="sw-cover-sub">
                  Quarante-trois lectiones sur l&apos;art de vivre la nuit, de concentrer son attention et de trouver sa force dans le silence.
                </div>
              </div>
              <div className="sw-cover-author">Élias Morel</div>
            </div>
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
                <a href="#" className="sw-btn-primary">Commander l&apos;exemplaire</a>
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

        <section className="sw-blog" id="blog">
          <div className="sw-section-inner">
            <div className="sw-blog-head">
              <div className="sw-blog-title-block">
                <div className="sw-eyebrow">Le carnet</div>
                <h2 className="sw-section-title">Nuit après nuit, <em>nous continuons d&apos;écrire.</em></h2>
              </div>
              <a href="#" className="sw-btn-ghost">Tous les articles</a>
            </div>
            <div className="sw-blog-grid">
              <a href="#" className="sw-blog-card">
                <div className="sw-blog-meta">
                  <span className="sw-num">N° 003</span>
                  <span>17 nov. 2026</span>
                  <span>· Habiter</span>
                </div>
                <h3 className="sw-blog-cardtitle">Pourquoi la <em>lumière chaude</em> à 2700K change une nuit de garde.</h3>
                <p className="sw-blog-excerpt">Le veilleur d&apos;hôpital, l&apos;ouvrier en 3×8 et l&apos;insomniaque partagent un même adversaire silencieux : la lumière blanche des néons. Retour sur un des rituels les plus simples et les plus sous-estimés du livre.</p>
                <div className="sw-blog-read">Lire</div>
              </a>
              <a href="#" className="sw-blog-card">
                <div className="sw-blog-meta">
                  <span className="sw-num">N° 002</span>
                  <span>03 nov. 2026</span>
                  <span>· Subir</span>
                </div>
                <h3 className="sw-blog-cardtitle">Blaise, barman : <em>« Épanoui la nuit, la clientèle est différente. »</em></h3>
                <p className="sw-blog-excerpt">Premier des entretiens de la série Fraternité silencieuse. Blaise raconte pourquoi la nuit lui va, comment il dort d&apos;un seul bloc après le service, et ce que le jour ne lui offre plus depuis longtemps.</p>
                <div className="sw-blog-read">Lire</div>
              </a>
              <a href="#" className="sw-blog-card">
                <div className="sw-blog-meta">
                  <span className="sw-num">N° 001</span>
                  <span>20 oct. 2026</span>
                  <span>· Partager</span>
                </div>
                <h3 className="sw-blog-cardtitle">Le couple <em>en décalé :</em> géométrie des présences.</h3>
                <p className="sw-blog-excerpt">Quand l&apos;un rentre, l&apos;autre part. Les protocoles concrets — les trente minutes sacrées, le repas hebdomadaire ritualisé, les week-ends recalés — qui font tenir un couple séparé par les horaires.</p>
                <div className="sw-blog-read">Lire</div>
              </a>
            </div>
          </div>
        </section>

        <section className="sw-letter" id="letter">
          <div className="sw-letter-inner">
            <div className="sw-eyebrow sw-letter-eyebrow">La lettre du veilleur</div>
            <h2 className="sw-letter-title">Une lettre par mois. <em>Rien d&apos;autre.</em></h2>
            <p className="sw-letter-desc">Une lecture longue, un entretien avec un veilleur, une découverte scientifique récente sur le sommeil et la chronobiologie. Envoyée le premier samedi du mois, à lire tranquillement dans ta prochaine veille.</p>
            <form className="sw-letter-form" onSubmit={handleNewsletterSubmit}>
              <input type="email" placeholder="ton adresse email" required />
              <button type="submit">S&apos;inscrire</button>
            </form>
            <p className="sw-letter-note">Aucune publicité. Un lien de désinscription à chaque lettre.</p>
          </div>
        </section>

        <footer className="sw-footer">
          <div className="sw-footer-inner">
            <div className="sw-footer-top">
              <div className="sw-footer-brand-block">
                <div className="sw-footer-brand">Slumby<em>wise</em></div>
                <div className="sw-footer-by">by Denshiku</div>
                <p className="sw-footer-mission">
                  Une bibliothèque associative pour les veilleurs. <em>Chaque euro reversé finance l&apos;éducation d&apos;un enfant orphelin.</em>
                </p>
              </div>
              <div className="sw-footer-col">
                <div className="sw-footer-col-title">Le site</div>
                <ul>
                  <li><a href="#livre">Le livre</a></li>
                  <li><a href="#blog">Le carnet</a></li>
                  <li><a href="#letter">La lettre</a></li>
                </ul>
              </div>
              <div className="sw-footer-col">
                <div className="sw-footer-col-title">Nos projets</div>
                <ul>
                  <li><Link href="/grindleveling">Grindleveling</Link></li>
                  <li><Link href="/chess">Chess</Link></li>
                </ul>
              </div>
              <div className="sw-footer-col">
                <div className="sw-footer-col-title">Contact</div>
                <ul>
                  <li><a href="#">Nous écrire</a></li>
                  <li><a href="#">Presse</a></li>
                  <li><a href="#">Mentions légales</a></li>
                </ul>
              </div>
            </div>
            <div className="sw-footer-bottom">
              <div>© 2026 · Association Denshiku (loi 1901)</div>
              <div>Fait la nuit, à Belfort.</div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
