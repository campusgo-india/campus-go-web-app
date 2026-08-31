import type { Config } from 'tailwindcss';

/**
 * CampusGO "cool gray + blue" design tokens — the single source of theme truth.
 * Both web shells (mobile student + desktop admin) extend this preset.
 * Mirrors docs/design-system.md.
 */
const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EEF3FF',
          100: '#DCE6FF',
          200: '#B9CEFF',
          300: '#8FAEFF',
          400: '#6488FB',
          500: '#3B6EF5',
          600: '#2C56C4',
          700: '#1F3F94',
          DEFAULT: '#3B6EF5',
          foreground: '#FFFFFF',
        },
        // The CampusGo logo's orange (graduation-cap arrow) — a genuine
        // accent, used sparingly (a highlight badge, a secondary button, a
        // CTA here and there), never as the default action color. Keeps
        // `primary` as the workhorse blue everywhere else.
        accent: {
          50: '#FFF3EA',
          400: '#F2954A',
          500: '#E28040',
          600: '#C2601F',
          DEFAULT: '#E28040',
          foreground: '#FFFFFF',
        },
        tint: {
          lavender: '#EDF0FE',
          'lavender-fg': '#3B6EF5',
          mint: '#E7F6EF',
          'mint-fg': '#1F9D6B',
          cream: '#FFF4E0',
          'cream-fg': '#C98A1B',
          rose: '#FEECEC',
          'rose-fg': '#E5484D',
          accent: '#FDEEE3',
          'accent-fg': '#C2601F',
        },
        app: '#F4F6FB',
        card: '#FFFFFF',
        muted: '#EDF0F6',
        border: '#E6E9F0',
        body: '#4A5468',
        strong: '#1B2333',
        subtle: '#98A2B3',
        success: '#1F9D6B',
        warning: '#E8A13A',
        danger: '#E5484D',
        info: '#3B6EF5',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #5B8DEF 0%, #3B6EF5 100%)',
        'gradient-sunset': 'linear-gradient(135deg, #FBC2A4 0%, #F78CA0 100%)',
        'gradient-ocean': 'linear-gradient(135deg, #7CC0FF 0%, #5B8DEF 100%)',
        'gradient-violet': 'linear-gradient(135deg, #A9B6FF 0%, #7C8BFF 100%)',
        // The logo's orange — an accent gradient for the odd highlighted CTA,
        // not a replacement for gradient-primary.
        'gradient-accent': 'linear-gradient(135deg, #F2954A 0%, #E28040 100%)',
        // The logo's own color story — blue graduation cap sweeping into the
        // orange arrow. The signature "this is CampusGo" gradient: primary
        // buttons, hero bands, headline accents. Bolder than gradient-primary
        // on purpose — this is the one place blue-only stops being enough.
        // End stop is accent-600 (darker), not accent-500 — keeps white
        // button text legible all the way across, unlike the brighter orange.
        'gradient-brand': 'linear-gradient(135deg, #3B6EF5 0%, #C2601F 100%)',
      },
      // Uniform 10px corners across the project. Circular tokens (pill / full,
      // used by avatars, badges, progress bars, nav) intentionally stay round.
      borderRadius: {
        sm: '10px',
        DEFAULT: '10px',
        md: '10px',
        lg: '10px',
        xl: '10px',
        '2xl': '10px',
        '3xl': '10px',
        card: '10px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04), 0 10px 24px -14px rgba(16,24,40,0.12)',
        nav: '0 12px 28px -10px rgba(59,110,245,0.35)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
};

export default preset;
