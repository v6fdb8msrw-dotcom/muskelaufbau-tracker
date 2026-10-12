import { useId } from 'react'

export function BrandMark({ size = 20 }: { size?: number }) {
  // Eigene Verlaufs-ID pro Instanz: Verläufe aus ausgeblendeten SVGs (z. B. Seitenleiste auf dem iPhone) würden sonst nicht gezeichnet
  const id = `bm${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5ff59a" />
          <stop offset="1" stopColor="#17d861" />
        </linearGradient>
      </defs>
      <path d="M7 24V9.5l9 9.5 9-9.5V24" stroke={`url(#${id})`} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="6" r="2" fill="#dfe2e5" />
    </svg>
  )
}
