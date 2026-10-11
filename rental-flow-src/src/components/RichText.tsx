import type { ReactNode } from 'react'

// Turns **text** into bold. Nothing else is interpreted, and text is never treated as
// HTML, so whatever is typed in the settings file can't inject markup into the page.
export default function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = []
  const re = /\*\*([^*]+)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(<strong key={m.index} className="font-bold">{m[1]}</strong>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  // A stray "**" with no partner is dropped rather than shown.
  return <>{parts.map((p) => (typeof p === 'string' ? p.replace(/\*\*/g, '') : p))}</>
}
