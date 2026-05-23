/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export → permet de déployer dans latraction.net/game sans serveur Next.
  output: 'export',

  // Le site sera servi depuis /game sur le domaine principal.
  basePath: '/game',
  assetPrefix: '/game',

  // Important pour les routes statiques (dossier/index.html plutôt que dossier.html)
  trailingSlash: true,

  images: {
    unoptimized: true, // requis pour 'export'
  },

  // Strict mode + qualité
  reactStrictMode: true,

  // Évite les conflits avec le site Netlify existant
  poweredByHeader: false,
};

export default nextConfig;
