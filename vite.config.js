import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from "vite-plugin-pwa"

const manifestForPlugIn = {
  registerType:'autoUpdate',
  includeAssests:['favicon.ico', "apple-touc-icon.png", "masked-icon.svg"],
  devOptions: {
    enabled: true
  },
  manifest:{
    name:"uty",
    short_name:"uty",
    description:"tout en un",
    icons:[{
      src: '/android-chrome-192x192.png',
      sizes:'192x192',
      type:'image/png',
      purpose:'favicon'
    },
    {
      src:'/android-chrome-512x512.png',
      sizes:'512x512',
      type:'image/png',
      purpose:'favicon'
    },
    {
      src: '/apple-touch-icon.png',
      sizes:'180x180',
      type:'image/png',
      purpose:'apple touch icon',
    },
    {
      src: '/maskable_icon.png',
      sizes:'512x512',
      type:'image/png',
      purpose:'any maskable',
    }
  ],
  theme_color:'#171717',
  background_color:'#f0e7db',
  display:"standalone",
  scope:'/',
  start_url:"/home",
  orientation:'portrait'
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin'],
      },
    }),
    VitePWA(manifestForPlugIn)
  ],
  server: {    
    // this ensures that the browser opens upon server start
    open: true,
    // this sets a default port to 4000  
    port: 4000, 
},
})
