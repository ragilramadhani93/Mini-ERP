import './styles/global.css'
import { createIcons, icons } from 'lucide'
import { initApp } from './app.js'

// Bundled Lucide helper so icons always render reliably offline and locally
window.lucide = {
  createIcons: (options = {}) => createIcons({ icons, ...options }),
  icons
}

document.addEventListener('DOMContentLoaded', initApp)