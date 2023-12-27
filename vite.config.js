import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin'],
      },
    })],
  server: {    
    // this ensures that the browser opens upon server start
    open: true,
    // this sets a default port to 4000  
    port: 4000, 
},
})
