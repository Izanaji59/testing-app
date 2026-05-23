import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Aligné sur lib/tokens.ts — Tailwind est utilisé comme appoint, l'identité passe par les styles inline.
        bg:       '#03060D',
        bg2:      '#06091A',
        cyan:     '#4ECDFF',
        cyanHi:   '#B8ECFF',
        cyanLo:   '#1A6E9E',
        purple:   '#9B7CFF',
        amber:    '#FFB23D',
        green:    '#5CFFB2',
        danger:   '#FF5577',
        text:     '#DCEAF7',
        textDim:  '#7E97B7',
        textMute: '#4A607E',
      },
      fontFamily: {
        display: ['"Chakra Petch"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        rank:    ['"Orbitron"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'lt-pulse': 'lt-pulse 1.6s ease-in-out infinite',
        'sweep':    'sweep 1.6s linear infinite',
      },
      keyframes: {
        'lt-pulse': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%':       { opacity: '1',   transform: 'scale(1.15)' },
        },
        sweep: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
