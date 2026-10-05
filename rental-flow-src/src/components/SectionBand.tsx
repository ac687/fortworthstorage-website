// Divider band between the page hero and the rental flow. Deliberately has no
// step numbers or progress language: Monument's iframe shows its own stepper.
export default function SectionBand({ checkout }: { checkout: boolean }) {
  return (
    <div className="border-y border-slate-200 bg-white px-4 py-5 text-center">
      <h2 className="font-display text-xl font-bold text-navy sm:text-2xl">
        {checkout ? 'Complete your rental' : 'Choose your unit'}
      </h2>
      {!checkout && (
        <p className="mt-1 text-sm text-slate-600">
          Pick a size to see your move-in total. Same-day move-in available.
        </p>
      )}
    </div>
  )
}
