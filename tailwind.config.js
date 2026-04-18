/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        transparent: 'transparent',
        current: 'currentColor',

        /* Core semantic tokens mapped to CSS variables (defined in src/app/globals.css) */
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        popover: 'var(--popover)',
        'popover-foreground': 'var(--popover-foreground)',
        primary: 'var(--primary-color)',
        'primary-foreground': 'var(--primary-on)',
        secondary: 'var(--secondary-color)',
        accent: 'var(--accent-color)',
        muted: 'var(--muted-color)',
        'muted-foreground': 'var(--muted-on)',
        input: 'var(--input-bg)',
        'input-text': 'var(--input-text)',
        border: 'var(--border)',
        ring: 'var(--ring)',
        surface: 'var(--surface-bg)',
        'surface-foreground': 'var(--surface-text)',
        sidebar: 'var(--sidebar-bg)',
        'sidebar-text': 'var(--sidebar-text)',

        /* Small compatibility palette: map common color names/scales to semantic variables
           so existing utility classes (eg. bg-white, bg-gray-100) follow the theme. */
        white: 'var(--background)',
        black: 'var(--foreground)',

        gray: {
          50: 'var(--muted-color)',
          100: 'var(--muted-color)',
          200: 'var(--muted-color)',
          300: 'var(--muted-color)',
          400: 'var(--muted-color)',
          500: 'var(--muted-color)',
          600: 'var(--muted-on)',
          700: 'var(--foreground)',
          800: 'var(--foreground)',
          900: 'var(--foreground)',
        },
        slate: {
          50: 'var(--muted-color)',
          100: 'var(--muted-color)',
          200: 'var(--muted-color)',
          300: 'var(--muted-color)',
          400: 'var(--muted-color)',
          500: 'var(--muted-color)',
          600: 'var(--muted-on)',
          700: 'var(--foreground)',
          800: 'var(--foreground)',
          900: 'var(--foreground)',
        },
      },
    },
  },
  plugins: [],
}
