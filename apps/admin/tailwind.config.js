/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'client-primary': '#6366f1',
        'client-secondary': '#818cf8',
        'client-accent': '#4f46e5',
        'command-primary': '#10b981',
        'command-secondary': '#34d399',
        'command-accent': '#059669',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite',
        'pulse': 'pulse 2s infinite',
        'bounceIn': 'bounceIn 0.5s ease-out',
        'fadeInDown': 'fadeInDown 0.3s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateX(-50%) translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(-50%) translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}