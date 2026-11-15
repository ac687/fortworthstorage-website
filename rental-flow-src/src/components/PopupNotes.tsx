import { Gift, LockKeyhole } from 'lucide-react'
import { config } from '../config'
import RichText from './RichText'

// What applies to every tier, said once under them: the rate lock and the free disc lock (each only when turned on in the
// settings). Compact = phones and tablets, shorter wording. Renders nothing when both are off.
export default function PopupNotes({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  const lock = config.rateLock.enabled
  const disc = config.discLock.enabled
  if (!lock && !disc) return null
  return (
    <div className={`flex flex-col items-center gap-1.5 rounded-[10px] border border-brand-100 bg-brand-50 px-3 py-2 text-center ${compact ? 'text-xs font-semibold' : 'text-sm'} ${className}`}>
      {lock && (
        <span className="inline-flex items-center gap-2 text-navy">
          <LockKeyhole size={compact ? 13 : 15} className="shrink-0" aria-hidden="true" />
          {compact ? (
            <span>{config.rateLock.text}</span>
          ) : (
            <span>
              <strong>{config.rateLock.text}.</strong> {config.rateLock.panelText}
            </span>
          )}
        </span>
      )}
      {disc && (
        <span className="inline-flex items-center gap-2 text-[#166534]">
          <Gift size={compact ? 13 : 15} className="shrink-0" aria-hidden="true" />
          <span>
            <RichText text={compact ? config.discLock.popupTextShort : config.discLock.popupText} />
          </span>
        </span>
      )}
    </div>
  )
}
