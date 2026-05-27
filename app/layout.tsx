import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LATRACTION — Leveling',
  description: 'Centre de commandement personnel. Montée en puissance immersive.',
  applicationName: 'LATRACTION',
  manifest: '/game/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#03060D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
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
