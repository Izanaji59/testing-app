import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Slumbywise',
  description: 'Lire, avancer, jouer. Un projet porté par Denshiku.',
  applicationName: 'Slumbywise',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico?v=sl-logo-1', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { url: '/icons/slumbywise-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/slumbywise-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/slumbywise-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/slumbywise-180.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#03060D',
  width: 'device-width',
  initialScale: 1,
};

// Netlify insère dans <head> un saut de ligne et un commentaire promotionnel absents du build.
// React (18.3) hydrate tout le document : ces nœuds font échouer l'hydratation (#418, #423),
// parfois jusqu'à bloquer la page (#329). Ce script s'exécute pendant l'analyse du HTML,
// avant React, et retire uniquement ces nœuds.
const STRIP_HOST_INJECTION = `(function(){var h=document.head;if(!h)return;for(var n=h.firstChild;n;){var next=n.nextSibling;if((n.nodeType===8&&/hosted on Netlify/i.test(n.data))||(n.nodeType===3&&!n.data.trim()))h.removeChild(n);n=next;}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <script dangerouslySetInnerHTML={{ __html: STRIP_HOST_INJECTION }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;700&family=JetBrains+Mono:wght@400;600&family=Orbitron:wght@500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
