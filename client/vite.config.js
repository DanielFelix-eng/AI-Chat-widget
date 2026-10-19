import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// src/lib/api.js
export const VITE_API_URL = import.meta.env.VITE_API_URL || "";





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
         target: VITE_API_URL,
         changeOrigin: true,
       }
     }
   }
 })
 