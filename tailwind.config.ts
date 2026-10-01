import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}', './types/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: { fontFamily: { lato: ['var(--font-lato)', 'sans-serif'] }, colors: { dequino: { primary: '#7D9375', secondary: '#3D4D3A', tertiary: '#D1DDD0', neutral: '#FAF8F5', dark: '#1F2920' } } },
  },
  plugins: [],
};

export default config;
