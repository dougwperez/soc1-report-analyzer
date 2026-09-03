import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Deployed to GitHub Pages at https://<user>.github.io/soc1-report-analyzer/
export default defineConfig({
  base: '/soc1-report-analyzer/',
  plugins: [react(), tailwindcss()],
})
