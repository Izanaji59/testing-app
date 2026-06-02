/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export → déploiement sur Netlify sans serveur.
  output: 'export',

  // trailingSlash: génère dossier/index.html plutôt que dossier.html
  // → compatible avec SPA fallback Netlify et navigation directe.
  trailingSlash: true,

  images: {
    unoptimized: true, // requis pour 'export'
  },

  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
