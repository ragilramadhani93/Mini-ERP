import { defineConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

export default defineConfig({
  ...viteConfig,
  test: {
    environment: 'jsdom',
    root: 'src',
    include: ['**/*.test.js', '**/*.test.html'],
    setupFiles: ['./test-setup.js'],
    globals: true,
    css: false,
  },
})
