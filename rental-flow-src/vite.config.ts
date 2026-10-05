import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Builds one self-contained script (JS + CSS) into the site's /js folder.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: '../js',
    emptyOutDir: false,
    lib: {
      entry: 'src/main.tsx',
      name: 'FortWorthRentalFlow',
      formats: ['iife'],
      fileName: () => 'rental-flow.js',
    },
  },
})
