import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'src/index.html'
      },
      output: {
        manualChunks: {
          'vendor-chart': ['chart.js'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          'vendor-qrcode': ['html5-qrcode'],
          'vendor-xlsx': ['xlsx']
        }
      }
    },
    chunkSizeWarningLimit: 300
  },
  server: {
    port: 3000,
    open: true
  }
})