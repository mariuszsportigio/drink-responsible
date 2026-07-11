import { useEffect } from 'react'

/** Freeze background scrolling while an overlay (modal / game) is mounted. */
export function useLockBodyScroll(): void {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    const prevTouch = document.body.style.touchAction
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.touchAction = prevTouch
    }
  }, [])
}
