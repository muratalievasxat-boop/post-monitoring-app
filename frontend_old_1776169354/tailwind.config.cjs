/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"General Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: {
          DEFAULT: '#f7f6f2',
          subtle:  '#fbfbf9',
          raised:  '#f3f0ec',
        },
        border: {
          subtle: '#e0ddd7',
          strong: '#c7c3bb',
        },
        text: {
          DEFAULT: '#26231c',
          muted:  '#7a7974',
          faint:  '#bab9b4',
          inverse:'#f9f8f4',
        },
        primary: {
          DEFAULT: '#01696f',
          hover:   '#0c4e54',
          soft:    '#e0edef',
        },
        danger:  '#a12c7b',
        success: '#437a22',
        warn:    '#d19900',
      },
      borderRadius: {
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        card: '0 4px 16px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};
