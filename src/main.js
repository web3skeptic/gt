import './index.css'
import { mount } from 'svelte'
import App from './App.svelte'
import { registerSW } from 'virtual:pwa-register'

// The service worker only makes sense for the web/PWA build; the desktop shell serves the
// app from its own app:// scheme where service workers are not available.
if (/^https?:$/.test(location.protocol)) {
  registerSW({ immediate: true })
}

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
