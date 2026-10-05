import { createRoot } from 'react-dom/client'
import css from './styles.css?inline'
import App from './App'
import { applySettings } from './settings'

const HOST_ID = 'tu-rental-flow'

// Each piece renders in its own shadow root so the page's Webflow CSS and this
// widget's Tailwind CSS can't affect each other.
function shadowMount(host: HTMLElement) {
  const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = css
  root.appendChild(style)
  const mount = document.createElement('div')
  root.appendChild(mount)
  return mount
}

// @property rules are ignored inside shadow roots, so register them on the page.
function registerCssProperties() {
  if (document.getElementById('tu-rental-flow-props')) return
  const rules = css.match(/@property\s+--[\w-]+\s*\{[^}]*\}/g)
  if (!rules) return
  const style = document.createElement('style')
  style.id = 'tu-rental-flow-props'
  style.textContent = rules.join('\n')
  document.head.appendChild(style)
}

function init() {
  const host = document.getElementById(HOST_ID)
  if (!host || host.dataset.mounted) return
  host.dataset.mounted = 'true'
  registerCssProperties()
  // Per-site settings from /js/rental-flow-settings.js (optional; defaults apply without it).
  const cssVars = applySettings()
  const themeIt = (el: HTMLElement) => Object.entries(cssVars).forEach(([k, v]) => el.style.setProperty(k, v))
  themeIt(host)

  const appMount = shadowMount(host)

  // Popups render in a separate layer at the end of <body>, so no page
  // container can clip or trap them.
  const layerHost = document.createElement('div')
  layerHost.id = `${HOST_ID}-layer`
  layerHost.style.cssText = 'position:relative;z-index:2147483647'
  document.body.appendChild(layerHost)
  themeIt(layerHost)
  const layerMount = shadowMount(layerHost)

  createRoot(appMount).render(<App host={host} layer={layerMount} />)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
