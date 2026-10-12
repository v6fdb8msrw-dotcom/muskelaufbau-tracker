import { useEffect, useState } from 'react'
import { readDisplayPrefs, writeDisplayPrefs, type DisplayPrefs } from '../storage/localPrefs'

const EVENT = 'ms-display-change'

export function applyDisplayPrefs(p: DisplayPrefs) {
  const html = document.documentElement
  if (p.motion === 'system') html.removeAttribute('data-motion')
  else html.setAttribute('data-motion', p.motion === 'reduziert' ? 'reduced' : 'normal')
  html.setAttribute('data-marble', p.marble ? 'on' : 'off')
  html.setAttribute('data-density', p.compact ? 'compact' : 'normal')
}

export function useDisplayPrefs(): [DisplayPrefs, (p: DisplayPrefs) => void] {
  const [prefs, setPrefs] = useState(readDisplayPrefs)
  useEffect(() => {
    const on = () => setPrefs(readDisplayPrefs())
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  const update = (p: DisplayPrefs) => {
    writeDisplayPrefs(p)
    applyDisplayPrefs(p)
    setPrefs(p)
    window.dispatchEvent(new Event(EVENT))
  }
  return [prefs, update]
}
