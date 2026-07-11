import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (document.getElementById('sw-update-toast')) return
    const bar = document.createElement('div')
    bar.id = 'sw-update-toast'
    bar.className = 'toast-in'
    bar.style.cssText =
      'position:fixed;bottom:96px;left:50%;z-index:100;display:flex;align-items:center;gap:14px;' +
      'background:#1E2622;border:1px solid #2A342F;border-radius:9999px;padding:12px 20px;font-size:14px;' +
      'box-shadow:0 10px 30px rgba(0,0,0,.45);white-space:nowrap;'
    bar.innerHTML = '<span>Nowa wersja apki</span>'
    const btn = document.createElement('button')
    btn.textContent = 'Odśwież'
    btn.style.cssText = 'color:#F5A524;font-weight:700;background:none;border:0;font-size:14px;'
    btn.onclick = () => void updateSW(true)
    bar.appendChild(btn)
    document.body.appendChild(bar)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
