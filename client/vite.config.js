import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'




export default defineConfig({
   plugins: [
     react(),
     babel({ presets: [reactCompilerPreset()] }),
       tailwindcss(),
   ],
   server: {
     proxy: {
       // Shorthand for simple forwarding
       '/api': {
         target: 'http://127.0.0.1:8000',
         changeOrigin: true,
       }
     }
   }
 })
