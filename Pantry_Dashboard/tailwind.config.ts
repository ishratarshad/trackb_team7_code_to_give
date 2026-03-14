import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#f8f1e2',
        ink: '#241d14',
        mist: '#f5ead0',
        line: '#e5d4ae',
        card: '#fffdf8',
        pine: '#9b6813',
        moss: '#8e6d2b',
        amber: '#ddb042',
        coral: '#cc6f4f',
        slate: '#675c4f',
      },
      boxShadow: {
        card: '0 18px 45px rgba(51, 35, 8, 0.10)',
        soft: '0 10px 25px rgba(51, 35, 8, 0.08)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      backgroundImage: {
        'dashboard-grid':
          'linear-gradient(rgba(155,104,19,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(155,104,19,0.06) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};

export default config;
