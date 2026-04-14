import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/App'

const isZoomAllowedTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('[data-allow-zoom="true"]'))
}

const blockGlobalZoomOutsideAllowlist = () => {
  const onTouchMove = (event: TouchEvent) => {
    if (event.touches.length < 2) return
    if (isZoomAllowedTarget(event.target)) return
    event.preventDefault()
  }
  const onGesture = (event: Event) => {
    if (isZoomAllowedTarget(event.target)) return
    event.preventDefault()
  }
  const onWheel = (event: WheelEvent) => {
    if (!event.ctrlKey) return
    if (isZoomAllowedTarget(event.target)) return
    event.preventDefault()
  }

  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('gesturestart', onGesture as EventListener, { passive: false })
  window.addEventListener('gesturechange', onGesture as EventListener, { passive: false })
  window.addEventListener('gestureend', onGesture as EventListener, { passive: false })
  window.addEventListener('wheel', onWheel, { passive: false })
}

blockGlobalZoomOutsideAllowlist()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
