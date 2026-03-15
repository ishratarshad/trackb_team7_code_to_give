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
        canvas: '#faf8f2',
        ink: '#261c38',
        mist: '#fff4c7',
        line: '#e7ddf7',
        card: '#fffdf8',
        pine: '#704DBD',
        moss: '#5b458f',
        amber: '#ffcc10',
        coral: '#cc6f4f',
        slate: '#6a607b',
      },
      boxShadow: {
        card: '0 18px 45px rgba(38, 28, 56, 0.10)',
        soft: '0 10px 25px rgba(38, 28, 56, 0.08)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      backgroundImage: {
        'dashboard-grid':
          'linear-gradient(rgba(112,77,189,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(112,77,189,0.08) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};

export default config;
