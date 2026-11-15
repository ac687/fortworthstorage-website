import { useEffect, useState } from 'react'

// True on phones (viewport under 768px), where the unit list uses the compact card. Tablets and desktop keep the full card.
const QUERY = '(max-width: 767px)'

export function useCompact(): boolean {
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const on = () => setCompact(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return compact
}
