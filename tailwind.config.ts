import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07090f',
          900: '#0a0d16',
          850: '#0d111c',
          800: '#111624',
          700: '#171d2e',
          600: '#1f2740',
          500: '#2a3452',
        },
        brand: {
          50: '#eef4ff',
          100: '#dbe7ff',
          200: '#bcd3ff',
          300: '#8fb5ff',
          400: '#5b8cff',
          500: '#3b6cff',
          600: '#254ce6',
          700: '#1d3cba',
          800: '#1c3594',
          900: '#1c3175',
        },
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        mint: {
          400: '#4ade80',
          500: '#22c55e',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        rose: {
          400: '#fb7185',
          500: '#f43f5e',
        },
      },
      fontFamily: {
        sans: ['Inter var', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Sora', 'Inter var', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.25), 0 12px 32px -12px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(59,108,255,0.28), 0 18px 50px -18px rgba(59,108,255,0.55)',
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 50px -30px rgba(0,0,0,0.9)',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(circle at 20% 10%, rgba(59,108,255,0.14), transparent 45%), radial-gradient(circle at 85% 5%, rgba(139,92,246,0.12), transparent 40%)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseRing: {
          '0%': { opacity: '0.55', transform: 'scale(0.96)' },
          '70%': { opacity: '0', transform: 'scale(1.08)' },
          '100%': { opacity: '0', transform: 'scale(1.08)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        float: 'float 6s ease-in-out infinite',
        pulseRing: 'pulseRing 2.8s ease-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
