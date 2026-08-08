import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // The repository's shared .env lives one directory above the frontend.
  // Vercel-injected variables are still read from process.env during build;
  // only VITE_* variables are exposed to browser code.
  envDir: '..',
  plugins: [react(), tailwindcss()],
})
