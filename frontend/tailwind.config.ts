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
        background: 'hsl(222, 47%, 4%)',
        foreground: 'hsl(210, 40%, 98%)',
        primary: {
          50: '#f0f4ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        // Debate-specific semantic colors
        debate: {
          pro: {
            DEFAULT: '#10b981',
            dark: '#059669',
            light: '#34d399',
            glow: 'rgba(16, 185, 129, 0.4)',
          },
          con: {
            DEFAULT: '#f43f5e',
            dark: '#e11d48',
            light: '#fb7185',
            glow: 'rgba(244, 63, 94, 0.4)',
          },
          neutral: '#64748b',
          accent: {
            DEFAULT: '#8b5cf6',
            glow: 'rgba(139, 92, 246, 0.4)',
          },
          // Phase-specific colors
          opening: {
            DEFAULT: '#3b82f6',
            glow: 'rgba(59, 130, 246, 0.4)',
          },
          rebuttal: {
            DEFAULT: '#ef4444',
            glow: 'rgba(239, 68, 68, 0.4)',
          },
          argument: {
            DEFAULT: '#f59e0b',
            glow: 'rgba(245, 158, 11, 0.4)',
          },
          conclusion: {
            DEFAULT: '#10b981',
            glow: 'rgba(16, 185, 129, 0.4)',
          },
        },
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.03)',
          border: 'rgba(255, 255, 255, 0.08)',
          highlight: 'rgba(255, 255, 255, 0.12)',
          dark: 'rgba(0, 0, 0, 0.2)',
        },
        surface: {
          DEFAULT: 'hsl(222, 47%, 8%)',
          elevated: 'hsl(222, 47%, 11%)',
          overlay: 'hsl(222, 47%, 6%)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'speaking': 'speaking 2s ease-in-out infinite',
        'speaking-fast': 'speaking 1s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'phase-transition': 'phaseTransition 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'ring-pulse': 'ringPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'progress': 'progress 1s linear',
      },
      keyframes: {
        speaking: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0.6)' },
          '50%': { boxShadow: '0 0 0 16px rgba(99, 102, 241, 0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        phaseTransition: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        ringPulse: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1.3)', opacity: '0' },
        },
        progress: {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.02) 100%)',
        'glass-gradient-dark': 'linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.1) 100%)',
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.36)',
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.2)',
        'glow-primary': '0 0 40px -10px rgba(99, 102, 241, 0.5)',
        'glow-pro': '0 0 40px -10px rgba(16, 185, 129, 0.5)',
        'glow-con': '0 0 40px -10px rgba(244, 63, 94, 0.5)',
        'phase-opening': '0 0 30px -5px rgba(59, 130, 246, 0.4)',
        'phase-rebuttal': '0 0 30px -5px rgba(239, 68, 68, 0.4)',
        'phase-argument': '0 0 30px -5px rgba(245, 158, 11, 0.4)',
        'phase-conclusion': '0 0 30px -5px rgba(16, 185, 129, 0.4)',
      },
    },
  },
  plugins: [],
}

export default config
