import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base dark theme colors
        'void': '#0a0a0f',
        'deep': '#12121a',
        'surface': '#1a1a25',
        'border': '#2a2a3a',
        'muted': '#6b6b80',
        'accent': '#7c3aed',
        'accent-glow': '#a855f7',

        // Knowledge depth colors
        'depth': {
          'known': {
            bg: '#0a1628',
            accent: '#3b82f6',
          },
          'investigated': {
            bg: '#0f1a2e',
            accent: '#60a5fa',
          },
          'debated': {
            bg: '#1a1a2e',
            accent: '#f59e0b',
          },
          'unknown': {
            bg: '#0d0d1a',
            accent: '#ec4899',
          },
          'frontier': {
            bg: '#050510',
            accent: '#f472b6',
          },
        },

        // Semantic colors
        'known': '#3b82f6',
        'debated': '#f59e0b',
        'unknown': '#ec4899',
        'frontier': '#f472b6',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'horizon-pulse': 'horizonPulse 3s ease-in-out infinite',
        'twinkle': 'twinkle 3s ease-in-out infinite',
        'float': 'particleFloat 8s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(168, 85, 247, 0.5)' },
        },
        horizonPulse: {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
        particleFloat: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '25%': { transform: 'translateY(-10px) translateX(5px)' },
          '50%': { transform: 'translateY(-5px) translateX(-5px)' },
          '75%': { transform: 'translateY(-15px) translateX(3px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      backgroundImage: {
        'depth-gradient': 'radial-gradient(ellipse at bottom, var(--tw-gradient-stops))',
        'frontier-glow': 'radial-gradient(ellipse at center, rgba(244, 114, 182, 0.15) 0%, transparent 70%)',
      },
    },
  },
  plugins: [],
}
export default config
