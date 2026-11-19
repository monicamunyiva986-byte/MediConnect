export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#183348',
        muted: '#647b8d',
        canvas: '#f2f7fb',
        forest: '#147d82',
        mint: '#dff3ef',
        navy: '#12384d',
        coral: '#d45f68',
        amber: '#c88c2e',
      },
      fontFamily: {
        sans: ['DM Sans', 'Aptos', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 8px 24px rgba(18, 56, 77, 0.055), 0 1px 2px rgba(18, 56, 77, 0.04)',
        'panel-hover': '0 12px 30px rgba(18, 56, 77, 0.09), 0 2px 6px rgba(18, 56, 77, 0.05)',
      },
    },
  },
  plugins: [],
}