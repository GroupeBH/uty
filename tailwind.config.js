/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      sm: '300px',
      // => @media (min-width: 640px) { ... }

      md: '768px',
      // => @media (min-width: 768px) { ... }

      lg: '1024px',
      // => @media (min-width: 1024px) { ... }

      xl: '1280px',
      // => @media (min-width: 1280px) { ... }
    },
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui'],
        serif: ['ui-serif', 'Georgia'],
        mono: ['ui-monospace', 'SFMono-Regular'],
        display: ['Oswald'],
        body: ['"Open Sans"'],
        logo: ['Pacifico', 'cursive'],
        payton: ['Paytone One', 'cursive'],
        poppins: ['Poppins', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
      },
      spacing: {
        110: '100vh',
        105: '50vh',
      },
      height: {
        half: '50vh',
        quarter: '25vh',
      },
      width: {
        half: '50vw',
        tier: '35vw',
        quarter: '25vw',
      },
       backgroundImage: {
        'header-background': "url('/')",
        'footer-texture': "url('/img/footer-texture.png')",
        // 'uty-market':
        //   "linear-gradient(to right bottom, rgba(0, 35, 158, 0.68), rgba(0, 35, 158, 0.68)), url('/src/assets/uty-market.png')",
        'uty-market':
          "linear-gradient(to right bottom, rgba(68, 69, 71, 0.86), rgba(68, 69, 71, 0.86)), url('/src/assets/uty-market.png')",
        'uty-signup': 'linear-gradient(to right bottom, #3a559a, #a9a7aa)',
        'uty-dashboard': 'linear-gradient(to right bottom, #3a559c, #a9a7aa)',
      },
      colors: {
        secondary: '#ffbf00',
        primary: '#00239E',
      },
      fontSize: {
        title: '1.3rem',
      },
      boxShadow: {
        '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
      },
      backgroundColor: {
        'black-t-50': 'rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}

