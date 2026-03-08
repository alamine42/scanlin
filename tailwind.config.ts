import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Core backgrounds
        background: {
          DEFAULT: 'var(--background)',
          elevated: 'var(--background-elevated)',
          subtle: 'var(--background-subtle)',
          muted: 'var(--background-muted)',
        },
        // Surfaces
        surface: {
          DEFAULT: 'var(--surface)',
          hover: 'var(--surface-hover)',
          active: 'var(--surface-active)',
        },
        // Borders
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
          hover: 'var(--border-hover)',
          focus: 'var(--border-focus)',
        },
        // Foreground
        foreground: {
          DEFAULT: 'var(--foreground)',
          muted: 'var(--foreground-muted)',
          subtle: 'var(--foreground-subtle)',
        },
        // Primary
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          muted: 'var(--primary-muted)',
          glow: 'var(--primary-glow)',
        },
        // Semantic
        success: {
          DEFAULT: 'var(--success)',
          muted: 'var(--success-muted)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          muted: 'var(--warning-muted)',
        },
        error: {
          DEFAULT: 'var(--error)',
          muted: 'var(--error-muted)',
        },
        // Severity
        severity: {
          critical: 'var(--critical)',
          'critical-bg': 'var(--critical-bg)',
          high: 'var(--high)',
          'high-bg': 'var(--high-bg)',
          medium: 'var(--medium)',
          'medium-bg': 'var(--medium-bg)',
          low: 'var(--low)',
          'low-bg': 'var(--low-bg)',
        },
        // Category
        category: {
          security: 'var(--security)',
          'security-bg': 'var(--security-bg)',
          testing: 'var(--testing)',
          'testing-bg': 'var(--testing-bg)',
          'tech-debt': 'var(--tech-debt)',
          'tech-debt-bg': 'var(--tech-debt-bg)',
          performance: 'var(--performance)',
          'performance-bg': 'var(--performance-bg)',
          documentation: 'var(--documentation)',
          'documentation-bg': 'var(--documentation-bg)',
        },
        // Status
        status: {
          pending: 'var(--pending)',
          approved: 'var(--approved)',
          rejected: 'var(--rejected)',
          snoozed: 'var(--snoozed)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        glow: 'var(--shadow-glow)',
      },
      spacing: {
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
        md: 'var(--space-md)',
        lg: 'var(--space-lg)',
        xl: 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 300ms ease-out',
        'scale-in': 'scaleIn 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 var(--primary-glow)', opacity: '1' },
          '50%': { boxShadow: '0 0 20px 4px var(--primary-glow)', opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
    },
  },
  plugins: [],
};

export default config;
