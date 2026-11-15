import { Tag } from 'lucide-react'
import { formatPrice } from '../lib/units'

// The tier popup's one-line offer banner, shown when every open tier has the same promotion.
export default function PromoBanner({ text, save }: { text: string; save: number | null }) {
  return (
    <div className="mb-4 flex shrink-0 items-center gap-2.5 rounded-[10px] border border-[#BBE5C8] bg-[#DCFCE7] px-3 py-2 text-[13px] leading-snug text-[#14532D] lg:mb-5 lg:gap-3 lg:px-4 lg:py-2.5 lg:text-[15px]">
      <Tag size={18} className="shrink-0 text-[#166534]" aria-hidden="true" />
      <span>
        <strong className="font-extrabold">{text}</strong> on every tier.
        {save !== null && <> Save up to {formatPrice(save)}.</>}
      </span>
    </div>
  )
}
