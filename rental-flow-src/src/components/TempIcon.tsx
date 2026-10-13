import type { Category } from '../lib/units'

type Props = {
  category: Category
  // Rendered height in px; width follows the icon's 160 x 88 proportions.
  height?: number
  className?: string
}

// The snowflake + flame mark that goes right after the text on temperature controlled units.
// Renders nothing for any other unit type, so it appears automatically on any site that adds
// temperature controlled units later (the image just has to exist at /images).
export default function TempIcon({ category, height = 16, className = '' }: Props) {
  if (category !== 'temperature-controlled') return null
  return (
    <img
      src="/images/temp-controlled-icon.webp"
      alt="Temperature controlled"
      width={Math.round((height * 160) / 88)}
      height={height}
      className={`inline-block shrink-0 align-middle ${className}`}
      style={{ height, width: 'auto' }}
    />
  )
}
